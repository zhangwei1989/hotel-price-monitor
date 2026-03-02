/**
 * 适配器管理器 - 统一管理多个数据源
 */

const CtripAdapter = require('../adapters/CtripAdapter');
const AmadeusAdapter = require('../adapters/AmadeusAdapter');
const RapidAPIAdapter = require('../adapters/RapidAPIAdapter');

class AdapterManager {
  constructor(config) {
    this.adapters = {};
    this.config = config;
    this.initializeAdapters();
  }

  /**
   * 初始化所有适配器
   */
  initializeAdapters() {
    // 携程
    if (this.config.ctrip?.enabled) {
      this.adapters.ctrip = new CtripAdapter({
        apiKey: this.config.ctrip.apiKey,
        apiSecret: this.config.ctrip.apiSecret
      });
    }

    // Amadeus (国际酒店集团)
    if (this.config.amadeus?.enabled) {
      this.adapters.amadeus = new AmadeusAdapter({
        clientId: this.config.amadeus.clientId,
        clientSecret: this.config.amadeus.clientSecret,
        production: this.config.amadeus.production || false
      });
    }

    // RapidAPI
    if (this.config.rapidapi?.enabled) {
      this.adapters.rapidapi = new RapidAPIAdapter({
        rapidApiKey: this.config.rapidapi.apiKey
      });
    }

    console.log(`[AdapterManager] 已加载 ${Object.keys(this.adapters).length} 个适配器:`, 
      Object.keys(this.adapters).join(', '));
  }

  /**
   * 根据provider获取适配器
   * @param {string} provider - 'ctrip' | 'amadeus' | 'rapidapi'
   */
  getAdapter(provider) {
    const adapter = this.adapters[provider.toLowerCase()];
    if (!adapter) {
      throw new Error(`未找到适配器: ${provider}`);
    }
    return adapter;
  }

  /**
   * 查询价格 (单个数据源)
   */
  async queryPrice(provider, params) {
    try {
      const adapter = this.getAdapter(provider);
      return await adapter.queryPrice(params);
    } catch (error) {
      console.error(`[${provider}] 价格查询失败:`, error.message);
      return null;
    }
  }

  /**
   * 查询价格 (所有数据源,返回最低价)
   */
  async queryLowestPrice(params) {
    const promises = Object.entries(this.adapters).map(([name, adapter]) => 
      adapter.queryPrice(params)
        .then(result => result ? { ...result, provider: name } : null)
        .catch(error => {
          console.error(`[${name}] 查询失败:`, error.message);
          return null;
        })
    );

    const results = (await Promise.all(promises)).filter(r => r !== null);

    if (results.length === 0) {
      return { success: false, error: '所有数据源查询失败' };
    }

    // 找出最低价
    const lowestPrice = results.reduce((min, curr) => 
      curr.price < min.price ? curr : min
    );

    return {
      success: true,
      lowestPrice,
      allPrices: results // 返回所有价格供用户比较
    };
  }

  /**
   * 搜索酒店 (指定数据源)
   */
  async searchHotels(provider, params) {
    try {
      const adapter = this.getAdapter(provider);
      return await adapter.searchHotels(params);
    } catch (error) {
      console.error(`[${provider}] 搜索失败:`, error.message);
      return [];
    }
  }

  /**
   * 搜索酒店 (聚合所有数据源)
   */
  async searchHotelsAggregated(params) {
    const promises = Object.entries(this.adapters).map(([name, adapter]) =>
      adapter.searchHotels(params)
        .then(results => results.map(r => ({ ...r, provider: name })))
        .catch(error => {
          console.error(`[${name}] 搜索失败:`, error.message);
          return [];
        })
    );

    const results = await Promise.all(promises);
    return results.flat(); // 合并所有结果
  }

  /**
   * 获取可用的数据源列表
   */
  getAvailableProviders() {
    return Object.keys(this.adapters);
  }

  /**
   * 检查数据源健康状态
   */
  async healthCheck() {
    const results = {};

    for (const [name, adapter] of Object.entries(this.adapters)) {
      try {
        // 简单的测试查询
        await adapter.searchHotels({
          keyword: 'test',
          city: 'SHA',
          checkInDate: '2026-03-01',
          checkOutDate: '2026-03-02'
        });
        results[name] = { status: 'ok' };
      } catch (error) {
        results[name] = { status: 'error', error: error.message };
      }
    }

    return results;
  }
}

module.exports = AdapterManager;
