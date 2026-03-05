/**
 * 携程适配器 - 基于浏览器自动化抓取价格
 * 核心逻辑：通过 EasyClaw Gateway API 调用 browser 工具抓取携程页面
 */

const BaseHotelAdapter = require('./BaseAdapter');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:10089';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || '';

class CtripAdapter extends BaseHotelAdapter {
  constructor(config) {
    super(config);
    this.name = 'Ctrip';
    this.gatewayUrl = config.gatewayUrl || GATEWAY_URL;
    this.gatewayToken = config.gatewayToken || GATEWAY_TOKEN;
  }

  /**
   * 通过 EasyClaw Gateway 调用 agent 执行浏览器操作
   */
  async callAgent(task) {
    const prompt = `
请打开这个携程酒店链接并获取价格信息：
URL: ${task.link}

步骤：
1. 打开链接
2. 等待页面加载完成（等待价格出现）
3. 找到"${task.roomName}"或最接近的房型
4. 获取该房型的所有价格选项（价格数字 + 价格方案描述）
5. 只返回 JSON，格式如下：
{
  "success": true,
  "hotelName": "酒店名称",
  "roomName": "房型名称",
  "prices": [
    { "price": 数字, "description": "方案描述" }
  ],
  "lowestPrice": 最低价数字
}

如果页面打不开或找不到价格，返回：
{ "success": false, "error": "错误原因" }
`;

    try {
      const res = await axios.post(
        `${this.gatewayUrl}/api/sessions/spawn`,
        {
          task: prompt,
          agentId: 'main',
          timeoutSeconds: 60
        },
        {
          headers: {
            'Authorization': `Bearer ${this.gatewayToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 解析 agent 返回的 JSON
      const text = res.data?.result || res.data?.message || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return { success: false, error: '无法解析 agent 返回结果' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 查询价格（核心方法）
   */
  async queryPrice(task) {
    console.log(`[CtripAdapter] 开始抓取: ${task.hotelName} - ${task.roomName}`);
    console.log(`[CtripAdapter] 链接: ${task.link}`);

    const result = await this.callAgent(task);

    if (!result.success) {
      console.error(`[CtripAdapter] 抓取失败: ${result.error}`);
      return {
        success: false,
        error: result.error
      };
    }

    const lowestPrice = result.lowestPrice ||
      (result.prices?.length > 0 ? Math.min(...result.prices.map(p => p.price)) : null);

    console.log(`[CtripAdapter] 抓取成功: 最低价 ¥${lowestPrice}`);

    return {
      success: true,
      data: {
        hotelName: result.hotelName || task.hotelName,
        roomName: result.roomName || task.roomName,
        price: lowestPrice,
        priceOptions: result.prices || [],
        available: lowestPrice !== null,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * searchHotels - 暂不实现（当前通过链接直接监控）
   */
  async searchHotels() {
    throw new Error('CtripAdapter: searchHotels 暂不支持，请直接使用携程链接');
  }

  /**
   * getHotelDetails - 暂不实现
   */
  async getHotelDetails() {
    throw new Error('CtripAdapter: getHotelDetails 暂不支持');
  }
}

module.exports = CtripAdapter;
