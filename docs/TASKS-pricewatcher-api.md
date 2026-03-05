# 开发任务：PriceWatcher API

> 关联 PRD：`docs/PRD-pricewatcher-api.md`  
> 最后更新：2026-03-06  
> 状态图例：✅ 已完成 | 🚧 进行中 | ❌ 未开始

---

## 已完成模块

| 模块 | 内容 |
|------|------|
| ✅ 项目初始化 | Express + TypeScript，端口 3001 |
| ✅ 身份认证 | JWT 登录/验证，bcrypt 密码，登录失败锁定 |
| ✅ 任务 CRUD | GET/POST/PUT/DELETE `/api/tasks` |
| ✅ 任务列表筛选 | 城市/搜索/状态/价格区间/日期范围/排序/分页 |
| ✅ 任务操作 | 暂停/恢复/立即检查/修改阈值/修改频率 |
| ✅ 批量操作 | 批量暂停/批量恢复 |
| ✅ 统计摘要 | total/active/paused/reached/cities/lastRun |
| ✅ 价格历史 | GET `/api/prices/history/:taskId` |
| ✅ 统计概览 | GET `/api/stats/overview` |
| ✅ FileService | JSON 文件读写（含并发安全） |
| ✅ TaskService | 业务逻辑封装 |

---

## 待开发任务

### P1 高优先级

---

#### ✅ TASK-API-01：批量删除任务

**接口：** `POST /api/task-actions/batch/delete`  
**请求体：** `{ "ids": ["id1", "id2"] }`  
**响应：** `{ "deleted": 2, "results": [{ "id": "id1", "ok": true }] }`  
**实现思路：**
1. 在 `task-actions.ts` 添加路由
2. 循环调用 `taskService.deleteTask(id)`
3. 返回成功/失败明细

**估时：** 30 分钟

---

#### ✅ TASK-API-02：任务创建字段校验增强

**背景：** 当前 `POST /api/tasks` 无校验，任意字段均可写入  
**校验规则：**
- `hotelName`：非空字符串
- `city`：非空字符串
- `checkIn`：格式 YYYY-MM-DD，>= 今天
- `checkOut`：格式 YYYY-MM-DD，> checkIn
- `link`：URL 格式，建议含 `hotels.ctrip.com`（允许其他 URL，仅 warn）
- `threshold.value`：正数
- `frequencyMinutes`：>= 10 的整数
- `autoStopDate`：如填写，>= checkOut

**实现思路：**
1. 创建 `src/validators/taskValidator.ts`
2. 在 POST 路由中调用，返回 `{ "error": "checkIn 不能早于今天" }`（400）

**估时：** 1 小时

---

#### ✅ TASK-API-03：批量立即检查

**接口：** `POST /api/task-actions/batch/check-now`  
**请求体：** `{ "ids": ["id1", "id2"] }`  
**响应：** `{ "triggered": 2, "results": [...] }`  
**实现思路：** 同批量暂停，重置 lastCheckedAt = `new Date(0).toISOString()`

**估时：** 30 分钟

---

### P2 中优先级

---

#### TASK-API-04：任务导出

**接口：** `GET /api/tasks/export?format=json`（暂只支持 JSON）  
**响应头：** `Content-Disposition: attachment; filename="tasks-2026-03-06.json"`  
**内容：** 当前所有任务数组（不含 history，减小体积）

**估时：** 1 小时

---

#### TASK-API-05：价格历史分页

**接口：** `GET /api/prices/history/:taskId?page=1&pageSize=50`  
**变更：** history 数组按时间倒序返回，支持分页  
**响应新增字段：** `{ "total": 200, "page": 1, "pageSize": 50, "history": [...] }`

**估时：** 1 小时

---

#### TASK-API-06：操作日志接口

**背景：** 记录每次关键 API 调用（创建/删除/修改目标价/批量操作）  
**接口：**
- `GET /api/logs?page=1&pageSize=50` — 查询日志列表
- 日志文件：`logs/api-operations.jsonl`

**日志格式：**
```json
{ "ts": "2026-03-06T01:00:00Z", "action": "task.create", "taskId": "xxx", "detail": "..." }
```

**估时：** 2 小时

---

### P3 低优先级

---

#### TASK-API-07：state.json 自动备份

**背景：** 单文件数据库，意外损坏风险大  
**实现：** 每次写入前，先将当前 state.json 备份至 `backups/state-{timestamp}.json`，保留最近 10 份

**估时：** 1 小时

---

#### TASK-API-08：WebSocket 实时推送

**背景：** Dashboard 当前需手动刷新  
**方案：** ws 库，价格更新时 broadcast `{ type: "price_update", taskId, price }`  
**Dashboard 侧：** 收到消息后更新对应行数据

**估时：** 3 小时

---

## 开发约定

- 所有新路由均需 JWT 鉴权（复用现有 auth middleware）
- 错误响应统一格式：`{ "error": "描述" }`，状态码 4xx/5xx
- 修改 state.json 须通过 FileService，禁止直接 `fs.writeFileSync`
- 新功能写完后执行 `npx tsc --noEmit` 确认无 TS 错误
- 每个功能完成后 git commit，commit message 格式：`feat(api): TASK-API-0X 功能描述`
