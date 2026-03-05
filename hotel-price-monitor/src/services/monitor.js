/**
 * 监控服务 v3
 * TASK-MON-02: history.note 字段（触发来源标记）
 * TASK-MON-04: 参数从 config 文件读取，不再硬编码
 * TASK-MON-05: 适配器连续失败告警
 */

const fs = require('fs');
const path = require('path');
const AdapterManager = require('../adapters/AdapterManager');
const FeishuAPI = require('../api/feishu');

const STATE_PATH = path.join(__dirname, '../../../ctrip-monitor-state.json');
const CONFIG_PATH = path.join(__dirname, '../../../ctrip-monitor-config.json');
const LOG_DIR    = path.join(__dirname, '../../../logs');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// 读取全局配置（TASK-MON-04）
function loadGlobalConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const g = raw.globalSettings || {};
    return {
      batchSize:           g.batchSize           ?? 15,
      batchDelayMin:       (g.batchDelayMinutes  ?? [5, 10])[0],
      batchDelayMax:       (g.batchDelayMinutes  ?? [5, 10])[1],
      taskDelaySecMin:     (g.randomDelaySeconds ?? [1,  5])[0],
      taskDelaySecMax:     (g.randomDelaySeconds ?? [1,  5])[1],
      maxHistoryPerTask:   g.maxHistoryPerTask   ?? 200,
      maxRetries:          g.retryPolicy?.maxRetries ?? 3,
      nightPauseStart:     (g.nightPauseHours    ?? [2, 6])[0],
      nightPauseEnd:       (g.nightPauseHours    ?? [2, 6])[1],
      failAlertThreshold:  g.failAlertThreshold  ?? 5,   // 连续失败多少次告警
    };
  } catch (err) {
    console.warn('[Monitor] 读取 config 失败，使用默认值:', err.message);
    return {
      batchSize: 15, batchDelayMin: 5, batchDelayMax: 10,
      taskDelaySecMin: 1, taskDelaySecMax: 5,
      maxHistoryPerTask: 200, maxRetries: 3,
      nightPauseStart: 2, nightPauseEnd: 6, failAlertThreshold: 5,
    };
  }
}

class MonitorService {
  constructor(config) {
    this.config = config;
    this.cfg = loadGlobalConfig();  // TASK-MON-04
    this.adapterManager = new AdapterManager(config);
    this.feishuOpenId = config.feishu?.notifyOpenId || '';

    // 适配器连续失败计数（TASK-MON-05）
    this.adapterFailCounts = {};
    this.lastFailAlertAt   = {};

    // 预初始化飞书客户端
    if (config.feishu?.appId && config.feishu?.appSecret) {
      this.feishu = new FeishuAPI(config.feishu.appId, config.feishu.appSecret);
      console.log('[Monitor] ✅ 飞书客户端初始化成功');
    } else {
      this.feishu = null;
      console.warn('[Monitor] ⚠️  飞书配置缺失（FEISHU_APP_ID / FEISHU_APP_SECRET），通知将不可用');
    }
  }

  // ==================== 核心：执行单个任务 ====================

  /**
   * @param {Object} task
   * @param {string} [source] - 触发来源：'scheduled' | 'forced' | 'manual'（TASK-MON-02）
   */
  async executeTask(task, source = 'scheduled') {
    console.log(`\n[Monitor] ▶ 开始: ${task.hotelName} (${task.checkIn}~${task.checkOut}) [${source}]`);

    const result = await this.adapterManager.queryPrice(task);

    if (!result.success) {
      this._trackAdapterFail(task.provider || 'ctrip', result.error);
      this._log('error', task, null, result.error);
      return { success: false, taskId: task.id, error: result.error };
    }

    // 适配器成功，重置失败计数（TASK-MON-05）
    this._resetAdapterFail(task.provider || 'ctrip');

    const { price, priceOptions } = result.data;
    const triggered = price !== null && price < task.threshold.value;

    console.log(`[Monitor] 价格: ¥${price} | 目标: ¥${task.threshold.value} | ${triggered ? '🎉 触发!' : '未触发'}`);

    // 传入 source，写入 note 字段（TASK-MON-02）
    this._updateState(task, price, priceOptions, triggered, source);

    if (triggered) {
      await this._notify(task, price, priceOptions);
    }

    this._log('success', task, price, null);

    return { success: true, taskId: task.id, price, triggered };
  }

  // ==================== 批量执行 ====================

