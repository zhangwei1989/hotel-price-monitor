# PRD：PriceWatcher API（后端服务）

> 文档版本：v1.0  
> 创建时间：2026-03-06  
> 项目路径：`/Users/zhangwei/.easyclaw/workspace/pricewatcher-api`  
> 端口：`3001`

---

## 一、项目定位

PriceWatcher API 是整个价格监控系统的**数据服务层**，负责：

- 持久化管理所有监控任务（CRUD）
- 对外暴露 RESTful API，供 Dashboard 前端和 Heartbeat Agent 调用
- 提供身份认证（JWT）
- 聚合统计摘要数据

它**不负责**实际的价格抓取（由 EasyClaw Agent 通过 browser 工具完成），也不负责飞书通知（由 Agent 发送）。

---

## 二、系统架构角色

```
EasyClaw Heartbeat Agent
    ↓ 读/写
ctrip-monitor-state.json ←──→ PriceWatcher API（3001）←── Dashboard（5173）
    ↑ 写入价格
EasyClaw Sub-agent（价格抓取）
```

**数据源：** `ctrip-monitor-state.json`（单文件 JSON 数据库）

---

## 三、功能需求

### 3.1 身份认证

| 接口 | 方法 | 描述 | 状态 |
|------|------|------|------|
| `/api/auth/login` | POST | 用户名+密码换取 JWT Token | ✅ 已完成 |
| `/api/auth/verify` | GET | 验证 Token 有效性 | ✅ 已完成 |

**说明：**
- 单用户（admin）模式，密码 bcrypt 哈希存储于 `pricewatcher-auth.json`
- Token 有效期 7 天，过期自动跳转登录页
- 登录失败锁定机制（连续 5 次后锁定 15 分钟）

---

### 3.2 任务管理

| 接口 | 方法 | 描述 | 状态 |
|------|------|------|------|
| `/api/tasks` | GET | 获取任务列表（分页+多条件筛选+排序） | ✅ 已完成 |
| `/api/tasks/:id` | GET | 获取单个任务详情（含价格历史） | ✅ 已完成 |
| `/api/tasks` | POST | 创建新监控任务 | ✅ 已完成 |
| `/api/tasks/:id` | PUT | 全量更新任务 | ✅ 已完成 |
| `/api/tasks/:id` | DELETE | 删除任务 | ✅ 已完成 |

**任务字段结构（MonitorTask）：**

```typescript
{
  id: string                  // UUID
  type: string                // "hotel"
  provider: string            // "ctrip"
  hotelName: string           // 酒店名称
  hotelId: string             // 携程酒店 ID
  city: string                // 城市
  checkIn: string             // 入住日期 YYYY-MM-DD
  checkOut: string            // 退房日期 YYYY-MM-DD
  nights: number              // 晚数
  roomName: string            // 房型名称
  ratePlanHint: string        // 价格方案提示（如"不含早"）
  currency: string            // "CNY"
  threshold: {
    type: "absolute"          // 固定价格阈值
    value: number             // 目标价格（元）
  }
  frequencyMinutes: number    // 检查频率（分钟，最小 10）
  autoStopDate: string        // 自动停止日期 YYYY-MM-DD
  link: string                // 携程页面链接
  enabled: boolean            // 是否启用
  createdAt: string           // 创建时间 ISO8601
  lastCheckedAt: string       // 上次检查时间
  lastPrice: number | null    // 上次检查价格
  lastStatus: string          // "ok" | "error" | "pending"
  pausedAt: string | null     // 暂停时间
  currentPriceOptions: Array<{ price: number, description: string }>
  history: Array<{
    ts: string                // ISO8601
    price: number | null
    triggered: boolean        // 是否触发通知
    note: string
  }>
}
```

