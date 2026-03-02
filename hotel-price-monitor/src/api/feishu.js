/**
 * 飞书 API 封装
 */

const lark = require('@larksuiteoapi/node-sdk');

class FeishuAPI {
  constructor(appId, appSecret) {
    this.client = new lark.Client({
      appId,
      appSecret,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu
    });
  }

  /**
   * 发送消息卡片
   * @param {string} userId - 用户 open_id
   * @param {Object} cardData - 卡片数据
   */
  async sendCard(userId, cardData) {
    try {
      const res = await this.client.im.message.create({
        data: {
          receive_id: userId,
          msg_type: 'interactive',
          content: JSON.stringify(cardData)
        },
        params: {
          receive_id_type: 'open_id'
        }
      });

      return {
        success: res.code === 0,
        messageId: res.data?.message_id
      };
    } catch (error) {
      console.error('飞书消息发送失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送价格告警卡片
   */
  async sendPriceAlert({ userId, hotelName, roomTypeName, checkInDate, currentPrice, threshold }) {
    const card = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: {
          content: '🎉 价格触发提醒',
          tag: 'plain_text'
        },
        template: 'orange'
      },
      elements: [
        {
          tag: 'div',
          text: {
            content: `**酒店**: ${hotelName}\n**房型**: ${roomTypeName}\n**日期**: ${checkInDate}\n**当前价格**: ¥${currentPrice}\n**设定阈值**: ¥${threshold}\n**低于阈值**: ¥${threshold - currentPrice}`,
            tag: 'lark_md'
          }
        },
        {
          tag: 'hr'
        },
        {
          tag: 'note',
          elements: [
            {
              tag: 'plain_text',
              content: `更新时间: ${new Date().toLocaleString('zh-CN')}`
            }
          ]
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                content: '前往预订',
                tag: 'plain_text'
              },
              type: 'primary',
              url: 'https://www.ctrip.com'
            }
          ]
        }
      ]
    };

    return this.sendCard(userId, card);
  }

  /**
   * 读取多维表格数据
   * @param {string} appToken - 多维表格 app_token
   * @param {string} tableId - 表格 ID
   */
  async getTableRecords(appToken, tableId) {
    try {
      const res = await this.client.bitable.appTableRecord.list({
        path: {
          app_token: appToken,
          table_id: tableId
        },
        params: {
          page_size: 100
        }
      });

      return {
        success: res.code === 0,
        records: res.data?.items || []
      };
    } catch (error) {
      console.error('读取表格失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新多维表格记录
   */
  async updateTableRecord(appToken, tableId, recordId, fields) {
    try {
      const res = await this.client.bitable.appTableRecord.update({
        path: {
          app_token: appToken,
          table_id: tableId,
          record_id: recordId
        },
        data: {
          fields
        }
      });

      return { success: res.code === 0 };
    } catch (error) {
      console.error('更新表格失败:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = FeishuAPI;
