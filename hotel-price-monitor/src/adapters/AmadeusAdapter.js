/**
 * Amadeus 适配器 (万豪、凯悦、洲际等国际酒店)
 * 文档: https://developers.amadeus.com/self-service/category/hotels
 */

const BaseHotelAdapter = require('./BaseAdapter');
const Amadeus = require('amadeus'); // npm install amadeus

class AmadeusAdapter extends BaseHotelAdapter {
  constructor(config) {
    super(config);
    this.name = 'Amadeus';
    this.client = new Amadeus({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      hostname: config.production ? 'production' : 'test'
    });
  }

  /**
   * 搜索酒店
   */
  async searchHotels({ keyword, city, checkInDate, checkOutDate }) {
    try {
      // Amadeus 使用经纬度或IATA代码搜索
      const response = await this.client.referenceData.locations.hotels.byCity.get({
        cityCode: city, // 如 'PAR' for Paris
        radius: 50,
        radiusUnit: 'KM'
      });

      return response.data || [];
    } catch (error) {
      console.error('[Amadeus] 搜索失败:', error);
      return [];
    }
  }

  /**
   * 查询价格
   */
  async queryPrice({ hotelId, checkInDate, checkOutDate }) {
    try {
      const response = await this.client.shopping.hotelOffersSearch.get({
        hotelIds: hotelId,
        checkInDate,
        checkOutDate,
        adults: 1,
        roomQuantity: 1
      });

      const offer = response.data[0];
      if (!offer) return null;

      // 提取最低价格
      const lowestOffer = offer.offers.reduce((min, curr) => 
        parseFloat(curr.price.total) < parseFloat(min.price.total) ? curr : min
      );

      return this.normalizePriceResponse({
        hotelId: offer.hotel.hotelId,
        hotelName: offer.hotel.name,
        roomTypeId: lowestOffer.room.typeEstimated.category,
        roomTypeName: lowestOffer.room.description?.text || '',
        price: lowestOffer.price.total,
        currency: lowestOffer.price.currency,
        available: true,
        checkInDate,
        checkOutDate
      });
    } catch (error) {
      console.error('[Amadeus] 价格查询失败:', error.description);
      return null;
    }
  }

  /**
   * 获取酒店详情
   */
  async getHotelDetails(hotelId) {
    try {
      const response = await this.client.shopping.hotelOffersSearch.get({
        hotelIds: hotelId
      });

      return response.data[0]?.hotel || null;
    } catch (error) {
      console.error('[Amadeus] 获取详情失败:', error);
      return null;
    }
  }

  /**
   * 根据品牌筛选酒店
   * @param {string} chainCode - 酒店集团代码
   * 示例: 'MC' (万豪), 'HY' (凯悦), 'IC' (洲际)
   */
  async searchByChain({ chainCode, city, checkInDate, checkOutDate }) {
    try {
      const response = await this.client.shopping.hotelOffersSearch.get({
        cityCode: city,
        checkInDate,
        checkOutDate,
        hotelSource: 'ALL',
        chainCodes: chainCode
      });

      return response.data || [];
    } catch (error) {
      console.error('[Amadeus] 品牌搜索失败:', error);
      return [];
    }
  }
}

module.exports = AmadeusAdapter;
