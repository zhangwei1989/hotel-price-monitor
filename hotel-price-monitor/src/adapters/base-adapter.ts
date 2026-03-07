/**
 * 酒店价格适配器基类
 * 所有 OTA/官网适配器都需要实现这个接口
 */

export interface HotelSearchParams {
  /** 酒店名称（用于匹配） */
  hotelName: string;
  /** 酒店 ID（如官网有的话） */
  hotelId?: string;
  /** 城市 */
  city: string;
  /** 入住日期 YYYY-MM-DD */
  checkIn: string;
  /** 退房日期 YYYY-MM-DD */
  checkOut: string;
  /** 房型名称（可选，用于精确匹配） */
  roomName?: string;
  /** 成人数 */
  adults?: number;
  /** 房间数 */
  rooms?: number;
}

export interface PriceOption {
  /** 房型名称 */
  roomName: string;
  /** 价格（数字） */
  price: number;
  /** 货币 */
  currency: string;
  /** 价格描述（如"含早"、"不可退"等） */
  description?: string;
  /** 原价（如有折扣） */
  originalPrice?: number;
  /** 预订链接 */
  bookingUrl?: string;
}

export interface PriceResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 酒店名称（标准化后的） */
  hotelName: string;
  /** 价格选项列表 */
  options: PriceOption[];
  /** 最低价 */
  lowestPrice?: number;
  /** 最低价房型 */
  lowestRoomName?: string;
  /** 查询时间 */
  queriedAt: string;
  /** 数据来源 */
  source: string;
  /** 原始页面 URL */
  sourceUrl?: string;
}

export abstract class BaseAdapter {
  /** 适配器名称 */
  abstract readonly name: string;
  
  /** 适配器支持的品牌/平台 */
  abstract readonly supportedBrands: string[];
  
  /** 是否需要登录 */
  abstract readonly requiresAuth: boolean;

  /**
   * 检查是否支持该酒店
   */
  abstract supports(hotelName: string): boolean;

  /**
   * 查询酒店价格
   */
  abstract fetchPrices(params: HotelSearchParams): Promise<PriceResult>;

  /**
   * 生成预订链接
   */
  abstract getBookingUrl(params: HotelSearchParams): string;

  /**
   * 辅助方法：提取最低价
   */
  protected findLowest(options: PriceOption[]): { price: number; roomName: string } | null {
    if (options.length === 0) return null;
    const sorted = [...options].sort((a, b) => a.price - b.price);
    return { price: sorted[0].price, roomName: sorted[0].roomName };
  }

  /**
   * 辅助方法：标准化价格字符串
   */
  protected parsePrice(priceStr: string): number {
    // 移除货币符号和逗号，提取数字
    const cleaned = priceStr.replace(/[¥$€£,\s]/g, '');
    const match = cleaned.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }
}
