/**
 * 酒店价格查询 API
 * 供闲鱼客服和其他服务调用
 * 
 * 使用方式：
 *   import { queryHotelPrice } from './api/price-query';
 *   const result = await queryHotelPrice({ hotelName: '安纳塔拉', city: '三亚', checkIn: '2026-03-15', checkOut: '2026-03-16' });
 */

import { findAdapter, fetchPrices, fetchPricesMultiSource, HotelSearchParams, PriceResult } from '../adapters';

export interface QueryOptions {
  /** 优先使用的数据源 */
  preferredSource?: 'anantara' | 'gha' | 'ctrip';
  /** 是否查询多个数据源 */
  multiSource?: boolean;
  /** 指定数据源列表（multiSource=true 时有效） */
  sources?: string[];
  /** 是否需要浏览器抓取（false 时只返回 URL 和指令） */
  needsBrowserFetch?: boolean;
}

export interface QueryResult {
  /** 是否成功 */
  success: boolean;
  /** 推荐的适配器名称 */
  adapterName: string | null;
  /** 预订链接 */
  bookingUrl: string;
  /** 浏览器执行指令（如需手动抓取） */
  browserInstructions?: string;
  /** 价格结果（如果直接可获取） */
  priceResult?: PriceResult;
  /** 多源结果 */
  multiSourceResults?: {
    results: PriceResult[];
    lowest: PriceResult | null;
  };
  /** 错误信息 */
  error?: string;
}

/**
 * 查询酒店价格
 * 
 * @param params 搜索参数
 * @param options 查询选项
 */
export async function queryHotelPrice(
  params: HotelSearchParams,
  options: QueryOptions = {}
): Promise<QueryResult> {
  const adapter = findAdapter(params.hotelName);

  if (!adapter) {
    return {
      success: false,
      adapterName: null,
      bookingUrl: '',
      error: `没有适配器支持酒店: ${params.hotelName}`,
    };
  }

  const result: QueryResult = {
    success: true,
    adapterName: adapter.name,
    bookingUrl: adapter.getBookingUrl(params),
  };

  // 获取浏览器执行指令
  if ('getBrowserInstructions' in adapter && typeof (adapter as any).getBrowserInstructions === 'function') {
    result.browserInstructions = (adapter as any).getBrowserInstructions(params);
  }

  // 如果需要多源查询
  if (options.multiSource) {
    result.multiSourceResults = await fetchPricesMultiSource(params, options.sources);
    if (result.multiSourceResults.lowest) {
      result.priceResult = result.multiSourceResults.lowest;
    }
  } else if (options.needsBrowserFetch !== false) {
    // 单源查询（注意：可能返回需要浏览器执行的错误）
    result.priceResult = await fetchPrices(params, options.preferredSource);
  }

  return result;
}

/**
 * 获取酒店的数据源信息（不执行实际查询）
 * 
 * 适用场景：闲鱼客服收到查价请求时，先判断用哪个渠道
 */
export function getHotelSourceInfo(hotelName: string): {
  adapter: string | null;
  isGhaBrand: boolean;
  supportedSources: string[];
} {
  const adapter = findAdapter(hotelName);
  
  // 检查是否 GHA 品牌
  const lower = hotelName.toLowerCase();
  const ghaBrands = [
    'anantara', '安纳塔拉', 'kempinski', '凯宾斯基',
    'pan pacific', '泛太平洋', 'parkroyal', 'nh hotel',
    'radisson collection', 'avani', 'tivoli', 'marco polo',
  ];
  const isGhaBrand = ghaBrands.some(b => lower.includes(b.toLowerCase()));

  return {
    adapter: adapter?.name ?? null,
    isGhaBrand,
    supportedSources: adapter ? [adapter.name, 'ctrip'] : ['ctrip'],
  };
}

/**
 * 从页面文本解析价格（供 Agent 调用）
 * 
 * 使用场景：
 *   1. Agent 通过 browser-use 打开页面
 *   2. 截取页面文本
 *   3. 调用此方法解析
 */
export function parsePageText(
  pageText: string,
  params: HotelSearchParams,
  source: 'anantara' | 'gha' | 'ctrip'
): PriceResult {
  const adapter = findAdapter(params.hotelName);
  
  if (!adapter || adapter.name !== source) {
    // 使用指定的适配器
    const { anantaraAdapter } = require('../adapters/anantara-adapter');
    const { ghaAdapter } = require('../adapters/gha-adapter');
    const { ctripAdapter } = require('../adapters/ctrip-adapter');
    
    const adapterMap = {
      anantara: anantaraAdapter,
      gha: ghaAdapter,
      ctrip: ctripAdapter,
    };
    
    const targetAdapter = adapterMap[source];
    if (targetAdapter && 'fetchPricesFromPageText' in targetAdapter) {
      return targetAdapter.fetchPricesFromPageText(pageText, params);
    }
  }

  // 使用自动选择的适配器
  if (adapter && 'fetchPricesFromPageText' in adapter) {
    return (adapter as any).fetchPricesFromPageText(pageText, params);
  }

  return {
    success: false,
    error: `适配器 ${source} 不支持页面文本解析`,
    hotelName: params.hotelName,
    options: [],
    queriedAt: new Date().toISOString(),
    source,
  };
}
