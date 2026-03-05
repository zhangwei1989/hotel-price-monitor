# PRD：hotel-price-monitor（监控调度引擎）

> 文档版本：v1.0  
> 创建时间：2026-03-06  
> 项目路径：`/Users/zhangwei/.easyclaw/workspace/hotel-price-monitor`  
> 端口：`3002`

---

## 一、项目定位

hotel-price-monitor 是整个系统的**调度引擎层**，负责：

- 按频率定时驱动价格检查任务
- 通过适配器层读取价格数据
- 触发飞书降价通知
- 生成每日监控汇报
- 提供手动触发 HTTP 接口

**与其他项目的关系：**

```
EasyClaw Heartbeat Agent
    │ 使用 browser 工具抓取携程页面
    │ 将价格结果写入
    ▼
ctrip-monitor-state.json  ←────────────────────────────┐
    │                                                   │
    ├──读取价格数据──→ hotel-price-monitor（3002）        │ 写入状态
    │                   ├── CtripAdapter（读 state）     │
    │                   ├── MonitorService（调度/通知）  │
    │                   └── FeishuAPI（发通知卡片）      │
    │                                                   │
    └──任务 CRUD──→ pricewatcher-api（3001）─────────────┘
                        └── Dashboard 读取展示
```

**核心约束：**  
hotel-price-monitor 是独立 Node.js 进程，**无法直接调用 EasyClaw browser 工具**（IPC 机制限制）。实际浏览器抓取由 EasyClaw Agent 完成，本服务通过读取 state.json 获取已抓取的价格数据。

---

## 二、功能模块

### 2.1 智能调度器（`app.js` - `runScheduler()`）

**触发时机：**
- Cron：每小时整点自动触发
- HTTP：`POST /api/monitor/run` 手动触发
- 启动时立即执行一次

**调度逻辑：**

| 步骤 | 说明 |
|------|------|
| 夜间暂停 | 北京时间 02:00-06:00 跳过执行 |
| 任务筛选 | 过滤：enabled=false、autoStopDate 已过期、未到检查时间 |
| 优先级排序 | 入住前 ≤2天 → 优先级1；≤7天 → 优先级2；其余 → 优先级3 |
| 动态频率 | 入住前 ≤2天：频率×0.5；>7天：频率×2；价格稳定48h：频率×1.5 |
| 分批执行 | 每批最多 15 个任务 |
| 任务间延迟 | 随机 1-5 秒（防封禁） |
| 批次间延迟 | 随机 5-10 分钟 |

**任务判断逻辑（needsCheck）：**
- `autoStopDate` 已过 → 跳过
- `enabled === false` → 跳过
- `lastCheckedAt = 1970` → 立即执行（强制检查标记）
- 当前时间 - lastCheckedAt >= 动态频率 → 执行

---

### 2.2 监控服务（`MonitorService`）

**单任务执行流程：**
1. 调用 AdapterManager.queryPrice(task) 获取价格
2. 对比 `threshold.value`，判断是否触发
3. 调用 `_updateState()` 更新 state.json：
   - lastCheckedAt、lastPrice、currentPriceOptions、lastStatus
   - 追加历史记录（最多保留 200 条）
4. 若触发：调用 FeishuAPI 发送降价通知卡片
5. 写入日志文件（`logs/monitor-YYYY-MM-DD.log`）

**失败重试：** 最多 3 次，间隔递增（5s / 10s / 15s）

---

### 2.3 适配器层（`AdapterManager` + `CtripAdapter`）

**当前状态：**

| 适配器 | 状态 | 说明 |
|--------|------|------|
| CtripAdapter | ✅ 已实现（降级模式） | 从 state.json 读取已有价格数据 |
| AmadeusAdapter | 🚧 框架已搭，未接入 | 国际酒店（万豪/凯悦等）预留 |
| RapidAPIAdapter | 🚧 框架已搭，未接入 | Booking.com 数据源预留 |

**CtripAdapter 当前工作模式：**
- `queryPrice()` 直接读取 state.json 中该任务的 lastPrice
- 实际抓取由 EasyClaw Agent 负责，写入 state.json 后本服务才能读到价格
- 这是架构约束决定的，非 bug

---

### 2.4 飞书通知（`FeishuAPI`）

**降价通知卡片内容：**
- 标题：🎉 价格触发提醒（橙色）
- 酒店名 / 房型 / 入住日期 / 当前价格 / 设定阈值 / 低于阈值金额
- 底部操作按钮："前往预订"（当前 URL 为 ctrip.com 首页，待完善）
- 更新时间注释

**每日汇报卡片（08:00 发送）内容：**
- 监控任务总数 / 运行中数量
- 已达目标数量
- 今日检查次数 / 错误次数 / 成功率

---

### 2.5 HTTP 接口

