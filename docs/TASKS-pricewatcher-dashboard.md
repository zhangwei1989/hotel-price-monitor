# 开发任务：PriceWatcher Dashboard

> 关联 PRD：`docs/PRD-pricewatcher-dashboard.md`  
> 最后更新：2026-03-06  
> 状态图例：✅ 已完成 | 🚧 进行中 | ❌ 未开始

---

## 已完成模块

| 模块 | 内容 |
|------|------|
| ✅ 项目初始化 | React + TS + Vite + Ant Design 5 |
| ✅ 路由配置 | /login, /tasks, /tasks/:id（React Router v6） |
| ✅ 身份认证 | JWT 登录，PrivateRoute 保护，401 自动跳转 |
| ✅ 登录页 | Vercel 深色风格，自定义原生 input/button/checkbox |
| ✅ AppLayout | 统一 Header（Logo + 退出），所有页面复用 |
| ✅ 任务列表页 | 统计卡片 + 多条件筛选 + 表格 + 分页 |
| ✅ 任务详情页 | 统计卡片 + 任务信息 + 价格方案 + 趋势图 + 历史表格 |
| ✅ 操作功能 | 立即检查 / 暂停·恢复 / 修改目标价 / 修改频率 |
| ✅ 全局深色主题 | index.css 覆盖 antd 默认样式 |
| ✅ Filters 组件 | 多条件筛选栏封装 |
| ✅ PauseResumeButton | 暂停/恢复按钮组件 |
| ✅ PriceHistoryChart | Recharts 价格趋势折线图 |
| ✅ Home 页 | 欢迎页 + 导航卡片 |

---

## 待开发任务

### P1 高优先级

---

#### ✅ TASK-DASH-01：添加任务 Modal

**入口：** 任务列表页右上角 `+ 添加任务` 按钮（白色主按钮）  
**文件：** `src/components/AddTaskModal.tsx`  
**调用 API：** `POST /api/tasks`

**表单字段：**

```
酒店名称*        文本输入
城市*            文本输入
携程链接*        文本输入（URL 格式提示）
入住日期*        日期选择（禁选今天以前）
退房日期*        日期选择（禁选入住日期以前）
房型名称*        文本输入
价格方案提示      文本输入（placeholder: "不含早"）
目标价（¥）*    数字输入（min=1）
检查频率*        数字输入 + 快捷选项（30m / 1h / 2h / 4h / 8h）
自动停止日期     日期选择（可选，默认空）
```

**交互逻辑：**
1. 表单校验通过后调用 API
2. 成功：关闭 Modal + `message.success` + 刷新列表
3. 失败：显示 API 返回的 error 信息
4. Modal 样式：`background: #111, border: 1px solid #1f1f1f`

**关键样式参考：** 同 TaskDetail 中的修改目标价弹窗风格

**估时：** 3 小时

---

#### ✅ TASK-DASH-02：任务列表删除功能

**位置：** 任务表格操作列，新增「删除」按钮  
**交互：**
1. 点击弹出 Popconfirm（「确认删除此任务？操作不可撤销」）
2. 确认后调用 `DELETE /api/tasks/:id`
3. 成功刷新列表，失败提示错误

**新增 API：** 在 `src/api/tasks.ts` 添加：
```typescript
export async function deleteTask(id: string) {
  const resp = await http.delete(`/api/tasks/${id}`);
  return resp.data;
}
```

**估时：** 1 小时

---

#### ✅ TASK-DASH-03：任务详情页删除功能

**位置：** 详情页顶部操作按钮区，新增「删除任务」按钮（红色/警告色）  
**交互：**
1. 点击弹出确认 Modal（更明显的警告提示）
2. 确认后调用 `DELETE /api/tasks/:id`
3. 成功后跳转回 `/tasks`

**估时：** 45 分钟

---

#### ✅ TASK-DASH-04：批量操作（多选 + 批量暂停/恢复/删除）

**交互设计：**
1. 表格首列增加 Checkbox，支持全选/单选
2. 选中任意行时，表格上方出现操作栏：
   ```
   已选 N 项  [批量暂停]  [批量恢复]  [批量删除]  [取消选择]
   ```
3. 批量删除需二次确认