  async runAll() {
    if (this._isNightTime()) {
      console.log('[Monitor] 🌙 夜间暂停模式，跳过本次执行');
      return [];
    }

    const tasks = this._loadTasks();
    const pendingTasks = tasks.filter(t => this._shouldCheck(t));

    console.log(`[Monitor] 共 ${tasks.length} 个任务，本次需检查 ${pendingTasks.length} 个`);

    const results = [];
    const maxRetries = this.cfg.maxRetries;

    for (const task of pendingTasks) {
      // 判断 source：lastCheckedAt=1970 表示强制检查
      const isForced = task.lastCheckedAt && new Date(task.lastCheckedAt).getFullYear() === 1970;
      const source = isForced ? 'forced' : 'scheduled';

      let result = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        result = await this.executeTask(task, source);
        if (result.success) break;
        if (attempt < maxRetries) {
          const waitMs = attempt * 5000;
          console.log(`[Monitor] 第 ${attempt} 次失败，${waitMs / 1000}s 后重试...`);
          await this._sleep(waitMs);
        }
      }
      results.push(result);

      // 任务间随机延迟（TASK-MON-04：从 config 读取）
      const delayMs = (this.cfg.taskDelaySecMin + Math.random() * (this.cfg.taskDelaySecMax - this.cfg.taskDelaySecMin)) * 1000;
      await this._sleep(delayMs);
    }

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

  /**
   * TASK-MON-02：history 记录增加 note 字段（触发来源）
   */
  _updateState(task, price, priceOptions, triggered, source = 'scheduled') {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      const t = state.monitors.find(m => m.id === task.id);
      if (!t) return;

      const now = new Date().toISOString();
      t.lastCheckedAt = now;
      t.lastPrice = price;
      t.currentPriceOptions = priceOptions || [];
      t.lastStatus = triggered ? 'below_threshold' : 'above_threshold';

      // 追加历史记录，携带 note 字段（TASK-MON-02）
      if (!t.history) t.history = [];
      t.history.push({
        ts: now,
        price,
        triggered,
        note: source,   // 'scheduled' | 'forced' | 'manual'
      });

      // 最大保留条数从 config 读取（TASK-MON-04）
      const maxHistory = this.cfg.maxHistoryPerTask;
      if (t.history.length > maxHistory) {
        t.history = t.history.slice(-maxHistory);
      }

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
        link: task.link || '',
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

  // ==================== 适配器失败追踪（TASK-MON-05）====================

  _trackAdapterFail(adapterName, error) {
    this.adapterFailCounts[adapterName] = (this.adapterFailCounts[adapterName] || 0) + 1;
    const count = this.adapterFailCounts[adapterName];
    const threshold = this.cfg.failAlertThreshold;

    console.warn(`[Monitor] 适配器 ${adapterName} 连续失败 ${count} 次`);

    if (count >= threshold) {
      const lastAlert = this.lastFailAlertAt[adapterName] || 0;
      const now = Date.now();
      // 每小时最多告警一次
      if (now - lastAlert > 3600000) {
        this.lastFailAlertAt[adapterName] = now;
        this._sendAdapterFailAlert(adapterName, count, error).catch(() => {});
      }
    }
  }

  _resetAdapterFail(adapterName) {
    if (this.adapterFailCounts[adapterName]) {
      console.log(`[Monitor] 适配器 ${adapterName} 恢复正常，重置失败计数`);
      this.adapterFailCounts[adapterName] = 0;
    }
  }

  async _sendAdapterFailAlert(adapterName, count, lastError) {
    if (!this.feishu || !this.feishuOpenId) return;

    console.warn(`[Monitor] 🚨 发送适配器告警: ${adapterName} 连续失败 ${count} 次`);

    const card = {
      config: { wide_screen_mode: true },
      header: {
        title: { content: '⚠️ 适配器异常告警', tag: 'plain_text' },
        template: 'red',
      },
      elements: [{
        tag: 'div',
        text: {
          content: [
            `**适配器**: ${adapterName}`,
            `**连续失败**: ${count} 次`,
            `**最后错误**: ${lastError || '未知'}`,
            `**建议**: 检查携程页面是否结构变化，或手动测试 /api/monitor/health`,
          ].join('\n'),
          tag: 'lark_md',
        },
      }],
    };

    try {
      await this.feishu.sendCard(this.feishuOpenId, card);
    } catch (err) {
      console.error('[Monitor] 告警发送失败:', err.message);
    }
  }

  // ==================== 工具方法 ====================

  _isNightTime() {
    const hour = (new Date().getUTCHours() + 8) % 24;
    return hour >= this.cfg.nightPauseStart && hour < this.cfg.nightPauseEnd;
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
      error,
    }) + '\n';
    fs.appendFileSync(logFile, line);
  }
}

module.exports = MonitorService;
