/**
 * 酒店价格监控系统 v2 - 主应用
 * 集成智能调度：优先级排序、分批执行、动态频率、夜间暂停、失败重试
 */

require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const MonitorService = require('./services/monitor');
const FeishuAPI = require('./api/feishu');

// ── 配置 ──────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, '../../ctrip-monitor-config.json');
const STATE_PATH  = path.join(__dirname, '../../ctrip-monitor-state.json');
const LOG_DIR     = path.join(__dirname, '../../logs');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const config = {
  gatewayUrl:   process.env.GATEWAY_URL   || 'http://127.0.0.1:10089',
  gatewayToken: process.env.GATEWAY_TOKEN || '',
  feishu: {
    appId:        process.env.FEISHU_APP_ID     || '',
    appSecret:    process.env.FEISHU_APP_SECRET  || '',
    notifyOpenId: process.env.FEISHU_NOTIFY_OPEN_ID || '',
  },
};

const monitorService = new MonitorService(config);
const feishuAPI = new FeishuAPI(config.feishu.appId, config.feishu.appSecret);

// ── Express ───────────────────────────────────────────────────
const app = express();
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 手动触发全量监控
app.post('/api/monitor/run', async (req, res) => {
  try {
    const results = await runScheduler();
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 单任务立即检查
app.post('/api/monitor/run/:taskId', async (req, res) => {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    const task = state.monitors.find(t => t.id === req.params.taskId);
    if (!task) return res.status(404).json({ error: '任务不存在' });

    const result = await monitorService.executeTask(task);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 适配器健康报告
app.get('/api/monitor/health', (req, res) => {
  res.json(monitorService.adapterManager.getHealthReport());
});

// 测试飞书通知
app.post('/api/test/notify', async (req, res) => {
  try {
    const userId = config.feishu.notifyOpenId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: '未配置 FEISHU_NOTIFY_OPEN_ID，请在请求体中传入 userId' });
    }
    const result = await feishuAPI.sendPriceAlert({
      userId,
      hotelName: req.body.hotelName || '测试酒店',
      roomTypeName: req.body.roomTypeName || '测试房型',
      checkInDate: req.body.checkInDate || new Date().toISOString().slice(0, 10),
      currentPrice: req.body.currentPrice || 500,
      threshold: req.body.threshold || 600,
      link: req.body.link || 'https://hotels.ctrip.com',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 智能调度核心 ──────────────────────────────────────────────

/**
 * 距离入住天数
 */
function daysUntilCheckIn(checkIn) {
  return Math.ceil((new Date(checkIn) - new Date()) / (1000 * 60 * 60 * 24));
}

/**
 * 动态频率调整（分钟）
 * - 入住前 ≤2 天：频率 ×0.5（更频繁）
 * - 入住前 >7 天：频率 ×2（降频）
 * - 价格稳定 48h：频率 ×1.5
 */
function adjustedFrequency(task) {
  const base = task.frequencyMinutes || 480;
  const days = daysUntilCheckIn(task.checkIn);

  if (days <= 2) return Math.max(30, Math.floor(base * 0.5));
  if (days > 7)  return Math.floor(base * 2);

  // 价格稳定 48h 降频
  const lastHistory = task.history?.[task.history.length - 1];
  if (lastHistory) {
    const stableHours = (Date.now() - new Date(lastHistory.ts).getTime()) / 3600000;
    if (stableHours >= 48) return Math.floor(base * 1.5);
  }

  return base;
}

/**
 * 任务优先级（入住越近越高）
 */
function priority(task) {
  const days = daysUntilCheckIn(task.checkIn);
  if (days <= 2) return 1;
  if (days <= 7) return 2;
  return 3;
}

/**
 * 判断任务是否需要立即检查
 */
function needsCheck(task) {
  // 已过期自动跳过
  if (task.autoStopDate && new Date(task.autoStopDate) < new Date()) return false;
  // 已暂停
  if (task.enabled === false) return false;
  // lastCheckedAt = 1970 表示强制立即检查
  if (!task.lastCheckedAt || new Date(task.lastCheckedAt).getFullYear() === 1970) return true;

  const freqMs = adjustedFrequency(task) * 60 * 1000;
  return Date.now() - new Date(task.lastCheckedAt).getTime() >= freqMs;
}

/**
 * 主调度函数
 */
async function runScheduler() {
  const now = new Date();
  console.log(`\n[Scheduler] ══ 触发时间: ${now.toLocaleString('zh-CN')} ══`);

  // 夜间暂停（北京时间 02:00-06:00）
  const bjtHour = (now.getUTCHours() + 8) % 24;
  if (bjtHour >= 2 && bjtHour < 6) {
    console.log('[Scheduler] 🌙 夜间暂停 (02:00-06:00)，跳过');
    return [];
  }

  // 加载任务
  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (err) {
    console.error('[Scheduler] 读取任务失败:', err.message);
    return [];
  }

  const pending = state.monitors
    .filter(needsCheck)
    .sort((a, b) => priority(a) - priority(b));

  console.log(`[Scheduler] 总任务: ${state.monitors.length}，本次执行: ${pending.length}`);

  if (pending.length === 0) {
    console.log('[Scheduler] 无待执行任务');
    return [];
  }

  // 分批执行（每批 15 个）
  const BATCH = 15;
  const results = [];

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    console.log(`\n[Scheduler] 批次 ${Math.floor(i / BATCH) + 1}，共 ${batch.length} 个任务`);

    for (const task of batch) {
      const result = await monitorService.executeTask(task);
      results.push(result);

      // 任务间随机延迟 1-5 秒
      await sleep(1000 + Math.random() * 4000);
    }

    // 批次间随机延迟 5-10 分钟（如果还有下一批）
    if (i + BATCH < pending.length) {
      const delayMin = 5 + Math.random() * 5;
      console.log(`[Scheduler] 批次间隔 ${delayMin.toFixed(1)} 分钟...`);
      await sleep(delayMin * 60 * 1000);
    }
  }

  console.log(`[Scheduler] ══ 本次完成: ${results.filter(r => r.success).length}/${results.length} ══\n`);
  return results;
}

/**
 * 每日汇报：统计昨日监控数据，发飞书
 */
async function sendDailyReport() {
  console.log('[DailyReport] 生成每日汇报...');
  try {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    const monitors = state.monitors || [];

    const total   = monitors.length;
    const active  = monitors.filter(t => t.enabled ?? true).length;
    const reached = monitors.filter(t => t.lastPrice != null && t.lastPrice < t.threshold.value).length;

    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(LOG_DIR, `monitor-${today}.log`);
    let todayChecks = 0, todayErrors = 0;

    if (fs.existsSync(logFile)) {
      const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
      todayChecks = lines.filter(l => l.includes('"level":"success"')).length;
      todayErrors = lines.filter(l => l.includes('"level":"error"')).length;
    }

    const msg = [
      `📊 PriceWatcher 每日汇报 ${today}`,
      ``,
      `监控任务：${total} 个（${active} 个运行中）`,
      `已达目标：${reached} 个`,
      `今日检查：${todayChecks} 次`,
      `今日错误：${todayErrors} 次`,
      `成功率：${todayChecks > 0 ? ((todayChecks / (todayChecks + todayErrors)) * 100).toFixed(1) : 'N/A'}%`,
    ].join('\n');

    console.log('[DailyReport]', msg);

    if (config.feishu.notifyOpenId && config.feishu.appId) {
      await feishuAPI.sendCard(config.feishu.notifyOpenId, {
        config: { wide_screen_mode: true },
        header: { title: { content: `📊 PriceWatcher 每日汇报 ${today}`, tag: 'plain_text' }, template: 'blue' },
        elements: [
          { tag: 'div', text: { content: `**监控任务：** ${total} 个（${active} 个运行中）`, tag: 'lark_md' } },
          { tag: 'div', text: { content: `**已达目标：** ${reached} 个`, tag: 'lark_md' } },
          { tag: 'div', text: { content: `**今日检查：** ${todayChecks} 次 | 错误：${todayErrors} 次`, tag: 'lark_md' } },
          { tag: 'div', text: { content: `**成功率：** ${todayChecks > 0 ? ((todayChecks / (todayChecks + todayErrors)) * 100).toFixed(1) : 'N/A'}%`, tag: 'lark_md' } },
        ],
      });
    }
  } catch (err) {
    console.error('[DailyReport] 失败:', err.message);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Cron 任务 ─────────────────────────────────────────────────

// 每小时整点触发调度
cron.schedule('0 * * * *', async () => {
  console.log('[Cron] 每小时调度触发');
  try { await runScheduler(); }
  catch (err) { console.error('[Cron] 调度失败:', err.message); }
});

// 每天早上 8 点发送每日汇报
cron.schedule('0 8 * * *', async () => {
  console.log('[Cron] 每日汇报触发');
  try { await sendDailyReport(); }
  catch (err) { console.error('[Cron] 汇报失败:', err.message); }
}, { timezone: 'Asia/Shanghai' });

// ── 启动 ──────────────────────────────────────────────────────

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`\n🚀 PriceWatcher Monitor v2 启动`);
  console.log(`📡 HTTP: http://localhost:${PORT}`);
  console.log(`⏰ 调度: 每小时整点执行`);
  console.log(`📊 汇报: 每天 08:00 发送飞书`);
  console.log(`\n接口列表:`);
  console.log(`  GET  /health                    健康检查`);
  console.log(`  POST /api/monitor/run           触发全量调度`);
  console.log(`  POST /api/monitor/run/:taskId   单任务立即检查`);
  console.log(`  GET  /api/monitor/health        适配器健康报告`);
  console.log(`  POST /api/test/notify           测试飞书通知\n`);

  // 启动时立即执行一次（非夜间）
  runScheduler().catch(err => console.error('[Startup] 初始调度失败:', err.message));
});

module.exports = app;
