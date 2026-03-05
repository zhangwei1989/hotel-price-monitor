/**
 * 适配器管理器
 * 负责多数据源的调度、降级和健康检查
 */

const CtripAdapter = require('./CtripAdapter');

class AdapterManager {
  constructor(config) {
    this.config = config;
    this.adapters = {};
    this.stats = {}; // 各适配器成功率统计

    this._initAdapters();
  }

  _initAdapters() {
    // 携程适配器（主力）
    this.adapters['ctrip'] = new CtripAdapter({
      gatewayUrl: this.config.gatewayUrl,
      gatewayToken: this.config.gatewayToken
    });

    // 初始化统计
    for (const name of Object.keys(this.adapters)) {
      this.stats[name] = { success: 0, fail: 0, lastError: null };
    }
  }

  /**
   * 根据任务的 provider 字段选择适配器
   * 如果主适配器失败，自动降级
   */
  async queryPrice(task) {
    const provider = task.provider || 'ctrip';
    const adapter = this.adapters[provider];

    if (!adapter) {
      return { success: false, error: `未知适配器: ${provider}` };
    }

    try {
      const result = await adapter.queryPrice(task);

      if (result.success) {
        this.stats[provider].success++;
      } else {
        this.stats[provider].fail++;
        this.stats[provider].lastError = result.error;
      }

      return result;
    } catch (err) {
      this.stats[provider].fail++;
      this.stats[provider].lastError = err.message;
      return { success: false, error: err.message };
    }
  }

  /**
   * 获取各适配器健康状态
   */
  getHealthReport() {
    const report = {};
    for (const [name, stat] of Object.entries(this.stats)) {
      const total = stat.success + stat.fail;
      report[name] = {
        successRate: total > 0 ? ((stat.success / total) * 100).toFixed(1) + '%' : 'N/A',
        success: stat.success,
        fail: stat.fail,
        lastError: stat.lastError
      };
    }
    return report;
  }
}

module.exports = AdapterManager;
