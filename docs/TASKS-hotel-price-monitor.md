# 开发任务：hotel-price-monitor

> 关联 PRD：`docs/PRD-hotel-price-monitor.md`  
> 最后更新：2026-03-06  
> 状态图例：✅ 已完成 | 🚧 进行中 | ❌ 未开始

---

## 已完成模块

| 模块 | 内容 |
|------|------|
| ✅ 项目初始化 | Express + node-cron，端口 3002 |
| ✅ 智能调度器 | 优先级排序、动态频率、夜间暂停、分批执行、任务间随机延迟 |
| ✅ MonitorService | 单任务执行、状态更新、历史记录、失败重试（3次） |
| ✅ AdapterManager | 适配器路由、成功率统计、健康报告 |
| ✅ CtripAdapter | 从 state.json 读取已有价格（降级模式） |
| ✅ FeishuAPI | 降价通知卡片、每日汇报卡片、多维表格读写 |
| ✅ 日志系统 | 按日期写入 JSONL 格式日志 |
| ✅ HTTP 接口 | 健康检查 / 全量触发 / 单任务触发 / 适配器健康报告 / 测试通知 |
| ✅ 每日汇报 | 每天 08:00 发飞书，含统计数据 |
| ✅ BaseAdapter | 标准化接口定义，searchHotels / queryPrice / getHotelDetails |
| ✅ AmadeusAdapter | 框架代码（待接入） |
| ✅ RapidAPIAdapter | 框架代码（待接入） |

---

## 待开发任务

### P1 高优先级

---

#### ✅ TASK-MON-01：通知卡片补充真实预订链接

**背景：** 当前飞书降价通知的"前往预订"按钮 URL 写死为 `https://www.ctrip.com`  
**目标：** 改为使用任务的 `task.link` 字段

**修改文件：** `src/api/feishu.js`

**修改内容：**
```js
// sendPriceAlert 增加 link 参数
async sendPriceAlert({ userId, hotelName, roomTypeName, checkInDate, currentPrice, threshold, link }) {
  // ...
  actions: [{
    tag: 'button',
    text: { content: '前往预订', tag: 'plain_text' },
    type: 'primary',
    url: link || 'https://www.ctrip.com'  // 使用任务链接
  }]
}
```

**同步修改：** `src/services/monitor.js` 的 `_notify()` 中传入 `task.link`

**估时：** 30 分钟

---

#### ✅ TASK-MON-02：历史记录增加 note 字段

**背景：** history 记录的 `note` 字段目前始终为空（`{ ts, price, triggered }`），信息量不足  
**目标：** 记录触发来源，便于后续排查

**修改文件：** `src/services/monitor.js` 的 `_updateState()`

**note 取值规则：**
- 正常定时检查 → `"scheduled"`
- `lastCheckedAt = 1970`（强制检查标记）→ `"forced"`
- 通过 `/api/monitor/run/:taskId` 触发 → `"manual"`

**实现：** `_updateState` 增加 `source` 参数，`executeTask` 调用时传入

**估时：** 1 小时

---

#### ✅ TASK-MON-03：确认单任务触发通知路径

**背景：** `POST /api/monitor/run/:taskId` 调用 `monitorService.executeTask(task)`，`executeTask` 内部有通知逻辑，但 app.js 中未传 feishuOpenId 到 MonitorService 构造函数  
**验证：** 确认 config 中飞书配置是否正确传入，手动测试一次触发 + 通知  
**若有问题：** 修复 config 注入链路

**估时：** 30 分钟（验证）/ 1 小时（如需修复）

---

### P2 中优先级

---

#### ✅ TASK-MON-04：批次参数配置化

**背景：** 多个关键参数目前硬编码，不易调整

**硬编码项 → 改为读取 `ctrip-monitor-config.json`：**

| 参数 | 当前值 | 配置字段建议 |
|------|--------|-------------|
| 每批任务数 | 15 | `scheduler.batchSize` |
| 任务间延迟 | 1-5s | `scheduler.taskDelaySecMin` / `taskDelaySecMax` |
| 批次间延迟 | 5-10min | `scheduler.batchDelayMinMin` / `batchDelayMinMax` |
| 历史最大条数 | 200 | `monitor.maxHistoryPerTask` |
| 失败重试次数 | 3 | `monitor.maxRetries` |
| 夜间暂停时段 | 02:00-06:00 | `scheduler.nightPauseStart` / `nightPauseEnd` |

