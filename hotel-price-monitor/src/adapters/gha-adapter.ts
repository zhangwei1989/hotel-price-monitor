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

    // ── 价格提取策略（基于 GHA 官网实际结构 2026-03）──────────────
    // GHA 官网搜索结果页结构：
    // - 酒店卡片：.tid-card
    // - 会员价格：MEMBER RATES FROM + CNY/USD + 数字
    // - 非会员价格：NON-MEMBER RATES + CNY/USD + 数字

    // 策略1：匹配 "MEMBER RATES FROM CNY 518" 格式
    const memberPricePattern = /MEMBER\s*RATES?\s*(?:FROM)?\s*(?:CNY|USD|EUR|HKD|SGD)?\s*([\d,]+)/gi;
    let m;
    while ((m = memberPricePattern.exec(pageText)) !== null) {
      const priceNum = parseInt(m[1].replace(/,/g, ''), 10);
      if (priceNum >= 50 && priceNum <= 999999) {
        options.push({
          roomName: '会员价起',
          price: priceNum,
          currency: this.detectCurrency(pageText, m.index),
          description: 'GHA Discovery 会员价',
        });
      }
    }

    // 策略2：匹配 "NON-MEMBER RATES CNY 576" 格式
    const nonMemberPattern = /NON-?MEMBER\s*RATES?\s*(?:CNY|USD|EUR|HKD|SGD)?\s*([\d,]+)/gi;
    while ((m = nonMemberPattern.exec(pageText)) !== null) {
      const priceNum = parseInt(m[1].replace(/,/g, ''), 10);
      if (priceNum >= 50 && priceNum <= 999999) {
        options.push({
          roomName: '非会员价',
          price: priceNum,
          currency: this.detectCurrency(pageText, m.index),
          description: 'GHA Discovery 非会员价',
        });
      }
    }

    // 策略3：匹配通用货币格式（兜底）
    const currencyPatterns = [
      { pattern: /CNY\s*([\d,]+)/gi, currency: 'CNY' },
      { pattern: /USD\s*\$?\s*([\d,]+)/gi, currency: 'USD' },
      { pattern: /[¥￥]\s*([\d,]+)/gi, currency: 'CNY' },
      { pattern: /\$\s*([\d,]+)/gi, currency: 'USD' },
    ];

    const priceSet = new Set<string>();
    for (const opt of options) priceSet.add(`${opt.currency}-${opt.price}`);
    
    for (const { pattern, currency } of currencyPatterns) {
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
              description: `GHA Discovery`,
            });
          }
        }
      }
    }

    // 策略4：尝试匹配酒店名称 + 价格块（用于精确定位）
    const hotelPricePattern = new RegExp(
      params.hotelName.slice(0, 10).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '[\\s\\S]{0,300}?(?:CNY|USD|MEMBER|FROM)\\s*([\\d,]+)',
      'gi'
    );
    while ((m = hotelPricePattern.exec(pageText)) !== null) {
      const priceNum = parseInt(m[1].replace(/,/g, ''), 10);
      if (priceNum >= 50 && priceNum <= 999999) {
        const key = `match-${priceNum}`;
        if (!priceSet.has(key)) {
          priceSet.add(key);
          options.push({
            roomName: params.hotelName,
            price: priceNum,
            currency: 'CNY',
            description: '酒店匹配价格',
          });
        }
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
   * 从文本附近检测货币（根据上下文判断）
   */
  private detectCurrency(pageText: string, position: number): string {
    const context = pageText.slice(Math.max(0, position - 50), position + 50).toUpperCase();
    if (context.includes('CNY') || context.includes('¥')) return 'CNY';
    if (context.includes('HKD') || context.includes('HK$')) return 'HKD';
    if (context.includes('SGD') || context.includes('S$')) return 'SGD';
    if (context.includes('EUR') || context.includes('€')) return 'EUR';
    return 'CNY'; // GHA 中国区默认 CNY
  }

  /**
   * 获取 GHA 官网搜索指令
   * 供 Agent/browser-use 执行
   * 
   * 选择器参考（2026-03 验证）：
   * - 目的地输入框：input.tid-inputSearch
   * - 入住日期：input.tid-startingDate
   * - 退房日期：input.tid-endingDate
   * - 搜索按钮：button.tid-SearchBtn
   * - 酒店卡片：.tid-card
   * - 价格区域：.CardPricesWapper h5
   */
  getBrowserInstructions(params: HotelSearchParams): string {
    return `
1. 访问 https://www.ghadiscovery.com/
2. 在目的地输入框（input.tid-inputSearch）输入：${params.city}
3. 在入住日期（input.tid-startingDate）选择：${params.checkIn}
4. 在退房日期（input.tid-endingDate）选择：${params.checkOut}
5. 点击搜索按钮（button.tid-SearchBtn）
6. 等待搜索结果加载（3-5秒）
7. 在结果页找到酒店：${params.hotelName}
8. 读取该酒店卡片（.tid-card）中的 MEMBER RATES 和 NON-MEMBER RATES
9. 返回页面文本或截图
`.trim();
  }
}

// GHA 官网选择器常量（供外部使用）
export const GHA_SELECTORS = {
  searchInput: 'input.tid-inputSearch',
  checkInDate: 'input.tid-startingDate',
  checkOutDate: 'input.tid-endingDate',
  searchButton: 'button.tid-SearchBtn',
  hotelCard: '.tid-card',
  priceWrapper: '.CardPricesWapper',
  priceValue: '.CardPricesWapper h5',
};

// 导出单例
export const ghaAdapter = new GhaAdapter();
