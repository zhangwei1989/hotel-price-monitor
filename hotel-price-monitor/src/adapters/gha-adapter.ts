/**
 * GHA Discovery 官网价格适配器
 * 
 * GHA (Global Hotel Alliance) 旗下品牌：
 * - Anantara（安纳塔拉）
 * - Kempinski（凯宾斯基）
 * - Pan Pacific（泛太平洋）
 * - NH Hotels
 * - PARKROYAL
 * - Radisson Collection
 * - 等 40+ 品牌
 * 
 * 官网：https://www.ghadiscovery.com/
 */

import { BaseAdapter, HotelSearchParams, PriceResult, PriceOption } from './base-adapter';

// GHA 旗下品牌关键词（用于判断是否支持）
const GHA_BRANDS = [
  'anantara', '安纳塔拉',
  'kempinski', '凯宾斯基',
  'pan pacific', '泛太平洋',
  'parkroyal',
  'nh hotel', 'nh collection',
  'radisson collection',
  'avani', '阿瓦尼',
  'tivoli',
  'marco polo', '马哥孛罗',
  'elewana',
  'oaks',
  'vignette collection',
  'minor hotels',
  'gha', 'discovery',
];

export class GhaAdapter extends BaseAdapter {
  readonly name = 'gha';
  readonly supportedBrands = GHA_BRANDS;
  readonly requiresAuth = false; // GHA 官网无需登录即可查价

  /**
   * 检查是否为 GHA 旗下品牌
   */
  supports(hotelName: string): boolean {
    const lower = hotelName.toLowerCase();
    return GHA_BRANDS.some(brand => lower.includes(brand.toLowerCase()));
  }

  /**
   * 生成 GHA Discovery 搜索链接
   */
  getBookingUrl(params: HotelSearchParams): string {
    // GHA 官网搜索 URL 格式（需要根据实际页面调整）
    const destination = encodeURIComponent(params.city);
    return `https://www.ghadiscovery.com/search?destination=${destination}&checkIn=${params.checkIn}&checkOut=${params.checkOut}&adults=${params.adults || 2}&rooms=${params.rooms || 1}`;
  }

  /**
   * 查询价格
   * 需要配合 EasyClaw Agent + browser-use 使用
   */
  async fetchPrices(params: HotelSearchParams): Promise<PriceResult> {
    // 此方法返回指令，实际执行由 Agent 完成
    return {
      success: false,
      error: 'GHA 适配器需要通过 Agent + browser-use 执行页面抓取',
      hotelName: params.hotelName,
      options: [],
      queriedAt: new Date().toISOString(),
      source: this.name,
      sourceUrl: this.getBookingUrl(params),
    };
  }

  /**
   * 从 GHA 官网页面文本解析价格
   * 
   * @param pageText - 搜索结果页的 innerText 或 HTML
   * @param params - 搜索参数
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

    // ── 价格提取策略（根据 GHA 官网实际结构调整）──────────────

    // 策略1：匹配常见货币格式
    // USD $123 / EUR €123 / CNY ¥123 / HKD HK$123
    const currencyPatterns = [
      { pattern: /USD\s*\$?\s*([\d,]+)/gi, currency: 'USD' },
      { pattern: /\$\s*([\d,]+)/gi, currency: 'USD' },
      { pattern: /EUR\s*€?\s*([\d,]+)/gi, currency: 'EUR' },
      { pattern: /€\s*([\d,]+)/gi, currency: 'EUR' },
      { pattern: /CNY\s*[¥￥]?\s*([\d,]+)/gi, currency: 'CNY' },
      { pattern: /[¥￥]\s*([\d,]+)/gi, currency: 'CNY' },
      { pattern: /HKD\s*(?:HK\$)?\s*([\d,]+)/gi, currency: 'HKD' },
      { pattern: /HK\$\s*([\d,]+)/gi, currency: 'HKD' },
    ];

    const priceSet = new Set<string>();
    
    for (const { pattern, currency } of currencyPatterns) {
      let m;
      while ((m = pattern.exec(pageText)) !== null) {
        const priceNum = parseInt(m[1].replace(/,/g, ''), 10);
        if (priceNum >= 50 && priceNum <= 999999) {
          const key = `${currency}-${priceNum}`;
          if (!priceSet.has(key)) {
            priceSet.add(key);
            options.push({
              roomName: '标准房型',
              price: priceNum,
              currency,
              description: `GHA Discovery ${currency}`,
            });
          }
        }
      }
    }

    // 策略2：尝试匹配酒店名称 + 价格块
    // [酒店名]...[价格]...per night
    const hotelPricePattern = new RegExp(
      params.hotelName.slice(0, 10).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '[\\s\\S]{0,200}?(?:from|起|USD|\\$|€|¥|CNY)\\s*([\\d,]+)',
      'gi'
    );
    let hm;
    while ((hm = hotelPricePattern.exec(pageText)) !== null) {
      const priceNum = parseInt(hm[1].replace(/,/g, ''), 10);
      if (priceNum >= 50 && priceNum <= 999999) {
        options.push({
          roomName: params.hotelName,
          price: priceNum,
          currency: 'USD', // 默认 USD，GHA 官网主要显示美元
          description: '酒店匹配价格',
        });
      }
    }

    if (options.length === 0) {
      result.error = '未能从 GHA 页面提取到价格';
      return result;
    }

    // 按价格排序
    options.sort((a, b) => a.price - b.price);

    result.success = true;
    result.options = options.slice(0, 10);

    const lowest = this.findLowest(result.options);
    if (lowest) {
      result.lowestPrice = lowest.price;
      result.lowestRoomName = lowest.roomName;
    }

    return result;
  }

  /**
   * 获取 GHA 官网搜索指令
   * 供 Agent/browser-use 执行
   */
  getBrowserInstructions(params: HotelSearchParams): string {
    return `
1. 访问 https://www.ghadiscovery.com/
2. 在搜索框输入目的地：${params.city}
3. 选择入住日期：${params.checkIn}
4. 选择退房日期：${params.checkOut}
5. 点击搜索按钮
6. 等待搜索结果加载（3-5秒）
7. 如果有酒店名称筛选，筛选：${params.hotelName}
8. 截取页面文本，返回用于价格解析
`.trim();
  }
}

// 导出单例
export const ghaAdapter = new GhaAdapter();
