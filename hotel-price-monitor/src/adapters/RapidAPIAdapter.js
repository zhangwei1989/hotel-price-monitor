/**
 * RapidAPI 适配器 (聚合多个酒店API)
 * 文档: https://rapidapi.com/apidojo/api/booking-com
 */

const BaseHotelAdapter = require('./BaseAdapter');
const axios = require('axios');

class RapidAPIAdapter extends BaseHotelAdapter {
  constructor(config) {
    super(config);
    this.name = 'RapidAPI-Booking';
    this.apiKey = config.rapidApiKey;
    this.baseURL = 'https://booking-com.p.rapidapi.com/v1';
  }

  /**
   * 搜索酒店
   */
  async searchHotels({ keyword, checkInDate, checkOutDate }) {
    try {
      // 第一步: 搜索目的地
      const destResponse = await axios.get(`${this.baseURL}/hotels/locations`, {
        params: { name: keyword, locale: 'zh-cn' },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });

      const destId = destResponse.data[0]?.dest_id;
      if (!destId) return [];

      // 第二步: 搜索酒店
      const hotelsResponse = await axios.get(`${this.baseURL}/hotels/search`, {
        params: {
          dest_id: destId,
          dest_type: 'city',
          checkin_date: checkInDate,
          checkout_date: checkOutDate,
          adults_number: 1,
          room_number: 1,
          locale: 'zh-cn',
          currency: 'CNY'
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });

      return hotelsResponse.data.result || [];
    } catch (error) {
      console.error('[RapidAPI] 搜索失败:', error.message);
      return [];
    }
  }

  /**
   * 查询价格
   */
  async queryPrice({ hotelId, checkInDate, checkOutDate }) {
    try {
      const response = await axios.get(`${this.baseURL}/hotels/prices`, {
        params: {
          hotel_ids: hotelId,
          checkin_date: checkInDate,
          checkout_date: checkOutDate,
          adults_number: 1,
          room_number: 1,
          locale: 'zh-cn',
          currency: 'CNY'
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });

      const hotelData = response.data[0];
      if (!hotelData) return null;

      return this.normalizePriceResponse({
        hotelId,
        hotelName: hotelData.hotel_name,
        price: hotelData.min_total_price,
        currency: hotelData.currency_code,
        available: hotelData.is_available === 1,
        checkInDate,
        checkOutDate
      });
    } catch (error) {
      console.error('[RapidAPI] 价格查询失败:', error.message);
      return null;
    }
  }

  /**
   * 获取酒店详情
   */
  async getHotelDetails(hotelId) {
    try {
      const response = await axios.get(`${this.baseURL}/hotels/data`, {
        params: { hotel_id: hotelId, locale: 'zh-cn' },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });

      return response.data;
    } catch (error) {
      console.error('[RapidAPI] 获取详情失败:', error.message);
      return null;
    }
  }
}

module.exports = RapidAPIAdapter;
