# PRD：代订订单管理模块

> 文档版本：v1.0  
> 创建时间：2026-03-06  
> 归属项目：PriceWatcher Dashboard（前端）+ PriceWatcher API（后端）  
> 状态：待开发

---

## 一、模块定位

在现有 PriceWatcher Dashboard 基础上，新增**酒店代订订单管理**功能，将 Dashboard 从"价格监控工具"升级为"代订业务全流程管理系统"。

**核心目标：**
- 记录每一笔代订订单的完整信息（来源、成本、售价、积分、收益）
- 追踪预授权押金的冻结与退回，防止漏退
- 多维度数据统计分析，掌握业务收益结构
- 结合参谋长 Agent 调研，给出后续代订方向建议

---

## 二、订单来源

| 来源 | 说明 | 优先级 |
|------|------|--------|
| **闲鱼 Agent 自动创建** | 闲鱼售前 Agent 在对话中识别订单信息，自动调用 API 创建订单草稿 | P1 |
| **Dashboard 手动录入** | 管理员在 Dashboard 页面逐条填写创建 | P1 |

---

## 三、订单字段定义

### 3.1 基本信息

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 自动生成 | UUID |
| `createdAt` | string | 自动生成 | 创建时间 ISO8601 |
| `updatedAt` | string | 自动生成 | 最后更新时间 |
| `status` | enum | ✅ | 订单状态（见下） |
| `source` | enum | ✅ | 来源：`xianyu`（闲鱼）/ `manual`（手动） |
| `orderType` | enum | ✅ | 代订类型（见下） |
| `note` | string | - | 备注，自由文本 |

**订单状态（status）：**
- `pending` — 待确认
- `booked` — 已出票
- `completed` — 已完成
- `cancelled` — 已取消

**代订类型（orderType）：**
- `self_run` — 自己跑的
- `wife_run` — 老婆跑的
- `guest_booking` — 客名预定
- `peer_referral` — 同行派单
- `milestone_rebate` — 里程碑回血
- `cancelled` — 已取消
- `self_stay` — 自己入住
- `buy_points` — 购买积分
- `points_cash` — 积分变现
- `group_swipe` — 集团刷房
- `voucher_cash` — 房券变现

> 所有类型字段结构统一，orderType 仅作分类标签使用，不影响计算逻辑。

---

### 3.2 客户信息

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `customerName` | string | ✅ | 客户姓名 |
| `customerContact` | string | ✅ | 联系方式（手机/微信/闲鱼 ID） |
| `customerNeeds` | string | - | 客户需求（自由文本，记录特殊要求） |

---

### 3.3 酒店信息

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `city` | string | ✅ | 城市 |
| `hotelGroup` | string | ✅ | 酒店集团（如：万豪、希尔顿、洲际、凯悦、雅高、华住、锦江…） |
| `hotelName` | string | ✅ | 酒店名称 |
| `roomType` | string | ✅ | 房型名称 |
| `checkIn` | string | ✅ | 入住日期 YYYY-MM-DD |
| `checkOut` | string | ✅ | 退房日期 YYYY-MM-DD |
| `nights` | number | 自动计算 | 晚数（checkOut - checkIn） |
| `bookingMethod` | string | - | 预定方式（纯文本，自记录用） |

---

### 3.4 财务信息

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `costPrice` | number | ✅ | 代订成本价（实际支付给酒店的价格，元） |
| `salePrice` | number | ✅ | 售价（向客户收取的价格，元） |
| `cashProfit` | number | 自动计算 | 现金利润 = salePrice - costPrice |
| `preAuth` | number | - | 预授权金额（入住时酒店冻结的押金，元） |
| `preAuthRefund` | number | - | 预授权退款金额（退房后退回的金额，元） |
| `preAuthStatus` | enum | - | 预授权状态：`pending`（未退）/ `partial`（部分退）/ `refunded`（已全退） |
| `pointsEarned` | number | - | 获得积分数量 |
| `pointsValue` | number | - | 积分价值（元），各酒店集团计算公式不同，手动填写换算后金额 |
| `totalRevenue` | number | 自动计算 | 总收益 = cashProfit + pointsValue |

> **预授权说明：** 记录预授权主要用于核对——确认退房后预授权是否已退回、退回金额是否正确。`preAuthRefund` 填写后与 `preAuth` 对比，若有差额系统高亮提示。

> **积分价值说明：** 因各酒店集团兑换比例不同（如万豪积分与希尔顿积分价值差异大），由用户在录入时手动填写换算后的人民币价值，系统不内置换算公式。

---

## 四、页面结构

### 4.1 新增路由

```
/orders             订单列表页
/orders/new         新建订单页
/orders/:id         订单详情页
/orders/:id/edit    编辑订单页
/analytics          数据统计分析页
```

---

### 4.2 订单列表页（`/orders`）

**顶部统计卡片（5格）：**

| 指标 | 计算方式 |
|------|---------|
| 本月订单数 | 当月 status != cancelled 的订单总数 |
| 本月总收益 | 当月 totalRevenue 之和 |
| 本月现金利润 | 当月 cashProfit 之和 |
| 本月积分价值 | 当月 pointsValue 之和 |
| 待退预授权 | preAuthStatus = pending 的订单数 |

