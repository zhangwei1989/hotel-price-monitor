/**
 * 监控服务
 */

const CtripAPI = require('../api/ctrip');
const FeishuAPI = require('../api/feishu');

class MonitorService {
  constructor(config) {
    this.ctripAPI = new CtripAPI(config.ctrip.apiKey, config.ctrip.apiSecret);
    this.feishuAPI = new FeishuAPI(config.feishu.appId, config.feishu.appSecret);
    this.config = config;
  }

  /**
   * 执行单个监控任务
   * @param {Object} task - 监控任务
   */
  async executeTask(task) {
    const {
      hotelId,
      hotelName,
      roomTypeId,
      roomTypeName,
      checkInDate,
      checkOutDate,
      threshold,
      notifyTarget
    } = task;

    console.log(`[监控] 检查 ${hotelName} - ${roomTypeName} @ ${checkInDate}`);

    // 1. 查询携程价格
    const priceResult = await this.ctripAPI.queryPrice({
      hotelId,
      roomTypeId,
      checkInDate,
      checkOutDate
    });

    if (!priceResult.success) {
      console.error(`[监控] 价格查询失败:`, priceResult.error);
      return { success: false, error: priceResult.error };
    }

    const { price, available } = priceResult.data;

    console.log(`[监控] 当前价格: ¥${price}, 阈值: ¥${threshold}, 可订: ${available}`);

    // 2. 判断是否触发告警
    if (available && price > 0 && price <= threshold) {
      console.log(`[监控] 🎉 触发告警! 价格 ¥${price} <= 阈值 ¥${threshold}`);

      // 3. 发送飞书通知
      await this.feishuAPI.sendPriceAlert({
        userId: notifyTarget,
        hotelName,
        roomTypeName,
        checkInDate,
        currentPrice: price,
        threshold
      });

      return {
        success: true,
        triggered: true,
        price
      };
    }

    return {
      success: true,
      triggered: false,
      price
    };
  }

  /**
   * 从飞书多维表格加载任务列表
   */
  async loadTasksFromFeishu() {
    const { appToken, tableId } = this.config.feishu.table;

    const result = await this.feishuAPI.getTableRecords(appToken, tableId);

    if (!result.success) {
      console.error('加载任务失败:', result.error);
      return [];
    }

    // 解析表格数据为任务对象
    return result.records
      .filter(record => record.fields['状态'] === '监控中')
      .map(record => ({
        recordId: record.record_id,
        hotelId: record.fields['酒店ID'],
        hotelName: record.fields['酒店名称'],
        roomTypeId: record.fields['房型ID'],
        roomTypeName: record.fields['房型名称'],
        checkInDate: record.fields['监控日期'],
        checkOutDate: record.fields['离店日期'] || this.getNextDay(record.fields['监控日期']),
        threshold: record.fields['价格阈值'],
        notifyTarget: record.fields['通知对象']
      }));
  }

  /**
   * 更新飞书表格中的价格数据
   */
  async updateTaskPrice(recordId, price) {
    const { appToken, tableId } = this.config.feishu.table;

    return this.feishuAPI.updateTableRecord(appToken, tableId, recordId, {
      '当前价格': price,
      '最后更新时间': new Date().toISOString()
    });
  }

  /**
   * 批量执行监控任务
   */
  async runAll() {
    console.log('[监控] 开始批量监控...');

    const tasks = await this.loadTasksFromFeishu();
    console.log(`[监控] 加载 ${tasks.length} 个任务`);

    const results = [];

    for (const task of tasks) {
      const result = await this.executeTask(task);
      results.push(result);

      // 更新表格价格
      if (result.success && result.price) {
        await this.updateTaskPrice(task.recordId, result.price);
      }

      // 避免请求过快
      await this.sleep(2000);
    }

    console.log('[监控] 批量监控完成');
    return results;
  }

  getNextDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MonitorService;
