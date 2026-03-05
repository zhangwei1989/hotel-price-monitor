# PriceWatcher 项目文档索引

> 创建时间：2026-03-06  
> 所有后续开发以本目录文档为准

---

## 项目概览

| 项目 | 路径 | 端口 | 作用 |
|------|------|------|------|
| **PriceWatcher API** | `pricewatcher-api/` | 3001 | 后端 REST API，管理任务数据 |
| **PriceWatcher Dashboard** | `pricewatcher-dashboard/` | 5173 | 前端可视化管理界面 |
| **hotel-price-monitor** | `hotel-price-monitor/` | — | 价格抓取适配器（被 Agent 调用） |

价格实际抓取由 EasyClaw Heartbeat Agent 通过 browser 工具完成，结果写入 `ctrip-monitor-state.json`。

---

## 文档清单

| 文档 | 内容 |
|------|------|
| [PRD-pricewatcher-api.md](./PRD-pricewatcher-api.md) | 后端需求文档：接口、字段、待开发功能 |
| [PRD-pricewatcher-dashboard.md](./PRD-pricewatcher-dashboard.md) | 前端需求文档：页面结构、功能、设计规范 |
| [PRD-hotel-price-monitor.md](./PRD-hotel-price-monitor.md) | 调度引擎需求文档：调度逻辑、适配器、飞书通知 |
| [TASKS-pricewatcher-api.md](./TASKS-pricewatcher-api.md) | 后端开发任务列表（已完成 + 待开发 + 估时） |
| [TASKS-pricewatcher-dashboard.md](./TASKS-pricewatcher-dashboard.md) | 前端开发任务列表（已完成 + 待开发 + 估时） |
| [TASKS-hotel-price-monitor.md](./TASKS-hotel-price-monitor.md) | 调度引擎开发任务列表（已完成 + 待开发 + 估时） |

---

## 当前进度

### PriceWatcher API — 全部核心功能已完成

待开发（按优先级）：

- ❌ TASK-API-01：批量删除任务
- ❌ TASK-API-02：任务创建字段校验增强
- ❌ TASK-API-03：批量立即检查
- ❌ TASK-API-04：任务导出
- ❌ TASK-API-05：价格历史分页
- ❌ TASK-API-06：操作日志接口
- ❌ TASK-API-07：state.json 自动备份
- ❌ TASK-API-08：WebSocket 实时推送

### hotel-price-monitor — 核心功能已完成

待开发（按优先级）：

- ❌ TASK-MON-01：通知卡片补充真实预订链接
- ❌ TASK-MON-02：历史记录增加 note 字段
- ❌ TASK-MON-03：确认单任务触发通知路径
- ❌ TASK-MON-04：批次参数配置化
- ❌ TASK-MON-05：适配器连续失败告警
- ❌ TASK-MON-06：每日汇报增加昨日降价列表
- ❌ TASK-MON-07：日志查询接口
- ❌ TASK-MON-08：价格异常检测
- ❌ TASK-MON-09：Amadeus 适配器完善
- ❌ TASK-MON-10：state.json 并发写入保护

### PriceWatcher Dashboard — 基础功能已完成

待开发（按优先级）：

- ❌ TASK-DASH-01：添加任务 Modal（**P1，下一个做**）
- ❌ TASK-DASH-02：列表页删除任务
- ❌ TASK-DASH-03：详情页删除任务
- ❌ TASK-DASH-04：批量操作（多选+批量暂停/恢复/删除）
- ❌ TASK-DASH-05：空状态引导
- ❌ TASK-DASH-06：自动刷新
- ❌ TASK-DASH-07：autoStopDate 展示与设置
- ❌ TASK-DASH-08：价格趋势图优化
- ❌ TASK-DASH-09：编辑任务基本信息
- ❌ TASK-DASH-10：响应式布局
- ❌ TASK-DASH-11：历史记录导出 CSV
- ❌ TASK-DASH-12：抓取日志页

---

## 下一步建议

**前端：** 从 **TASK-DASH-01（添加任务 Modal）** 开始，同步进行 **TASK-API-02（字段校验）** 配合联调。  
**调度引擎：** 从 **TASK-MON-01（通知链接）** + **TASK-MON-03（验证通知路径）** 开始，确保通知功能完整可用。