**筛选栏：**
- 搜索（客户名/酒店名）
- 订单状态
- 代订类型
- 城市
- 酒店集团
- 入住日期范围
- 是否有未退预授权

**表格列：**

| 列 | 内容 |
|----|------|
| 客户 | 姓名 + 联系方式 |
| 代订类型 | Tag |
| 酒店 | 酒店名 + 城市 + 集团 |
| 入住日期 | checkIn → checkOut（N晚） |
| 成本/售价 | ¥成本 / ¥售价 |
| 总收益 | ¥N（现金+积分） |
| 预授权 | 金额 + 状态 Tag（未退/已退） |
| 订单状态 | Tag |
| 操作 | 查看 / 编辑 / 删除 |

---

### 4.3 新建/编辑订单页（`/orders/new`，`/orders/:id/edit`）

- 表单分区块：基本信息 / 客户信息 / 酒店信息 / 财务信息
- `cashProfit` 和 `totalRevenue` 实时自动计算展示（不可手动编辑）
- `nights` 根据日期自动计算
- `preAuthStatus` 根据 preAuth 和 preAuthRefund 自动判断并提示

---

### 4.4 订单详情页（`/orders/:id`）

- 完整字段展示
- 预授权核对提示：若 `preAuth > 0` 且 `preAuthStatus != refunded`，顶部显示橙色提醒条
- 操作：编辑 / 删除 / 复制订单（快速创建相似订单）

---

### 4.5 数据统计分析页（`/analytics`）

#### 收益概览
- 月收益走势折线图（现金利润 vs 积分价值，可切换近3月/6月/12月）
- 本年 vs 上年同期对比

#### 按城市分析
- 各城市订单数 + 总收益柱状图
- 各城市平均每单利润

#### 按酒店/房型分析
- 代订量 Top 10 酒店
- 收益 Top 10 酒店
- 利润率 Top 10 房型

#### 按酒店集团分析
- 各集团：订单数 / 总收益 / 现金利润 / 积分价值 / 平均每单收益
- 积分获取量 Top 集团

#### 按代订类型分析
- 各类型订单占比（饼图）
- 各类型平均收益

#### 预授权追踪
- 待退预授权金额汇总
- 预授权超时未退列表（入住超 7 天仍未退的）

---

## 五、数据统计分析说明

### 5.1 利润率计算

```
利润率 = cashProfit / salePrice × 100%
综合收益率 = totalRevenue / salePrice × 100%
```

### 5.2 方向建议逻辑（结合参谋长 Agent）

**系统侧（数据分析）提供：**
- 利润率 > 20% 的城市/酒店集团列表
- 近 3 个月订单量增长最快的类型
- 高频复购客户列表

**参谋长 Agent 侧提供：**
- 市场调研结论（竞争情况、需求趋势）
- 特定酒店集团的积分政策变化

**融合输出（由 Agent 综合生成建议报告）：**
- 重点监控城市/酒店推荐
- 代订类型结构调整建议
- 下一阶段重点开拓方向

> 参谋长 Agent 已存在，接入时机待确定，届时与本模块数据分析结果对接。

---

## 六、API 设计（新增）

以下接口在 `pricewatcher-api` 中新增，路由前缀 `/api/orders`：

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/orders` | GET | 订单列表（分页+筛选） |
| `/api/orders` | POST | 创建订单 |
| `/api/orders/:id` | GET | 订单详情 |
| `/api/orders/:id` | PUT | 更新订单 |
| `/api/orders/:id` | DELETE | 删除订单 |
| `/api/orders/analytics/summary` | GET | 统计概览数据 |
| `/api/orders/analytics/monthly` | GET | 月度收益趋势 |
| `/api/orders/analytics/by-city` | GET | 按城市统计 |
| `/api/orders/analytics/by-group` | GET | 按酒店集团统计 |
| `/api/orders/analytics/by-type` | GET | 按代订类型统计 |
| `/api/orders/pre-auth/pending` | GET | 待退预授权列表 |

**数据存储：** 新增 `orders.json` 文件（与 state.json 同级），由 `OrderService` 封装读写。

---

## 七、闲鱼 Agent 自动创建订单（待确认）

**背景：** 闲鱼售前 Agent 在与客户对话结束后，自动识别订单信息并调用 `POST /api/orders` 创建草稿订单（status=pending）。

**Agent 需识别的字段：**
- 客户昵称 / 联系方式
- 酒店名 / 城市 / 入住退房日期 / 房型
- 客户需求（特殊要求）
- 售价（若已谈定）

**创建后：** Dashboard 订单列表出现该草稿，管理员补充财务信息后确认。

**待确认：** 闲鱼 Agent 接入后联调。

---

## 八、非功能需求

| 项目 | 要求 |
|------|------|
| 数据存储 | `orders.json` 单文件，OrderService 封装（与现有 FileService 同模式） |
| 认证 | 复用现有 JWT 鉴权，无需额外处理 |
| 数据隔离 | 订单数据与监控任务数据完全独立，不共用文件 |
