#!/usr/bin/env node
/**
 * 价格结果写入器
 *
 * 用法（由 Agent 在获取页面文本后调用）：
 *   node update-task-price.js <taskId> <price> [priceOptionsJson]
 *
 * 示例：
 *   node update-task-price.js cs-maqo-m1-20260305-20260306 650 '[{"price":650,"description":"特惠价"}]'
 *
 * 写入内容：
 *   - lastPrice
 *   - lastCheckedAt
 *   - lastStatus (below_threshold / above_threshold / at_threshold)
 *   - currentPriceOptions
 *   - history（追加一条）
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '../../../ctrip-monitor-state.json');

function main() {
  const [,, taskId, priceStr, optionsStr] = process.argv;

  if (!taskId || !priceStr) {
    console.error('用法: node update-task-price.js <taskId> <price> [priceOptionsJson]');
    process.exit(1);
  }

  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) {
    console.error('[ERROR] 无效价格:', priceStr);
    process.exit(1);
  }

  let priceOptions = [];
  if (optionsStr) {
    try {
      priceOptions = JSON.parse(optionsStr);
    } catch {
      priceOptions = [{ price, description: '当前最低价' }];
    }
  } else {
    priceOptions = [{ price, description: '当前最低价' }];
  }

  // 读取 state
  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (err) {
    console.error('[ERROR] 读取 state.json 失败:', err.message);
    process.exit(1);
  }

  const task = state.monitors.find(t => t.id === taskId);
  if (!task) {
    console.error(`[ERROR] 未找到任务: ${taskId}`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  const threshold = task.threshold?.value;
  let status, triggered;

  if (threshold == null) {
    status = 'unknown';
    triggered = false;
  } else if (price < threshold) {
    status = 'below_threshold';
    triggered = true;
  } else if (price === threshold) {
    status = 'at_threshold';
    triggered = false;
  } else {
    status = 'above_threshold';
    triggered = false;
  }

  // 更新任务字段
  task.lastCheckedAt = now;
  task.lastPrice = price;
  task.lastStatus = status;
  task.currentPriceOptions = priceOptions;

  // 追加历史记录（最多保留 200 条）
  if (!task.history) task.history = [];
  task.history.push({
    ts: now,
    price,
    status,
    source: 'browser',
    triggered,
    note: triggered
      ? `🎉 价格 ¥${price} 低于阈值 ¥${threshold}，已发送通知`
      : `当前最低价 ¥${price}，阈值 ¥${threshold}`,
  });
  if (task.history.length > 200) {
    task.history = task.history.slice(-200);
  }

  // 写回
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[ERROR] 写入 state.json 失败:', err.message);
    process.exit(1);
  }

  const output = {
    status: 'updated',
    taskId,
    hotelName: task.hotelName,
    price,
    threshold,
    triggered,
    lastStatus: status,
    updatedAt: now,
  };

  console.log(JSON.stringify(output, null, 2));

  // 若触发阈值，输出通知标记（Agent 据此发飞书）
  if (triggered) {
    process.stdout.write('\n[NOTIFY_REQUIRED]\n');
    console.log(JSON.stringify({
      hotelName: task.hotelName,
      roomName: task.roomName,
      city: task.city,
      checkIn: task.checkIn,
      checkOut: task.checkOut,
      price,
      threshold,
      link: task.link,
    }, null, 2));
  }
}

main();
