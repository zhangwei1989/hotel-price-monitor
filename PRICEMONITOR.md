# 携程价格监控定时任务

## 执行时机
每 8 小时自动触发一次

## 执行逻辑

### 1. 读取待检查任务
读取 `workspace/ctrip-monitor-state.json`

### 2. 筛选需要检查的任务
判断条件：
- 当前时间 >= lastCheckedAt + frequencyMinutes
- 未超过 autoStopDate
- 不在夜间暂停时段（02:00-06:00）

### 3. 如果有任务需要检查

使用 `sessions_spawn` 创建临时 Sub-agent：

**任务描述：**
```
你是"携程价格检查员"，负责批次检查携程酒店价格。

待检查任务：
{任务列表}

执行步骤：
1. 分批处理（每批15个任务）
2. 批次间随机延迟 5-10 分钟
3. 对每个任务：
   - 使用 browser(profile="openclaw") 打开携程页面
   - 提取价格信息
   - 对比阈值（threshold.value）
   - 如果价格 < 阈值：发送飞书通知
4. 更新 workspace/ctrip-monitor-state.json：
   - lastCheckedAt = 当前时间
   - lastPrice = 检查到的价格
   - 添加历史记录
5. 完成后自动结束

房间链接格式：
{task.link}

提取价格时：
- 查找 M1/M2 等房型
- 获取"特惠一口价"或"不含早餐"的价格
- 记录所有价格选项

通知格式：
🎉 携程降价提醒！
酒店：{hotelName}
日期：{checkIn} - {checkOut}
房型：{roomName}
当前价：¥{price}
目标价：¥{threshold}
链接：{link}
```

### 4. 立即返回
回复：`HEARTBEAT_OK`

## 注意事项
- 主 Agent 只负责创建 Sub-agent（<1秒）
- 实际检查由 Sub-agent 后台执行（30-60分钟）
- Sub-agent 执行完自动销毁
- 不影响主 Agent 正常响应