**实现：** 启动时读取 config 文件，注入到 MonitorService 和 runScheduler

**估时：** 2 小时

---

#### ✅ TASK-MON-05：适配器连续失败告警

**背景：** 若携程页面结构变化导致 CtripAdapter 持续失败，应及时告警  
**规则：** 某适配器连续失败 ≥ 5 次 → 发飞书告警（每小时最多发一次）

**实现：**
1. `AdapterManager.stats` 增加 `consecutiveFails` 计数
2. 成功时重置为 0
3. 达到阈值时调用 `FeishuAPI.sendCard` 发告警

**告警内容：**
```
⚠️ 适配器异常告警
适配器: Ctrip
连续失败: 5 次
最后错误: {lastError}
建议: 检查携程页面是否变化
```

**估时：** 2 小时

---

#### ✅ TASK-MON-06：每日汇报增加昨日降价列表

**背景：** 当前汇报只有统计数字，无法知道昨天具体哪些酒店降价  
**实现：** 读取昨日日志文件（`logs/monitor-YYYY-MM-DD.log`），筛选 `triggered=true` 的记录

**汇报卡片新增区块：**
```
📉 昨日降价任务（3个）
• 长沙玛珂酒店 → ¥488（目标：¥500）
• 上海四季酒店 → ¥1200（目标：¥1500）
• ...
```

**估时：** 2 小时

---

#### ✅ TASK-MON-07：日志查询接口

**接口：** `GET /api/logs?date=2026-03-06&level=error&page=1&pageSize=50`  
**实现：** 读取对应日期 JSONL 文件，解析后分页返回  
**用途：** Dashboard 日志页（TASK-DASH-12）接入

**响应：**
```json
{
  "date": "2026-03-06",
  "total": 142,
  "page": 1,
  "pageSize": 50,
  "logs": [{ "ts": "...", "level": "success", "taskId": "...", "hotel": "...", "price": 488 }]
}
```

**估时：** 1.5 小时

---

### P3 低优先级

---

#### TASK-MON-08：价格异常检测

**背景：** 若某次抓取价格与上次相比涨幅 > 50%，可能是页面解析错误  
**规则：** `(newPrice - lastPrice) / lastPrice > 0.5` → 跳过本次更新，发告警而非更新 state  
**注意：** 跌幅不做限制（降价是正常的）

**估时：** 1.5 小时

---

#### TASK-MON-09：Amadeus 适配器完善

**前提：** 需要 Amadeus API Key（测试环境免费申请）  
**工作：** 完善 `searchHotels()` 和 `queryPrice()` 的完整实现和字段映射  
**场景：** 监控国际酒店（万豪/凯悦/洲际等）

**估时：** 4 小时

---

#### TASK-MON-10：state.json 并发写入保护

**背景：** hotel-price-monitor 和 pricewatcher-api 都会写 state.json，存在并发风险  
**方案：** 引入文件锁（`proper-lockfile` 或 `lockfile` npm 包），写入前获取锁，写完释放  
**注意：** pricewatcher-api 的 FileService 也需同步改造

**估时：** 3 小时

---

## 开发约定

- 不引入新的重型依赖，保持轻量
- 所有写 state.json 的操作，先读取最新内容再修改，防止覆盖其他进程的写入
- 飞书通知失败不影响主流程（try/catch 已有）
- 每个功能完成后 git commit，格式：`feat(monitor): TASK-MON-0X 功能描述`
- 修改 app.js 中的调度逻辑前，先在本地用 `POST /api/monitor/run` 手动验证

---

## 建议开发顺序

```
TASK-MON-01（通知链接）
  → TASK-MON-03（验证通知路径）
  → TASK-MON-02（note 字段）
  → TASK-MON-04（参数配置化）
  → TASK-MON-05（失败告警）
  → TASK-MON-06（每日汇报增强）
  → TASK-MON-07（日志查询接口）
  → P3 按需
```
