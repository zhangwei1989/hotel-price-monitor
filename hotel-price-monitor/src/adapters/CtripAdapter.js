/**
 * 携程适配器
 */

const BaseHotelAdapter = require('./BaseAdapter');
const axios = require('axios');

class CtripAdapter extends BaseHotelAdapter {
  constructor(config) {
    super(config);
    this.name = 'Ctrip';
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseURL = 'https://api.ctrip.com'; // 实际地址需替换
  }

  async searchHotels({ keyword, city, checkInDate, checkOutDate }) {
    try {
      const response = await axios.post(`${this.baseURL}/hotel/search`, {
        keyword,
        city,
        checkInDate,
        checkOutDate,
        apiKey: this.apiKey
      });

      return response.data.hotels || [];
    } catch (error) {
      console.error('[Ctrip] 搜索失败:', error.message);
      return [];
    }
  }

  async queryPrice({ hotelId, roomTypeId, checkInDate, checkOutDate }) {
    try {
      const response = await axios.post(`${this.baseURL}/hotel/price/query`, {
        hotelId,
        roomTypeId,
        checkInDate,
        checkOutDate,
        apiKey: this.apiKey
      });

      return this.normalizePriceResponse({
        hotelId,
        roomTypeId,
        price: response.data.price,
        currency: 'CNY',
        available: response.data.available,
        checkInDate,
        checkOutDate
      });
    } catch (error) {
      console.error('[Ctrip] 价格查询失败:', error.message);
      return null;
    }
  }

  async getHotelDetails(hotelId) {
    try {
      const response = await axios.get(`${this.baseURL}/hotel/detail/${hotelId}`, {
        params: { apiKey: this.apiKey }
      });

      return response.data;
    } catch (error) {
      console.error('[Ctrip] 获取详情失败:', error.message);
      return null;
    }
  }
}

module.exports = CtripAdapter;