**列表筛选参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `city` | string | 精确匹配城市 |
| `hotelName` | string | 模糊搜索酒店名/房型名 |
| `status` | string | lastStatus 筛选 |
| `enabled` | boolean | 是否启用 |
| `checkInFrom` / `checkInTo` | string | 入住日期范围 |
| `currentPriceMin` / `currentPriceMax` | number | 当前价格范围 |
| `belowTarget` | boolean | 是否已低于目标价 |
| `sortBy` | string | `checkIn` / `lastPrice` / `lastCheckedAt` / `createdAt` |
| `sortOrder` | string | `asc` / `desc` |
| `page` / `pageSize` | number | 分页（默认 page=1, pageSize=20） |

---

### 3.3 任务操作

| 接口 | 方法 | 描述 | 状态 |
|------|------|------|------|
| `/api/task-actions/:id/pause` | POST | 暂停任务 | ✅ 已完成 |
| `/api/task-actions/:id/resume` | POST | 恢复任务 | ✅ 已完成 |
| `/api/task-actions/:id/check-now` | POST | 立即检查（重置 lastCheckedAt） | ✅ 已完成 |
| `/api/task-actions/:id/threshold` | PATCH | 修改目标价 | ✅ 已完成 |
| `/api/task-actions/:id/frequency` | PATCH | 修改检查频率 | ✅ 已完成 |
| `/api/task-actions/batch/pause` | POST | 批量暂停 | ✅ 已完成 |
| `/api/task-actions/batch/resume` | POST | 批量恢复 | ✅ 已完成 |
| `/api/task-actions/stats/summary` | GET | 全局统计摘要 | ✅ 已完成 |

**统计摘要返回：**

```json
{
  "total": 10,
  "active": 8,
  "paused": 2,
  "reached": 3,
  "cities": ["长沙", "上海"],
  "lastRun": "2026-03-06T01:00:00.000Z"
}
```

---

### 3.4 价格历史

| 接口 | 方法 | 描述 | 状态 |
|------|------|------|------|
| `/api/prices/history/:taskId` | GET | 获取单任务价格历史 | ✅ 已完成 |

---

### 3.5 统计概览

| 接口 | 方法 | 描述 | 状态 |
|------|------|------|------|
| `/api/stats/overview` | GET | 全局统计（总数/活跃/已达成） | ✅ 已完成 |

---

## 四、待完成需求

### P1 高优先级

| 功能 | 说明 |
|------|------|
| **批量删除任务** | `POST /api/task-actions/batch/delete`，接收 `ids[]` |
| **导出任务列表** | `GET /api/tasks/export`，返回 JSON/CSV |
| **任务创建校验增强** | 校验 checkIn > 今天、checkOut > checkIn、link 格式合法 |

### P2 中优先级

| 功能 | 说明 |
|------|------|
| **价格历史分页** | history 条目多时支持分页查询 |
| **批量 check-now** | `POST /api/task-actions/batch/check-now` |
| **操作日志接口** | 记录每次 API 操作到日志文件，提供查询接口 |

### P3 低优先级

| 功能 | 说明 |
|------|------|
| **多用户支持** | 目前单 admin，未来可能需要多角色 |
| **WebSocket 推送** | 价格变化实时推送到 Dashboard，替代轮询 |
| **备份接口** | 自动备份 state.json |

---

## 五、非功能需求

| 项目 | 要求 |
|------|------|
| 响应时间 | < 200ms（state.json 在本地磁盘） |
| 认证方式 | JWT Bearer Token，所有 `/api/*` 接口须认证 |
| 错误格式 | `{ "error": "描述文字" }` |
| CORS | 允许 `localhost:5173`（Dashboard 开发端口） |
| 数据库 | 单文件 JSON（state.json），无外部数据库依赖 |

---

## 六、技术栈

| 项目 | 选型 |
|------|------|
| 运行时 | Node.js v22 |
| 框架 | Express 4 |
| 语言 | TypeScript |
| 认证 | jsonwebtoken + bcrypt |
| 数据存储 | JSON 文件（FileService 封装读写锁） |
| 构建 | tsc |
