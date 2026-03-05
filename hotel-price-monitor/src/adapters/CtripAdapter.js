/**
 * 携程适配器 v2
 *
 * 架构说明：
 * hotel-price-monitor 无法直接调用 EasyClaw browser 工具（内部 IPC 机制）。
 * 正确调用链：
 *   EasyClaw Cron（HEARTBEAT）
 *     → 触发 Agent（sessions_spawn）
 *       → Agent 调用 browser 工具抓取携程页面
 *         → Agent 把价格结果写入 ctrip-monitor-state.json
 *           → MonitorService 读取结果并发飞书通知
 *
 * 本文件的 queryPrice() 暂时使用「解析 state.json 现有数据」的模式，
 * 等待 EasyClaw Cron 集成后，由 Agent 负责实际的浏览器抓取并更新 state。
 */

const BaseHotelAdapter = require('./BaseAdapter');
const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '../../../ctrip-monitor-state.json');

class CtripAdapter extends BaseHotelAdapter {
  constructor(config) {
    super(config);
    this.name = 'Ctrip';
  }

  /**
   * queryPrice：从 state.json 读取已有的价格数据
   * 实际价格抓取由 EasyClaw Agent（browser 工具）负责写入 state.json
   */
  async queryPrice(task) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      const record = state.monitors.find(m => m.id === task.id);

      if (!record) {
        return { success: false, error: `任务 ${task.id} 不存在于 state.json` };
      }

      if (record.lastPrice == null) {
        return { success: false, error: '暂无价格数据，等待 Agent 抓取' };
      }

      return {
        success: true,
        data: {
          hotelName: record.hotelName,
          roomName: record.roomName,
          price: record.lastPrice,
          priceOptions: record.currentPriceOptions || [],
          available: true,
          timestamp: record.lastCheckedAt || new Date().toISOString(),
          source: 'state.json',  // 标记数据来源
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async searchHotels() {
    throw new Error('CtripAdapter: 请通过 EasyClaw Agent 执行搜索');
  }

  async getHotelDetails() {
    throw new Error('CtripAdapter: 请通过 EasyClaw Agent 获取详情');
  }
}

module.exports = CtripAdapter;
