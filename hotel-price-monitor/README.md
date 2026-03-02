# 酒店价格监控系统

## 项目概述
监控携程酒店价格,当价格低于阈值时通过飞书通知

## 技术栈
- 后端: Node.js + Express
- 数据库: PostgreSQL / MongoDB (可选)
- 任务调度: node-cron
- 飞书集成: @larksuiteoapi/node-sdk

## 目录结构
```
hotel-price-monitor/
├── src/
│   ├── api/
│   │   ├── ctrip.js         # 携程 API 封装
│   │   └── feishu.js        # 飞书 API 封装
│   ├── services/
│   │   ├── monitor.js       # 监控逻辑
│   │   └── notification.js  # 通知服务
│   ├── routes/
│   │   └── price.js         # 价格查询路由
│   └── app.js               # 主应用
├── config/
│   └── default.json         # 配置文件
└── package.json
```

## 环境变量
```env
# 携程 API
CTRIP_API_KEY=your_key
CTRIP_API_SECRET=your_secret

# 飞书配置
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_WEBHOOK_URL=https://open.feishu.cn/...

# 服务配置
PORT=3000
NODE_ENV=production
```

## 快速开始
```bash
npm install
npm run dev
```

## API 接口

### 1. 查询价格
```
POST /api/price/check
Content-Type: application/json

{
  "hotelId": "12345",
  "roomTypeId": "67890",
  "checkInDate": "2026-03-15",
  "checkOutDate": "2026-03-16"
}
```

### 2. 添加监控任务
```
POST /api/monitor/add
{
  "hotelId": "12345",
  "hotelName": "上海外滩W酒店",
  "roomTypeId": "67890",
  "roomTypeName": "豪华大床房",
  "checkInDate": "2026-03-15",
  "threshold": 650,
  "notifyTarget": "ou_xxx"
}
```

### 3. 获取监控任务列表
```
GET /api/monitor/list
```

## 飞书集成方案

### 方案 A: 多维表格 + 自动化
1. 创建飞书多维表格存储监控任务
2. 使用飞书自动化定时调用 /api/price/check
3. 比对阈值后触发飞书消息推送

### 方案 B: 服务端定时任务
1. 使用 node-cron 定时扫描任务
2. 主动查询携程价格
3. 更新飞书表格 + 发送通知

## 部署建议
- 阿里云 / 腾讯云轻量服务器
- Docker 容器化部署
- Nginx 反向代理
- PM2 进程管理

## 下一步开发
- [ ] 携程 API 对接
- [ ] 飞书多维表格集成
- [ ] 价格监控定时任务
- [ ] 消息卡片模板优化
- [ ] 价格趋势图表
- [ ] 多酒店批量监控
