/**
 * 酒店价格监控系统 - 主应用
 */

require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const CtripAPI = require('./api/ctrip');
const FeishuAPI = require('./api/feishu');
const MonitorService = require('./services/monitor');

const app = express();
app.use(express.json());

// 配置
const config = {
  ctrip: {
    apiKey: process.env.CTRIP_API_KEY,
    apiSecret: process.env.CTRIP_API_SECRET
  },
  feishu: {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    table: {
      appToken: process.env.FEISHU_TABLE_APP_TOKEN,
      tableId: process.env.FEISHU_TABLE_ID
    }
  }
};

// 初始化服务
const ctripAPI = new CtripAPI(config.ctrip.apiKey, config.ctrip.apiSecret);
const feishuAPI = new FeishuAPI(config.feishu.appId, config.feishu.appSecret);
const monitorService = new MonitorService(config);

// ==================== API 路由 ====================

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * 查询价格
 */
app.post('/api/price/check', async (req, res) => {
  const { hotelId, roomTypeId, checkInDate, checkOutDate } = req.body;

  if (!hotelId || !roomTypeId || !checkInDate) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  try {
    const result = await ctripAPI.queryPrice({
      hotelId,
      roomTypeId,
      checkInDate,
      checkOutDate
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 手动触发监控
 */
app.post('/api/monitor/run', async (req, res) => {
  try {
    const results = await monitorService.runAll();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 测试飞书通知
 */
app.post('/api/test/notify', async (req, res) => {
  const { userId } = req.body;

  try {
    const result = await feishuAPI.sendPriceAlert({
      userId: userId || 'ou_xxx',
      hotelName: '上海外滩W酒店',
      roomTypeName: '豪华大床房',
      checkInDate: '2026-03-15',
      currentPrice: 588,
      threshold: 650
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 定时任务 ====================

/**
 * 每小时执行一次监控
 * 可根据需要调整 cron 表达式:
 * - 每小时: '0 * * * *'
 * - 每30分钟: '*/30 * * * *'
 * - 每天早上8点: '0 8 * * *'
 */
cron.schedule('0 * * * *', async () => {
  console.log('[定时任务] 触发价格监控');
  try {
    await monitorService.runAll();
  } catch (error) {
    console.error('[定时任务] 执行失败:', error);
  }
});

// ==================== 启动服务 ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 酒店价格监控服务启动成功`);
  console.log(`📡 HTTP 服务: http://localhost:${PORT}`);
  console.log(`⏰ 定时任务: 每小时执行一次`);
  console.log(`\n可用接口:`);
  console.log(`  GET  /health              - 健康检查`);
  console.log(`  POST /api/price/check     - 查询价格`);
  console.log(`  POST /api/monitor/run     - 手动触发监控`);
  console.log(`  POST /api/test/notify     - 测试通知`);
});

module.exports = app;
