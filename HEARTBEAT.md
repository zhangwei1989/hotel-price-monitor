# HEARTBEAT.md

## 任务1：携程价格抓取（每小时执行）

当有未完成的开发任务时，继续推进开发。

同时执行价格抓取，**严格按以下步骤执行**：

### Step 1：找出待检查任务
```bash
node /Users/zhangwei/.easyclaw/workspace/hotel-price-monitor/src/crawler/run-price-check.js --list
```
解析输出的 JSON，获取 `tasks` 数组。若 `status == "no_tasks"` 则跳过抓取。

### Step 2：逐个任务抓取（用 browser 工具）
对每个任务：
1. 用 `browser` 工具打开 `task.link`（携程酒店详情页）
2. 等待页面加载（3-5秒），截取页面快照文本
3. 从快照文本中提取最低价格（找 ¥数字 格式）
4. 找到当前页面最低价后，执行 Step 3

### Step 3：写入价格结果
```bash
node /Users/zhangwei/.easyclaw/workspace/hotel-price-monitor/src/crawler/update-task-price.js <taskId> <price> '[{"price":<price>,"description":"携程最低价"}]'
```
- 替换 `<taskId>` 和 `<price>` 为实际值
- 检查输出是否包含 `[NOTIFY_REQUIRED]`

### Step 4：飞书通知（仅当价格低于阈值）
若 Step 3 输出包含 `[NOTIFY_REQUIRED]`，发送飞书消息给张伟，内容：
```
🏨 价格提醒
酒店：{hotelName}
房型：{roomName}
入住：{checkIn} → {checkOut}
当前价：¥{price}（目标价：¥{threshold}）
查看：{link}
```

### Step 5：记录日记
把抓取结果追加写入当天日记 `memory/diary-YYYY-MM-DD.md`（替换实际日期）

### Step 6：开发任务
完成开发任务后立即 `git commit + push`

---

## 任务2：每天早上 8 点发日记到飞书
- 读取前一天的日记文件 `memory/diary-YYYY-MM-DD.md`（替换实际日期）
- 在飞书上创建一个文档，标题为「小一工作日记 YYYY-MM-DD」
- 把日记内容写进去，通过飞书消息发给张伟

## 日记模板
```
# 工作日记 YYYY-MM-DD

## 今日完成
- 

## 遇到的问题
- 

## 明日计划
- 

## Commit 记录
- 
```

## 任务3：错误记录
- 出现错误时立刻追加到 `memory/ERRORS.md`
- 格式：时间 + 错误描述 + 根因 + 解决方案
