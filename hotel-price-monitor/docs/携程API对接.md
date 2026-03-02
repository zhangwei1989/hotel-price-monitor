# 携程 API 对接指南

## 携程开放平台注册

⚠️ **重要提示**: 携程的 API 访问需要企业认证和商务合作

### 第一步:申请成为合作伙伴

1. 访问 [携程开放平台](https://open.ctrip.com) (可能需要企业资质)
2. 注册企业账号
3. 提交合作申请
4. 等待审核(可能需要数天到数周)

### 第二步:获取 API 凭证

审核通过后,在控制台获取:
- **API Key** (App Key)
- **API Secret** (App Secret)

## API 文档参考

携程酒店 API 通常包含以下接口:

### 1. 酒店搜索 API
```http
POST /hotel/search
Content-Type: application/json

{
  "keyword": "上海外滩",
  "cityId": "2",
  "checkInDate": "2026-03-15",
  "checkOutDate": "2026-03-16"
}
```

### 2. 酒店详情 API
```http
GET /hotel/detail/{hotelId}
```

### 3. 房型价格查询 API
```http
POST /hotel/price/query
Content-Type: application/json

{
  "hotelId": "12345",
  "roomTypeId": "67890",
  "checkInDate": "2026-03-15",
  "checkOutDate": "2026-03-16",
  "timestamp": 1709088000,
  "signature": "xxx"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "hotelId": "12345",
    "roomTypeId": "67890",
    "price": 588,
    "currency": "CNY",
    "available": true,
    "inventory": 5,
    "breakfast": "双早",
    "cancelPolicy": "免费取消"
  }
}
```

## 签名算法

携程 API 通常需要签名验证,步骤如下:

### 示例实现

```javascript
const crypto = require('crypto');

function generateSignature(params, apiSecret) {
  // 1. 参数排序
  const sortedKeys = Object.keys(params).sort();
  
  // 2. 拼接字符串
  let signStr = '';
  sortedKeys.forEach(key => {
    signStr += `${key}${params[key]}`;
  });
  
  // 3. 添加 Secret
  signStr += apiSecret;
  
  // 4. MD5 加密
  const signature = crypto
    .createHash('md5')
    .update(signStr)
    .digest('hex')
    .toUpperCase();
  
  return signature;
}

// 使用示例
const params = {
  hotelId: '12345',
  checkInDate: '2026-03-15',
  timestamp: Date.now(),
  apiKey: 'your_api_key'
};

const signature = generateSignature(params, 'your_api_secret');
```

## 替代方案:爬虫方式

如果无法获取官方 API 访问权限,可以考虑:

### 方案 A: 使用 Puppeteer 爬取价格

```javascript
const puppeteer = require('puppeteer');

async function getHotelPrice(hotelId, checkInDate) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // 访问携程酒店页面
  await page.goto(`https://hotels.ctrip.com/hotel/${hotelId}.html`);
  
  // 设置日期
  await page.type('#startDate', checkInDate);
  
  // 等待价格加载
  await page.waitForSelector('.price');
  
  // 提取价格
  const price = await page.$eval('.price', el => {
    return parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
  });
  
  await browser.close();
  return price;
}
```

### 方案 B: 使用第三方聚合 API

部分数据服务商提供酒店价格聚合 API:
- 快速数据 (RapidAPI)
- 飞猪开放平台
- 同程艺龙 API

### 方案 C: RSS/邮件监控

如果携程提供价格变动邮件提醒,可以:
1. 订阅携程价格提醒邮件
2. 监控邮箱,解析邮件内容
3. 提取价格信息触发飞书通知

## 注意事项

### 法律合规
- 爬虫方式需遵守携程的 robots.txt
- 控制请求频率,避免被封禁
- 不要用于商业转售

### 技术限制
- 携程可能有反爬机制
- 页面结构可能变化,需定期维护
- 建议使用代理 IP 池

### 推荐方案
1. **最佳**: 申请官方 API 访问权限
2. **次选**: 使用第三方聚合 API
3. **备选**: 合规的爬虫方式

## 测试数据

在开发阶段,可以先用 Mock 数据:

```javascript
// src/api/ctrip.js (Mock 模式)
async queryPrice({ hotelId, roomTypeId, checkInDate }) {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 返回模拟数据
  return {
    success: true,
    data: {
      hotelId,
      roomTypeId,
      price: Math.floor(Math.random() * 500) + 400, // 400-900随机价格
      currency: 'CNY',
      available: Math.random() > 0.1, // 90% 可订
      timestamp: new Date().toISOString()
    }
  };
}
```

## 联系方式

如需协助对接携程 API,可以:
1. 咨询携程开放平台客服
2. 寻找有经验的第三方开发商
3. 考虑使用现成的酒店价格监控服务

---

**下一步**: 完成携程 API 对接后,更新 `src/api/ctrip.js` 中的实现。
