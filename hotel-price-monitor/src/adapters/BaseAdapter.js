/**
 * 酒店API基础适配器
 * 所有数据源需要实现此接口
 */

class BaseHotelAdapter {
  constructor(config) {
    this.config = config;
    this.name = 'BaseAdapter';
  }

  /**
   * 搜索酒店
   * @param {Object} params
   * @param {string} params.keyword - 搜索关键词
   * @param {string} params.city - 城市
   * @param {string} params.checkInDate - 入住日期
   * @param {string} params.checkOutDate - 离店日期
   * @returns {Promise<Array>} 酒店列表
   */
  async searchHotels(params) {
    throw new Error('searchHotels() must be implemented');
  }

  /**
   * 查询价格
   * @param {Object} params
   * @param {string} params.hotelId - 酒店ID
   * @param {string} params.roomTypeId - 房型ID (可选)
   * @param {string} params.checkInDate - 入住日期
   * @param {string} params.checkOutDate - 离店日期
   * @returns {Promise<Object>} 标准化价格数据
   */
  async queryPrice(params) {
    throw new Error('queryPrice() must be implemented');
  }

  /**
   * 获取酒店详情
   * @param {string} hotelId
   * @returns {Promise<Object>}
   */
  async getHotelDetails(hotelId) {
    throw new Error('getHotelDetails() must be implemented');
  }

  /**
   * 标准化价格响应
   * 将不同数据源的响应统一为标准格式
   */
  normalizePriceResponse(rawData) {
    return {
      provider: this.name,
      hotelId: rawData.hotelId,
      hotelName: rawData.hotelName || '',
      roomTypeId: rawData.roomTypeId || '',
      roomTypeName: rawData.roomTypeName || '',
      price: parseFloat(rawData.price) || 0,
      currency: rawData.currency || 'CNY',
      available: rawData.available !== false,
      checkInDate: rawData.checkInDate,
      checkOutDate: rawData.checkOutDate,
      timestamp: new Date().toISOString(),
      rawData: rawData // 保留原始数据用于调试
    };
  }
}

module.exports = BaseHotelAdapter;
