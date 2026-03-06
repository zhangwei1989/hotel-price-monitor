# 开发任务：代订订单管理模块

> 关联 PRD：`docs/PRD-order-management.md`  
> 最后更新：2026-03-06  
> 状态图例：✅ 已完成 | 🚧 进行中 | ❌ 未开始

---

## 后端任务（pricewatcher-api）

### P1 高优先级

---

#### ✅ TASK-ORDER-API-01：OrderService + orders.json 数据层

**内容：**
- 新建 `src/services/OrderService.ts`
- 新建 `orders.json`（与 state.json 同级）
- 实现方法：`listOrders(filter)` / `getOrder(id)` / `createOrder(data)` / `updateOrder(id, data)` / `deleteOrder(id)`
- 自动计算字段：`nights`、`cashProfit`、`totalRevenue`、`preAuthStatus`

**自动计算规则：**
```
nights = checkOut - checkIn（天数）
cashProfit = salePrice - costPrice
totalRevenue = cashProfit + (pointsValue ?? 0)
preAuthStatus:
  preAuth == 0 或未填 → 不适用（null）
  preAuthRefund == 0 → "pending"
  preAuthRefund < preAuth → "partial"
  preAuthRefund >= preAuth → "refunded"
```

**估时：** 3 小时

---

#### ✅ TASK-ORDER-API-02：订单 CRUD 路由

**文件：** `src/routes/orders.ts`

**接口：**
```
GET    /api/orders          列表（分页+筛选）
POST   /api/orders          创建
GET    /api/orders/:id      详情
PUT    /api/orders/:id      更新
DELETE /api/orders/:id      删除
```

**筛选参数：**
- `q`：搜索客户名/酒店名
- `status`：订单状态
- `orderType`：代订类型
- `city`：城市
- `hotelGroup`：酒店集团
- `checkInFrom` / `checkInTo`：入住日期范围
- `preAuthPending`：boolean，筛选待退预授权
- `page` / `pageSize`：分页

**估时：** 2 小时

---

#### ✅ TASK-ORDER-API-03：统计分析路由

**文件：** `src/routes/order-analytics.ts`

**接口：**
```
GET /api/orders/analytics/summary     概览统计
GET /api/orders/analytics/monthly     月度收益趋势（近12个月）
GET /api/orders/analytics/by-city     按城市统计
GET /api/orders/analytics/by-group    按酒店集团统计
GET /api/orders/analytics/by-type     按代订类型统计
GET /api/orders/pre-auth/pending      待退预授权列表
```

**summary 响应：**
```json
{
  "thisMonth": {
    "orderCount": 12,
    "totalRevenue": 8800,
    "cashProfit": 6200,
    "pointsValue": 2600,
    "preAuthPending": 3
  },
  "allTime": {
    "orderCount": 86,
    "totalRevenue": 52000
  }
}
```

**估时：** 3 小时

---

#### ✅ TASK-ORDER-API-04：注册路由到 app.ts

**内容：**
- 在 `src/app.ts` 中引入并挂载 orders 和 order-analytics 路由
- 确认 JWT 中间件覆盖所有 `/api/orders/*` 路由

**估时：** 30 分钟

---

### P2 中优先级

---

#### TASK-ORDER-API-05：预授权超时提醒

**逻辑：** 入住日期 + 7 天后，若 `preAuthStatus != "refunded"`，在 `/api/orders/pre-auth/pending` 响应中标记 `overdue: true`

**估时：** 1 小时

---

#### ✅ TASK-ORDER-API-06：订单导出

**接口：** `GET /api/orders/export?format=json`  
**内容：** 导出所有订单（或按筛选条件），不含自动计算字段的冗余，保留原始字段  
**响应头：** `Content-Disposition: attachment; filename="orders-2026-03.json"`

**估时：** 1 小时

---

## 前端任务（pricewatcher-dashboard）

### P1 高优先级

---

#### TASK-ORDER-DASH-01：订单相关 API 封装

**文件：** `src/api/orders.ts`

```typescript
export async function fetchOrders(params?: any)
export async function createOrder(data: any)
export async function fetchOrder(id: string)
export async function updateOrder(id: string, data: any)
export async function deleteOrder(id: string)
export async function fetchOrderSummary()
export async function fetchMonthlyTrend()
export async function fetchByCity()
export async function fetchByGroup()
export async function fetchByType()
export async function fetchPreAuthPending()
```

**估时：** 1 小时

---

#### TASK-ORDER-DASH-02：订单列表页（`/orders`）

**内容：**
- 顶部 5 格统计卡片（本月订单数/总收益/现金利润/积分价值/待退预授权数）
- 筛选栏（搜索/状态/类型/城市/集团/日期范围/预授权状态）
- 表格（含所有列，待退预授权橙色高亮）
- 分页
- 右上角「+ 新建订单」按钮

