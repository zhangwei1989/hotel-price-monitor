/**
 * 监控服务 v2
 * - 支持多适配器调度
 * - 价格历史本地持久化
 * - 智能调度（随机延迟、夜间暂停、失败重试）
 */

const fs = require('fs');
const path = require('path');
const AdapterManager = require('../adapters/AdapterManager');
const FeishuAPI = require('../api/feishu');

const STATE_PATH = path.join(__dirname, '../../../ctrip-monitor-state.json');
const LOG_DIR = path.join(__dirname, '../../../logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

class MonitorService {
  constructor(config) {
    this.config = config;
    this.adapterManager = new AdapterManager(config);
    this.feishuOpenId = config.feishu?.notifyOpenId || '';

    // 预初始化飞书客户端（避免每次通知都重新创建）
    // TASK-MON-03：确认 config.feishu 注入正确
    if (config.feishu?.appId && config.feishu?.appSecret) {
      this.feishu = new FeishuAPI(config.feishu.appId, config.feishu.appSecret);
      console.log('[Monitor] 飞书客户端初始化成功');
    } else {
      this.feishu = null;
      console.warn('[Monitor] ⚠️  飞书配置缺失（FEISHU_APP_ID / FEISHU_APP_SECRET），通知将不可用');
    }
  }

  // ==================== 核心：执行单个任务 ====================

  async executeTask(task) {
    console.log(`\n[Monitor] ▶ 开始: ${task.hotelName} (${task.checkIn}~${task.checkOut})`);

    // 1. 调用适配器获取价格
    const result = await this.adapterManager.queryPrice(task);

    if (!result.success) {
      this._log('error', task, null, result.error);
      return { success: false, taskId: task.id, error: result.error };
    }

    const { price, priceOptions } = result.data;
    const triggered = price !== null && price < task.threshold.value;

    console.log(`[Monitor] 价格: ¥${price} | 目标: ¥${task.threshold.value} | ${triggered ? '🎉 触发!' : '未触发'}`);

    // 2. 更新本地状态
    this._updateState(task, price, priceOptions, triggered);

    // 3. 触发飞书通知
    if (triggered) {
      await this._notify(task, price, priceOptions);
    }

    // 4. 写入日志
    this._log('success', task, price, null);

    return { success: true, taskId: task.id, price, triggered };
  }

  // ==================== 批量执行（带智能调度）====================

  async runAll() {
    // 夜间暂停 (02:00 - 06:00 北京时间)
    if (this._isNightTime()) {
      console.log('[Monitor] 🌙 夜间暂停模式 (02:00-06:00)，跳过本次执行');
      return [];
    }

    // 加载任务列表
    const tasks = this._loadTasks();
    const pendingTasks = tasks.filter(t => this._shouldCheck(t));

    console.log(`[Monitor] 共 ${tasks.length} 个任务，本次需检查 ${pendingTasks.length} 个`);

    const results = [];

    for (const task of pendingTasks) {
      // 失败重试（最多 3 次，间隔递增）
      let result = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        result = await this.executeTask(task);
        if (result.success) break;

        if (attempt < 3) {
          const waitMs = attempt * 5000;
          console.log(`[Monitor] 第 ${attempt} 次失败，${waitMs / 1000}s 后重试...`);
          await this._sleep(waitMs);
        }
      }

      results.push(result);

      // 随机延迟 2-6 秒，避免被携程封禁
      const delay = 2000 + Math.random() * 4000;
      await this._sleep(delay);
    }

    // 打印健康报告
    console.log('\n[Monitor] 适配器健康状态:', JSON.stringify(this.adapterManager.getHealthReport(), null, 2));

    return results;
  }

  // ==================== 状态管理 ====================

  _loadTasks() {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      return state.monitors || [];
    } catch (err) {
      console.error('[Monitor] 加载任务失败:', err.message);
      return [];
    }
  }

  _shouldCheck(task) {
    if (!task.lastCheckedAt) return true;

    const lastCheck = new Date(task.lastCheckedAt);
    const now = new Date();
    const diffMin = (now - lastCheck) / 1000 / 60;
    const freqMin = task.frequencyMinutes || 60;

    return diffMin >= freqMin;
  }

  _updateState(task, price, priceOptions, triggered) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      const t = state.monitors.find(m => m.id === task.id);
      if (!t) return;

      const now = new Date().toISOString();
      t.lastCheckedAt = now;
      t.lastPrice = price;
      t.currentPriceOptions = priceOptions || [];
      t.lastStatus = triggered ? 'below_threshold' : 'above_threshold';

      // 追加历史记录（最多保留 200 条）
      if (!t.history) t.history = [];
      t.history.push({ ts: now, price, triggered });
      if (t.history.length > 200) t.history = t.history.slice(-200);

      // 更新元数据
      state.metadata = state.metadata || {};
      state.metadata.lastSchedulerRun = now;

      fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (err) {
      console.error('[Monitor] 状态更新失败:', err.message);
    }
  }

  // ==================== 通知 ====================

  async _notify(task, price, priceOptions) {
    console.log(`[Monitor] 📨 发送飞书通知: ${task.hotelName} ¥${price}`);

    // TASK-MON-03：使用预初始化的客户端，若未初始化则打印警告跳过
    if (!this.feishu) {
      console.warn('[Monitor] 飞书客户端未初始化，跳过通知');
      return;
    }

    const userId = this.feishuOpenId || task.notifyTarget;
    if (!userId) {
      console.warn('[Monitor] 未配置通知 open_id（FEISHU_NOTIFY_OPEN_ID），跳过通知');
      return;
    }

    try {
      const result = await this.feishu.sendPriceAlert({
        userId,
        hotelName: task.hotelName,
        roomTypeName: task.roomName,
        checkInDate: task.checkIn,
        currentPrice: price,
        threshold: task.threshold.value,
        link: task.link || '',          // TASK-MON-01：传入任务真实链接
      });

      if (result.success) {
        console.log(`[Monitor] ✅ 飞书通知发送成功: messageId=${result.messageId}`);
      } else {
        console.error(`[Monitor] ❌ 飞书通知发送失败:`, result.error);
      }
    } catch (err) {
      console.error('[Monitor] 飞书通知异常:', err.message);
    }
  }

  // ==================== 工具方法 ====================

  _isNightTime() {
    const hour = new Date().getUTCHours() + 8; // 北京时间
    const bjtHour = hour >= 24 ? hour - 24 : hour;
    return bjtHour >= 2 && bjtHour < 6;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _log(level, task, price, error) {
    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(LOG_DIR, `monitor-${today}.log`);
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      taskId: task.id,
      hotel: task.hotelName,
      price,
      error
    }) + '\n';

    fs.appendFileSync(logFile, line);
  }
}

module.exports = MonitorService;
