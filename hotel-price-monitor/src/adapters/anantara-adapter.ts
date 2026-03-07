/**
 * 安纳塔拉 (Anantara) 官网价格适配器
 * 
 * 官网：https://www.anantara.com/
 * 
 * 安纳塔拉是 Minor Hotels 旗下高端度假村品牌，
 * 也是 GHA Discovery 的核心成员。
 * 
 * 直接从官网查价比 GHA 聚合页更精准。
 */

import { BaseAdapter, HotelSearchParams, PriceResult, PriceOption } from './base-adapter';

// 安纳塔拉酒店关键词
const ANANTARA_KEYWORDS = [
  'anantara',
  '安纳塔拉',
  '安娜塔拉',
];

// 常见安纳塔拉酒店名称到官网 slug 的映射
const HOTEL_SLUGS: Record<string, string> = {
  // 中国
  '三亚': 'sanya',
  '海棠湾': 'haitang-bay',
  '西双版纳': 'xishuangbanna',
  '峨眉山': 'emeishan',
  '千岛湖': 'qiandao-lake',
  '广州': 'guangzhou',
  '成都': 'guia-island-chengdu',
  // 东南亚
  '普吉': 'phuket',
  '苏梅': 'koh-samui',
  '清迈': 'chiang-mai',
  '巴厘': 'bali',
  '马尔代夫': 'maldives',
  '迪古': 'dhigu',
  '薇莉': 'veli',
  '基哈瓦': 'kihavah',
  '纳拉杜': 'naladhu',
  // 中东
  '迪拜': 'dubai',
  '阿布扎比': 'abu-dhabi',
  '亚特兰蒂斯': 'the-palm-dubai', // 不是安纳塔拉，但可能误搜
};

export class AnantaraAdapter extends BaseAdapter {
  readonly name = 'anantara';
  readonly supportedBrands = ANANTARA_KEYWORDS;
  readonly requiresAuth = false;

  /**
   * 检查是否为安纳塔拉酒店
   */
  supports(hotelName: string): boolean {
    const lower = hotelName.toLowerCase();
    return ANANTARA_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  }

  /**
   * 生成安纳塔拉官网预订链接
   */
  getBookingUrl(params: HotelSearchParams): string {
    // 尝试匹配酒店 slug
    const slug = this.findHotelSlug(params.hotelName, params.city);
    if (slug) {
      return `https://www.anantara.com/en/${slug}?checkIn=${params.checkIn}&checkOut=${params.checkOut}&adults=${params.adults || 2}`;
    }
    // 通用搜索页
    return `https://www.anantara.com/en/hotels?destination=${encodeURIComponent(params.city)}&checkIn=${params.checkIn}&checkOut=${params.checkOut}`;
  }

  /**
   * 查询价格
   */
  async fetchPrices(params: HotelSearchParams): Promise<PriceResult> {
    return {
      success: false,
      error: '安纳塔拉适配器需要通过 Agent + browser-use 执行页面抓取',
      hotelName: params.hotelName,
      options: [],
      queriedAt: new Date().toISOString(),
      source: this.name,
      sourceUrl: this.getBookingUrl(params),
    };
  }

  /**
   * 从安纳塔拉官网页面文本解析价格
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

    // 安纳塔拉官网价格格式：
    // "From USD 450" / "起价 ¥3,200" / "$450 per night"

    // 策略1：匹配 "From [货币] [价格]"
    const fromPattern = /(?:from|起价|starting\s+from)\s*(?:USD|CNY|HKD|SGD)?\s*[\$¥]?\s*([\d,]+)/gi;
    let m;
    while ((m = fromPattern.exec(pageText)) !== null) {
      const price = parseInt(m[1].replace(/,/g, ''), 10);
      if (price >= 100 && price <= 999999) {
        options.push({
          roomName: '起价房型',
          price,
          currency: this.detectCurrency(m[0]),
          description: 'Anantara 官网起价',
        });
      }
    }

    // 策略2：匹配房型名称 + 价格
    // "Anantara Pool Villa ... USD 850"
    const roomPricePattern = /(?:villa|suite|room|房|别墅)[^\n]{0,50}?(?:USD|CNY|HKD|\$|¥)\s*([\d,]+)/gi;
    while ((m = roomPricePattern.exec(pageText)) !== null) {
      const price = parseInt(m[1].replace(/,/g, ''), 10);
      if (price >= 100 && price <= 999999) {
        // 提取房型名称
        const roomMatch = m[0].match(/([\w\s]+(?:villa|suite|room|房|别墅))/i);
        const roomName = roomMatch ? roomMatch[1].trim() : '房型';
        options.push({
          roomName,
          price,
          currency: this.detectCurrency(m[0]),
          description: 'Anantara 官网',
        });
      }
    }

    // 策略3：通用货币匹配
    const currencyPattern = /(?:USD|CNY|HKD)\s*[\$¥]?\s*([\d,]+)/gi;
    while ((m = currencyPattern.exec(pageText)) !== null) {
      const price = parseInt(m[1].replace(/,/g, ''), 10);
      if (price >= 100 && price <= 999999) {
        options.push({
          roomName: '标准房型',
          price,
          currency: this.detectCurrency(m[0]),
        });
      }
    }

    if (options.length === 0) {
      result.error = '未能从安纳塔拉页面提取到价格';
      return result;
    }

    // 去重并排序
    const seen = new Set<number>();
    const unique = options.filter(o => {
      if (seen.has(o.price)) return false;
      seen.add(o.price);
      return true;
    });
    unique.sort((a, b) => a.price - b.price);

    result.success = true;
    result.options = unique.slice(0, 10);

    const lowest = this.findLowest(result.options);
    if (lowest) {
      result.lowestPrice = lowest.price;
      result.lowestRoomName = lowest.roomName;
    }

    return result;
  }

  /**
   * 从文本中检测货币
   */
  private detectCurrency(text: string): string {
    const t = text.toUpperCase();
    if (t.includes('CNY') || t.includes('¥') || t.includes('￥')) return 'CNY';
    if (t.includes('HKD') || t.includes('HK$')) return 'HKD';
    if (t.includes('SGD') || t.includes('S$')) return 'SGD';
    return 'USD'; // 默认美元
  }

  /**
   * 根据酒店名/城市查找官网 slug
   */
  private findHotelSlug(hotelName: string, city: string): string | null {
    const combined = (hotelName + ' ' + city).toLowerCase();
    for (const [keyword, slug] of Object.entries(HOTEL_SLUGS)) {
      if (combined.includes(keyword.toLowerCase())) {
        return slug;
      }
    }
    return null;
  }

  /**
   * 获取浏览器执行指令
   */
  getBrowserInstructions(params: HotelSearchParams): string {
    const slug = this.findHotelSlug(params.hotelName, params.city);
    if (slug) {
      return `
1. 访问 https://www.anantara.com/en/${slug}
2. 在日期选择器中选择入住：${params.checkIn}
3. 选择退房：${params.checkOut}
4. 点击"Check Availability"或"查看房价"
5. 等待房型列表加载（3-5秒）
6. 截取页面文本，返回用于价格解析
`.trim();
    }
    return `
1. 访问 https://www.anantara.com/en/hotels
2. 搜索目的地：${params.city}
3. 选择入住日期：${params.checkIn}，退房日期：${params.checkOut}
4. 找到酒店：${params.hotelName}
5. 点击进入酒店页面，查看房价
6. 截取页面文本，返回用于价格解析
`.trim();
  }
}

// 导出单例
export const anantaraAdapter = new AnantaraAdapter();
