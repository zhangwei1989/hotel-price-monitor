/**
 * 携程酒店价格适配器
 * 
 * 注意：此适配器不能直接调用 browser，需要配合 EasyClaw Agent 使用
 * Agent 负责打开页面 → 传入页面文本 → 适配器解析
 */

import { BaseAdapter, HotelSearchParams, PriceResult, PriceOption } from './base-adapter';

export class CtripAdapter extends BaseAdapter {
  readonly name = 'ctrip';
  readonly supportedBrands = ['*']; // 携程支持所有酒店
  readonly requiresAuth = false;

  /**
   * 携程作为 fallback，支持所有酒店
   */
  supports(_hotelName: string): boolean {
    return true;
  }

  /**
   * 生成携程预订链接
   */
  getBookingUrl(params: HotelSearchParams): string {
    const cityId = this.getCityId(params.city);
    const hotelId = params.hotelId || '';
    return `https://hotels.ctrip.com/hotels/detail/?hotelId=${hotelId}&checkIn=${params.checkIn}&checkOut=${params.checkOut}&cityId=${cityId}`;
  }

  /**
   * 查询价格
   * 注意：此方法需要外部传入页面文本，不能直接调用
   * 实际使用时通过 fetchPricesFromPageText 方法
   */
  async fetchPrices(params: HotelSearchParams): Promise<PriceResult> {
    // 返回一个提示，实际价格查询需要通过 Agent + browser
    return {
      success: false,
      error: '携程适配器需要通过 Agent 打开页面后调用 fetchPricesFromPageText',
      hotelName: params.hotelName,
      options: [],
      queriedAt: new Date().toISOString(),
      source: this.name,
      sourceUrl: this.getBookingUrl(params),
    };
  }

  /**
   * 从页面文本解析价格（实际使用的方法）
   */
  fetchPricesFromPageText(pageText: string, params: HotelSearchParams): PriceResult {
    const result: PriceResult = {
      success: false,
      hotelName: params.hotelName,
      options: [],
      queriedAt: new Date().toISOString(),
      source: this.name,
      sourceUrl: this.getBookingUrl(params),
    };

    if (!pageText) {
      result.error = '页面文本为空';
      return result;
    }

    const options: PriceOption[] = [];

    // 策略1：匹配 ¥数字 / ￥数字
    const pricePattern = /[¥￥]\s*(\d{2,5})/g;
    let m;
    const prices: number[] = [];
    while ((m = pricePattern.exec(pageText)) !== null) {
      const p = parseInt(m[1], 10);
      if (p >= 50 && p <= 99999) prices.push(p);
    }

    // 策略2：匹配"起 数字"/ "最低 数字"
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

    for (const p of unique.slice(0, 8)) {
      options.push({
        roomName: p === unique[0] ? '最低价房型' : `¥${p} 房型`,
        price: p,
        currency: 'CNY',
        description: p === unique[0] ? '携程最低价' : undefined,
      });
    }

    result.success = true;
    result.options = options;

    const lowest = this.findLowest(options);
    if (lowest) {
      result.lowestPrice = lowest.price;
      result.lowestRoomName = lowest.roomName;
    }

    return result;
  }

  /**
   * 城市名转携程城市 ID（常用城市）
   */
  private getCityId(city: string): number {
    const cityMap: Record<string, number> = {
      '北京': 1,
      '上海': 2,
      '广州': 32,
      '深圳': 30,
      '杭州': 14,
      '南京': 9,
      '成都': 104,
      '重庆': 158,
      '西安': 7,
      '武汉': 477,
      '长沙': 206,
      '三亚': 43,
      '厦门': 21,
      '青岛': 5,
      '大连': 4,
      '苏州': 11,
      '天津': 154,
    };
    return cityMap[city] || 1;
  }
}

// 导出单例
export const ctripAdapter = new CtripAdapter();