**路由：** 在 `main.tsx` 注册 `/orders`

**估时：** 4 小时

---

#### TASK-ORDER-DASH-03：新建/编辑订单表单（`/orders/new`，`/orders/:id/edit`）

**表单分四个区块：**

```
【基本信息】
  代订类型*（下拉，枚举值）
  订单状态*（下拉）
  来源（自动填入 manual）
  备注

【客户信息】
  客户姓名*
  联系方式*
  客户需求

【酒店信息】
  城市*
  酒店集团*（下拉，常用集团预设 + 自由输入）
  酒店名称*
  房型*
  入住日期*（禁选过去）
  退房日期*（禁选 <= 入住日期）
  晚数（自动计算，只读展示）
  预定方式（纯文本）

【财务信息】
  代订成本价*（¥ 数字）
  售价*（¥ 数字）
  现金利润（自动计算，只读）
  预授权（¥ 数字，可选）
  预授权退款（¥ 数字，可选）
  预授权状态（自动判断，只读）
  获得积分（数字，可选）
  积分价值（¥ 数字，可选）
  总收益（自动计算，只读）
```

**酒店集团预设选项：** 万豪、希尔顿、洲际、凯悦、雅高、华住、锦江、首旅如家、美高梅、其他

**估时：** 5 小时

---

#### ✅ TASK-ORDER-DASH-04：订单详情页（`/orders/:id`）

**内容：**
- 完整字段分区展示
- 顶部预授权提醒条（preAuthStatus = pending/partial 时橙色显示）
- 操作按钮：编辑 / 删除（确认） / 复制订单
- 复制订单：预填所有字段（除 id/createdAt），跳转新建页

**估时：** 3 小时

---

#### TASK-ORDER-DASH-05：Header 导航更新

**内容：** AppLayout Header 增加导航链接

```
[PriceWatcher Logo]   监控任务   订单管理   数据分析   [退出]
```

**估时：** 30 分钟

---

### P2 中优先级

---

#### TASK-ORDER-DASH-06：数据统计分析页（`/analytics`）

**内容：**

区块一：收益概览
- 月收益走势折线图（现金利润 + 积分价值，两条线，Recharts）
- 时间范围切换：近3月 / 近6月 / 近12月

区块二：城市分析
- 各城市订单数 + 总收益柱状图

区块三：酒店集团分析
- 表格：集团名 / 订单数 / 总收益 / 现金利润 / 积分价值 / 平均每单收益
- 按总收益排序

区块四：代订类型分析
- 饼图：各类型订单占比
- 表格：各类型平均每单收益

区块五：预授权追踪
- 待退列表：客户名 / 酒店 / 入住日期 / 预授权金额 / 状态 / 是否超时（红色标记）

**估时：** 6 小时

---

#### TASK-ORDER-DASH-07：方向建议区块（`/analytics` 页底部）

**内容：**
- 系统自动生成：利润率 Top 5 城市、Top 5 酒店集团、增长最快代订类型
- 参谋长 Agent 建议接入口（预留，显示"参谋长建议：待接入"占位）

**估时：** 2 小时（不含参谋长 Agent 接入）

---

### P3 低优先级

---

#### TASK-ORDER-DASH-08：闲鱼 Agent 自动创建订单接入

**内容：** 闲鱼售前 Agent 在对话结束后，调用 `POST /api/orders` 创建草稿订单（source=xianyu, status=pending）

**前提：** 闲鱼 Agent 开发完成后联调

**估时：** 2 小时（联调）

---

#### TASK-ORDER-DASH-09：参谋长 Agent 建议接入

**内容：** 参谋长 Agent 调研完成后，将结论写入指定位置（飞书文档/JSON），analytics 页读取并展示

**前提：** 参谋长 Agent 完成酒店市场调研工作后接入

**估时：** 待定（依赖参谋长 Agent 输出格式确认）

---

## 建议开发顺序

```
后端：
TASK-ORDER-API-01（数据层）
  → TASK-ORDER-API-02（CRUD 路由）
  → TASK-ORDER-API-03（统计分析路由）
  → TASK-ORDER-API-04（注册路由）
  → TASK-ORDER-API-05（预授权超时）
  → TASK-ORDER-API-06（导出）

前端：
TASK-ORDER-DASH-01（API 封装）
  → TASK-ORDER-DASH-05（Header 导航）
  → TASK-ORDER-DASH-02（列表页）
  → TASK-ORDER-DASH-03（新建/编辑表单）
  → TASK-ORDER-DASH-04（详情页）
  → TASK-ORDER-DASH-06（统计分析页）
  → TASK-ORDER-DASH-07（方向建议区块）
  → P3 按需
```

**后端先行，前端并行跟进，联调节点在 TASK-ORDER-API-04 完成后。**
