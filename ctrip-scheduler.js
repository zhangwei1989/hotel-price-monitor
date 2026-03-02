#!/usr/bin/env node
/**
 * 携程监控任务调度器
 * 功能：批次执行、随机延迟、智能优先级
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'ctrip-monitor-config.json');
const STATE_PATH = path.join(__dirname, 'ctrip-monitor-state.json');

// 工具函数：随机延迟
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 工具函数：判断是否在夜间暂停时段
function isNightPause() {
  const hour = new Date().getHours();
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const [start, end] = config.globalSettings.nightPauseHours;
  return hour >= start && hour < end;
}

// 工具函数：计算距离入住天数
function daysUntilCheckIn(checkInDate) {
  const today = new Date();
  const checkIn = new Date(checkInDate);
  const diffTime = checkIn - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// 工具函数：判断任务优先级
function calculatePriority(task) {
  const days = daysUntilCheckIn(task.checkIn);
  
  if (days <= 2) return 'high';      // 入住前2天
  if (days <= 7) return 'medium';    // 入住前3-7天
  return 'low';                       // 7天以上
}

// 工具函数：调整检查频率
function adjustFrequency(task, baseFrequency) {
  const days = daysUntilCheckIn(task.checkIn);
  
  // 入住前2天：加倍频率（缩短间隔）
  if (days <= 2) return Math.floor(baseFrequency * 0.5);
  
  // 入住前7天以上：降低频率（延长间隔）
  if (days > 7) return Math.floor(baseFrequency * 2);
  
  // 价格稳定48小时：降低频率
  const now = Date.now();
  const lastChanged = task.history?.[task.history.length - 1]?.ts;
  if (lastChanged && (now - new Date(lastChanged).getTime()) > 48 * 60 * 60 * 1000) {
    return Math.floor(baseFrequency * 1.5);
  }
  
  return baseFrequency;
}

// 主调度函数
async function runScheduler() {
  console.log('[携程调度器] 启动时间:', new Date().toLocaleString('zh-CN'));
  
  // 检查夜间暂停
  if (isNightPause()) {
    console.log('[携程调度器] 夜间暂停时段，跳过本次执行');
    return;
  }
  
  // 读取配置
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  
  // 筛选需要检查的任务
  const now = Date.now();
  const tasksToCheck = state.monitors.filter(task => {
    // 检查是否已过期（入住日隔天自动停止）
    if (task.autoStopDate && new Date(task.autoStopDate) < new Date()) {
      console.log(`[任务 ${task.id}] 已过期，跳过`);
      return false;
    }
    
    // 检查是否到达检查时间
    const lastCheck = new Date(task.lastCheckedAt).getTime();
    const frequency = adjustFrequency(task, task.frequencyMinutes) * 60 * 1000;
    const nextCheck = lastCheck + frequency;
    
    if (now < nextCheck) {
      console.log(`[任务 ${task.id}] 未到检查时间，下次: ${new Date(nextCheck).toLocaleString('zh-CN')}`);
      return false;
    }
    
    return true;
  });
  
  console.log(`[携程调度器] 共 ${state.monitors.length} 个任务，需检查 ${tasksToCheck.length} 个`);
  
  if (tasksToCheck.length === 0) {
    console.log('[携程调度器] 无需执行任务');
    return;
  }
  
  // 按优先级排序
  tasksToCheck.sort((a, b) => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    const aPriority = calculatePriority(a);
    const bPriority = calculatePriority(b);
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  });
  
  // 分批执行
  const batchSize = config.globalSettings.batchSize;
  const batches = [];
  for (let i = 0; i < tasksToCheck.length; i += batchSize) {
    batches.push(tasksToCheck.slice(i, i + batchSize));
  }
  
  console.log(`[携程调度器] 分为 ${batches.length} 批，每批 ${batchSize} 个任务`);
  
  // 执行各批次
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n[批次 ${i + 1}/${batches.length}] 开始执行 ${batch.length} 个任务`);
    
    // 这里调用实际的价格检查函数
    // TODO: 集成浏览器自动化
    console.log('任务列表:', batch.map(t => `${t.hotelName} (${t.checkIn})`).join(', '));
    
    // 批次间随机延迟
    if (i < batches.length - 1) {
      const [minDelay, maxDelay] = config.globalSettings.batchDelayMinutes;
      const delayMinutes = randomDelay(minDelay, maxDelay);
      console.log(`[批次间隔] 等待 ${delayMinutes} 分钟...`);
      // await sleep(delayMinutes * 60 * 1000);
    }
  }
  
  console.log('\n[携程调度器] 执行完成');
}

// 执行调度器
runScheduler().catch(err => {
  console.error('[携程调度器] 错误:', err);
  process.exit(1);
});
