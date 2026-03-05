#!/usr/bin/env node
/**
 * 携程价格检查执行器
 *
 * 用法（由 EasyClaw Agent 在 HEARTBEAT 中调用）：
 *   node run-price-check.js [taskId]
 *
 * 工作流程：
 *   1. 读取 ctrip-monitor-state.json，找出需要检查的任务
 *   2. 输出任务信息（Agent 据此调用 browser 工具打开链接）
 *   3. Agent 将页面文本回传后，调用 update-task-price.js 写入结果
 *
 * 若传入 --list，仅列出待检查任务（不实际操作）
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '../../../ctrip-monitor-state.json');

function daysUntilCheckIn(checkIn) {
  return Math.ceil((new Date(checkIn) - new Date()) / (1000 * 60 * 60 * 24));
}

function adjustedFrequency(task) {
  const base = task.frequencyMinutes || 480;
  const days = daysUntilCheckIn(task.checkIn);
  if (days <= 2) return Math.max(30, Math.floor(base * 0.5));
  if (days > 7) return Math.floor(base * 2);
  return base;
}

function needsCheck(task) {
  if (task.autoStopDate && new Date(task.autoStopDate) < new Date()) return false;
  if (task.enabled === false) return false;
  if (!task.lastCheckedAt || new Date(task.lastCheckedAt).getFullYear() === 1970) return true;
  const freqMs = adjustedFrequency(task) * 60 * 1000;
  return Date.now() - new Date(task.lastCheckedAt).getTime() >= freqMs;
}

function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes('--list');
  const targetId = args.find(a => !a.startsWith('--'));

  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (err) {
    console.error('[ERROR] 读取 state.json 失败:', err.message);
    process.exit(1);
  }

  const monitors = state.monitors || [];

  // 筛选待检查任务
  let pending = monitors.filter(t => {
    if (targetId) return t.id === targetId;
    return needsCheck(t);
  });

  if (pending.length === 0) {
    console.log(JSON.stringify({ status: 'no_tasks', message: '当前无需检查的任务' }));
    process.exit(0);
  }

  // 输出待检查任务列表（JSON格式，供 Agent 解析）
  const output = {
    status: 'pending',
    count: pending.length,
    tasks: pending.map(t => ({
      id: t.id,
      hotelName: t.hotelName,
      city: t.city,
      checkIn: t.checkIn,
      checkOut: t.checkOut,
      roomName: t.roomName,
      threshold: t.threshold,
      lastPrice: t.lastPrice,
      link: t.link,
      daysUntilCheckIn: daysUntilCheckIn(t.checkIn),
      adjustedFrequencyMin: adjustedFrequency(t),
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
