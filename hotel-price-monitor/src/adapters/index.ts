/**
 * 适配器注册表
 * 统一管理所有酒店价格适配器
 */

import { BaseAdapter, HotelSearchParams, PriceResult } from './base-adapter';

// 适配器列表（按优先级排序）
const adapters: BaseAdapter[] = [];

/**
 * 注册适配器
 */
export function registerAdapter(adapter: BaseAdapter): void {
  adapters.push(adapter);
  console.log(`[AdapterRegistry] Registered: ${adapter.name}`);
}

/**
 * 根据酒店名称找到合适的适配器
 */
export function findAdapter(hotelName: string): BaseAdapter | null {
  for (const adapter of adapters) {
    if (adapter.supports(hotelName)) {
      return adapter;
    }
  }
  return null;
}

/**
 * 获取所有适配器
 */
export function getAllAdapters(): BaseAdapter[] {
  return [...adapters];
}

/**
 * 使用最合适的适配器查询价格
 * 如果指定了 preferredSource，优先使用该适配器
 */
export async function fetchPrices(
  params: HotelSearchParams,
  preferredSource?: string
): Promise<PriceResult> {
  // 优先使用指定的适配器
  if (preferredSource) {
    const preferred = adapters.find(a => a.name === preferredSource);
    if (preferred && preferred.supports(params.hotelName)) {
      return preferred.fetchPrices(params);
    }
  }

  // 自动选择适配器
  const adapter = findAdapter(params.hotelName);
  if (!adapter) {
    return {
      success: false,
      error: `没有适配器支持酒店: ${params.hotelName}`,
      hotelName: params.hotelName,
      options: [],
      queriedAt: new Date().toISOString(),
      source: 'none',
    };
  }

  return adapter.fetchPrices(params);
}

/**
 * 多源查询（同时查多个渠道，返回最低价）
 */
export async function fetchPricesMultiSource(
  params: HotelSearchParams,
  sources?: string[]
): Promise<{ results: PriceResult[]; lowest: PriceResult | null }> {
  const targetAdapters = sources
    ? adapters.filter(a => sources.includes(a.name) && a.supports(params.hotelName))
    : adapters.filter(a => a.supports(params.hotelName));

  if (targetAdapters.length === 0) {
    return { results: [], lowest: null };
  }

  const results = await Promise.all(
    targetAdapters.map(a => a.fetchPrices(params))
  );

  // 找最低价
  let lowest: PriceResult | null = null;
  for (const r of results) {
    if (r.success && r.lowestPrice != null) {
      if (!lowest || r.lowestPrice < (lowest.lowestPrice ?? Infinity)) {
        lowest = r;
      }
    }
  }

  return { results, lowest };
}

// 导出类型
export { BaseAdapter, HotelSearchParams, PriceResult, PriceOption } from './base-adapter';

// 导出具体适配器
export { ctripAdapter, CtripAdapter } from './ctrip-adapter';
export { ghaAdapter, GhaAdapter } from './gha-adapter';
export { anantaraAdapter, AnantaraAdapter } from './anantara-adapter';

// 自动注册适配器（按优先级：专用 > 聚合 > 通用）
import { anantaraAdapter } from './anantara-adapter';
import { ghaAdapter } from './gha-adapter';
import { ctripAdapter } from './ctrip-adapter';

// 安纳塔拉专用适配器优先
registerAdapter(anantaraAdapter);
// GHA 聚合（覆盖 40+ 品牌）
registerAdapter(ghaAdapter);
// 携程作为 fallback（支持所有酒店）
registerAdapter(ctripAdapter);