**新增 API：** 在 `src/api/tasks.ts` 添加批量删除（调用 `POST /api/task-actions/batch/delete`）

**实现要点：**
- 选中状态存入 `selectedIds: string[]`（useState）
- 操作完成后清空选中，刷新列表

**估时：** 3 小时

---

### P2 中优先级

---

#### ✅ TASK-DASH-05：空状态引导

**场景：** 任务列表为空时  
**UI：** 居中展示图标 + "暂无监控任务" + "添加第一个任务" 按钮  
**触发：** `rows.length === 0 && !loading`

**估时：** 30 分钟

---

#### ✅ TASK-DASH-06：任务列表自动刷新

**实现：** 页面加载后每 60 秒自动调用一次 `load()`  
**注意：** 页面卸载时清除定时器（useEffect 返回 cleanup）

```typescript
useEffect(() => {
  const timer = setInterval(() => load(), 60000);
  return () => clearInterval(timer);
}, [...deps]);
```

**估时：** 30 分钟

---

#### ✅ TASK-DASH-07：自动停止日期展示与设置

**在任务信息卡（InfoRow）新增：**
- 显示 `autoStopDate`（若有，格式"YYYY-MM-DD 自动停止"；若无，显示"—"）

**在添加任务 Modal 中：** 已含此字段（见 TASK-DASH-01）

**在详情页新增编辑功能：**
- `autoStopDate` 旁加编辑按钮，弹窗修改（调用 `PUT /api/tasks/:id`）

**估时：** 1 小时

---

#### ✅ TASK-DASH-08：价格趋势图优化

**当前状态：** 基础折线图，含目标价基准线  
**新增内容：**
- 历史最低价标注线（dashed，颜色 `#f59e0b`）
- Tooltip 显示：时间 / 价格 / 是否触发
- 若历史 < 2 条，显示"数据不足，暂无趋势图"占位

**文件：** `src/components/PriceHistoryChart.tsx`

**估时：** 2 小时

---

#### TASK-DASH-09：编辑任务基本信息

**入口：** 详情页顶部操作区新增「编辑」按钮  
**打开 Modal：** 复用 AddTaskModal 的表单结构，预填当前任务字段  
**调用 API：** `PUT /api/tasks/:id`

**估时：** 2 小时（如 AddTaskModal 已做好，此项更快）

---

### P3 低优先级

---

#### TASK-DASH-10：响应式布局（移动端适配）

**范围：** 统计卡片（4列 → 2列 → 1列）、表格横向滚动、筛选栏折叠  
**断点：** `< 768px` 移动端，`768px~1024px` 平板

**估时：** 4 小时

---

#### TASK-DASH-11：历史记录导出 CSV

**入口：** 详情页历史表格右上角「导出」按钮  
**实现：** 前端直接把 history 数组转 CSV（无需新 API），触发下载

**估时：** 1 小时

---

#### TASK-DASH-12：抓取日志页（新路由 /logs）

**功能：** 展示 API 操作日志（TASK-API-06 完成后接入）  
**路由：** `/logs`，Header 导航增加入口  
**内容：** 时间 / 操作类型 / 任务 / 详情，按时间倒序

**估时：** 2 小时

---

## 开发约定

- 所有新组件放 `src/components/`，新页面放 `src/pages/`
- 不新增 antd 组件（已有的保留，新写的用原生元素 + inline style）
- 颜色/圆角/字号严格遵循 PRD 设计规范，不自造新值
- Modal 背景 `#111`，边框 `#1f1f1f`，标题色 `#ededed`
- 每个功能完成后运行 `npx tsc --noEmit` 确认无 TS 错误
- 每个功能完成后 git commit，commit message 格式：`feat(dashboard): TASK-DASH-0X 功能描述`

---

## 建议开发顺序

```
TASK-DASH-01（添加任务 Modal）
  → TASK-DASH-02（列表删除）
  → TASK-DASH-03（详情删除）
  → TASK-DASH-04（批量操作）
  → TASK-DASH-05（空状态）
  → TASK-DASH-06（自动刷新）
  → TASK-DASH-07（autoStopDate）
  → TASK-DASH-08（趋势图优化）
  → TASK-DASH-09（编辑任务）
  → P3 按需开发
```
