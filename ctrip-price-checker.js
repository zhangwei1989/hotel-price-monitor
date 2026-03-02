#!/usr/bin/env node
/**
 * 携程价格检查器
 * 功能：使用浏览器自动化检查携程酒店价格
 */

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'ctrip-monitor-state.json');

/**
 * 检查单个任务的价格
 * @param {Object} task - 监控任务
 * @returns {Object} 检查结果
 */
async function checkTaskPrice(task) {
  console.log(`[价格检查] 开始检查: ${task.hotelName}`);
  
  // TODO: 这里需要调用 EasyClaw 的 browser 工具
  // 由于调度器是在 Node.js 环境运行，无法直接调用 browser 工具
  // 需要通过以下方式之一：
  // 1. 使用 sessions_send 通知主 agent 执行
  // 2. 创建专门的 sub-agent 执行价格检查
  // 3. 直接使用 Puppeteer/Playwright
  
  console.log(`[价格检查] 任务信息:`);
  console.log(`  - 酒店: ${task.hotelName}`);
  console.log(`  - 入住: ${task.checkIn}`);
  console.log(`  - 退房: ${task.checkOut}`);
  console.log(`  - 房型: ${task.roomName}`);
  console.log(`  - 目标价: < ¥${task.threshold.value}`);
  console.log(`  - 链接: ${task.link}`);
  
  // 模拟价格检查（实际需要浏览器自动化）
  const result = {
    taskId: task.id,
    success: false,
    price: null,
    priceOptions: [],
    error: '需要集成浏览器自动化',
    timestamp: new Date().toISOString(),
    needsBrowserIntegration: true
  };
  
  console.log(`[价格检查] ⚠️  需要通过 EasyClaw agent 执行浏览器操作`);
  
  return result;
}

/**
 * 更新任务状态
 */
function updateTaskState(taskId, result) {
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  
  const task = state.monitors.find(t => t.id === taskId);
  if (!task) {
    console.error(`[状态更新] 未找到任务: ${taskId}`);
    return;
  }
  
  // 更新最后检查时间
  task.lastCheckedAt = result.timestamp;
  
  if (result.success) {
    task.lastPrice = result.price;
    task.currentPriceOptions = result.priceOptions;
    
    // 添加历史记录
    if (!task.history) task.history = [];
    task.history.push({
      ts: result.timestamp,
      price: result.price,
      status: result.price < task.threshold.value ? 'below_threshold' : 'above_threshold',
      note: `价格: ¥${result.price}`
    });
    
    console.log(`[状态更新] ✅ 任务 ${taskId} 更新成功`);
  } else {
    console.log(`[状态更新] ⚠️  任务 ${taskId} 检查失败: ${result.error}`);
  }
  
  // 保存状态
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 导出函数供调度器使用
module.exports = {
  checkTaskPrice,
  updateTaskState
};

// 如果直接运行此脚本
if (require.main === module) {
  console.log('[价格检查器] 此模块需要被调度器调用');
  console.log('[价格检查器] 或通过 EasyClaw agent 集成执行');
}