| 接口 | 方法 | 描述 | 状态 |
|------|------|------|------|
| `/health` | GET | 健康检查 | ✅ |
| `/api/monitor/run` | POST | 手动触发全量调度 | ✅ |
| `/api/monitor/run/:taskId` | POST | 单任务立即执行 | ✅ |
| `/api/monitor/health` | GET | 适配器健康报告（成功率/错误数） | ✅ |
| `/api/test/notify` | POST | 测试飞书通知 | ✅ |

---

### 2.6 日志

- 路径：`logs/monitor-YYYY-MM-DD.log`
- 格式：JSONL，每行一条记录
- 字段：`{ ts, level, taskId, hotel, price, error }`
- level：`success` / `error`

---

## 三、待完成需求

### P1 高优先级

| 功能 | 说明 |
|------|------|
| **通知卡片补充预订链接** | 按任务的 `task.link` 字段拼接"前往预订"按钮 URL，而非写死首页 |
| **taskId 写入历史 note 字段** | 历史记录增加 `note` 字段（当前 note 为空），记录"自动检查"/"手动触发"/"强制检查" |
| **单任务立即执行通知** | `/api/monitor/run/:taskId` 执行后，若价格低于阈值，也触发飞书通知（当前已有，需确认路径正确） |

### P2 中优先级

| 功能 | 说明 |
|------|------|
| **历史记录限制可配置** | 当前硬编码 200 条，改为从 config 文件读取 |
| **批次间延迟可配置** | 当前硬编码 5-10 分钟，改为从 ctrip-monitor-config.json 读取 |
| **适配器健康告警** | 若某适配器连续失败 5 次，发飞书告警 |
| **每日汇报增加昨日降价列表** | 在汇报卡片中附上昨日触发通知的任务列表 |

### P3 低优先级

| 功能 | 说明 |
|------|------|
| **Amadeus 适配器接入** | 完善国际酒店查询（需要 Amadeus API Key） |
| **RapidAPI 适配器接入** | Booking.com 数据源（需要 RapidAPI Key） |
| **多通知渠道** | 除飞书外，支持微信/邮件通知（可配置） |
| **价格异常检测** | 价格突然涨幅 > 50% 时发告警（可能是页面结构变化导致误读） |

---

## 六、待确认需求

### 闲鱼智能客服实时查价集成

**背景：**  
后续计划接入闲鱼平台，部署售前智能 Agent 充当客服。Agent 在与客户对话过程中，需要实时查询携程酒店的当前价格，再告知客户。

**问题：**  
现有 CtripAdapter 为降级模式，只读 state.json 中的历史缓存数据，不支持真正的实时查询。

**初步方案（三选一，待确认）：**

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **方案 A：读缓存** | 闲鱼 Agent 直接调用 `GET /api/tasks` 读 lastPrice | 零延迟，复用现有 API | 数据可能不新鲜（取决于上次调度时间） |
| **方案 B：实时抓取** | 闲鱼 Agent spawn 子 Agent，用 browser 工具打开携程页面实时提取价格 | 数据最准确 | 每次查询耗时 30-60 秒，对话体验差 |
| **方案 C：混合模式（推荐）** | 缓存新鲜（< 30分钟）→ 直接回复；缓存陈旧 → 告知客户稍等，spawn 子 Agent 实时抓取后回复 | 快速响应与准确性兼顾 | 实现稍复杂 |

**若采用方案 C，需新增开发：**
- `hotel-price-monitor`：新增同步执行接口（执行完价格抓取后再返回结果，而非仅标记）
- `pricewatcher-api`：新增 `GET /api/tasks/query` 支持按城市+酒店名+日期临时查询（无需预先建立监控任务）
- 闲鱼 Agent 配置（`AGENTS.md`）：写明查价工具调用逻辑和回复话术规范
- `docs/`：补充 `PRD-xianyu-agent.md`

**待确认事项：**
- [ ] 闲鱼接入时间节点确定后，再启动本块开发
- [ ] 确认查价响应时间的用户接受上限（推测 60 秒内可接受）
- [ ] 确认是否需要支持"未在监控任务列表中的酒店"临时查价
- [ ] 确认话术规范（如何告知客户"正在查询中"）

---

## 四、技术栈

| 项目 | 选型 |
|------|------|
| 运行时 | Node.js v22 |
| 框架 | Express 4 |
| 语言 | JavaScript（CommonJS） |
| 定时任务 | node-cron |
| HTTP 客户端 | axios |
| 飞书 SDK | @larksuiteoapi/node-sdk |
| 数据存储 | JSON 文件（ctrip-monitor-state.json） |

---

## 五、配置文件

**环境变量（`.env`）：**

```
GATEWAY_URL=http://127.0.0.1:10089
GATEWAY_TOKEN=
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_NOTIFY_OPEN_ID=
PORT=3002
```

**ctrip-monitor-config.json：** 全局监控配置（批次大小、默认频率等）
