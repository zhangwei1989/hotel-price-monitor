/**
 * 携程酒店价格爬虫 - 浏览器解析模块
 *
 * 本模块不直接调用 browser 工具（EasyClaw IPC 限制）。
 * 设计模式：Agent 通过 browser 工具打开携程页面后，
 * 将页面 HTML 传入本模块进行解析，返回标准化价格数据。
 *
 * 调用链：
 *   HEARTBEAT → Agent (browser 工具打开携程) → 截取页面文本
 *     → parseCtripPage(html) → 标准价格对象
 *       → 写入 ctrip-monitor-state.json
 */

'use strict';

/**
 * 从携程页面文本/HTML 中提取价格列表
 * @param {string} pageText - 页面的 innerText 或 HTML
 * @param {Object} task - 监控任务对象
 * @returns {{ success: boolean, price: number|null, priceOptions: Array, rawText: string }}
 */
function parseCtripPage(pageText, task) {
  const result = {
    success: false,
    price: null,
    priceOptions: [],
    rawText: pageText ? pageText.slice(0, 500) : '',
    parseMethod: 'regex',
  };

  if (!pageText) {
    result.error = '页面文本为空';
    return result;
  }

  const prices = [];

  // ── 策略1：匹配 ¥数字 / ￥数字 / CNY 数字 ──────────────────
  const pricePattern = /[¥￥]\s*(\d{2,5})/g;
  let m;
  while ((m = pricePattern.exec(pageText)) !== null) {
    const p = parseInt(m[1], 10);
    if (p >= 50 && p <= 99999) prices.push(p);
  }

  // ── 策略2：匹配"起 数字"/ "最低 数字" ─────────────────────
  const lowestPattern = /(?:起|最低|lowest)\s*[¥￥]?\s*(\d{2,5})/g;
  while ((m = lowestPattern.exec(pageText)) !== null) {
    const p = parseInt(m[1], 10);
    if (p >= 50 && p <= 99999) prices.push(p);
  }

  if (prices.length === 0) {
    result.error = '未能从页面提取到价格';
    return result;
  }

  // 去重并排序
  const unique = [...new Set(prices)].sort((a, b) => a - b);

  result.success = true;
  result.price = unique[0]; // 最低价
  result.priceOptions = unique.slice(0, 8).map(p => ({
    price: p,
    description: p === unique[0] ? '最低价' : `¥${p}`,
  }));

  // 若有 task.roomName，尝试匹配特定房型价格
  if (task && task.roomName) {
    const roomPattern = new RegExp(
      task.roomName.slice(0, 6) + '[\\s\\S]{0,100}?[¥￥]\\s*(\\d{2,5})',
      'i'
    );
    const rm = roomPattern.exec(pageText);
    if (rm) {
      const roomPrice = parseInt(rm[1], 10);
      if (roomPrice >= 50 && roomPrice <= 99999) {
        result.roomPrice = roomPrice;
        result.roomPriceMatched = true;
      }
    }
  }

  return result;
}

/**
 * 判断是否命中阈值
 */
function checkThreshold(price, threshold) {
  if (!threshold || price == null) return false;
  if (threshold.type === 'below') return price < threshold.value;
  if (threshold.type === 'at_or_below') return price <= threshold.value;
  return false;
}

/**
 * 构建写入 state.json 的更新对象
 */
function buildStateUpdate(task, crawlResult, source = 'browser') {
  const now = new Date().toISOString();
  const { price, priceOptions, roomPrice, roomPriceMatched } = crawlResult;

  // 实际使用价：优先用房型精确价
  const effectivePrice = (roomPriceMatched && roomPrice) ? roomPrice : price;
  const triggered = checkThreshold(effectivePrice, task.threshold);

  const historyEntry = {
    ts: now,
    price: effectivePrice,
    status: triggered ? 'below_threshold' : 'above_threshold',
    source,
    note: triggered
      ? `🎉 价格 ¥${effectivePrice} 低于阈值 ¥${task.threshold?.value}`
      : `当前最低价 ¥${effectivePrice}，阈值 ¥${task.threshold?.value}`,
    triggered,
  };

  return {
    lastCheckedAt: now,
    lastPrice: effectivePrice,
    lastStatus: triggered ? 'below_threshold' : 'above_threshold',
    currentPriceOptions: priceOptions,
    historyEntry, // 调用方负责 push 到 task.history
    triggered,
    effectivePrice,
  };
}

module.exports = { parseCtripPage, checkThreshold, buildStateUpdate };
