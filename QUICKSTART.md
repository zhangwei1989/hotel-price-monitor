# 携程监控系统 - 快速入门指南

## 🚀 立即开始

### 1. 测试调度器

```bash
# 进入工作目录
cd ~/.easyclaw/workspace

# 赋予执行权限
chmod +x ctrip-scheduler.js

# 运行调度器
node ctrip-scheduler.js
```

**预期输出：**
```
[携程调度器] 启动时间: 2026-03-03 00:30:00
[携程调度器] 共 1 个任务，需检查 1 个
[批次 1/1] 开始执行 1 个任务
任务列表: 长沙玛珂酒店 (2026-03-05)
[携程调度器] 执行完成
```

---

### 2. 设置定时任务

#### 方法A：使用系统 Cron（推荐）

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每 8 小时执行一次）
0 */8 * * * cd ~/.easyclaw/workspace && /usr/local/bin/node ctrip-scheduler.js >> ctrip-scheduler.log 2>&1
```

#### 方法B：使用 EasyClaw 定时任务

```bash
# 创建 EasyClaw 定时任务（暂未实现，待后续集成）
```

---

### 3. 添加新的监控任务

#### 手动添加（临时方案）

编辑 `ctrip-monitor-state.json`，在 `monitors` 数组中添加：

```json
{
  "id": "unique-task-id",
  "type": "hotel",
  "provider": "ctrip",
  "hotelName": "酒店名称",
  "hotelId": "携程酒店ID",
  "city": "城市",
  "checkIn": "2026-03-10",
  "checkOut": "2026-03-11",
  "nights": 1,
  "roomName": "房型名称",
  "ratePlanHint": "价格类型",
  "currency": "CNY",
  "threshold": {
    "type": "below",
    "value": 500
  },
  "frequencyMinutes": 480,
  "autoStopDate": "2026-03-11",
  "link": "携程链接",
  "createdAt": "2026-03-03T00:00:00.000Z",
  "lastCheckedAt": "2026-03-03T00:00:00.000Z",
  "lastPrice": null,
  "lastStatus": "pending",
  "currentPriceOptions": [],
  "history": []
}
```

#### 自动添加（未来功能）

```bash
# 通过命令行添加（待开发）
携程通，添加监控任务：
酒店：北京国贸大酒店
入住：2026-03-15
退房：2026-03-16
房型：豪华大床房
目标价：< ¥800
```

---

### 4. 查看监控状态

#### 查看所有任务

```bash
cat ctrip-monitor-state.json | jq '.monitors[] | {id, hotelName, checkIn, lastPrice, threshold}'
```

#### 查看调度器日志

```bash
tail -f ctrip-scheduler.log
```

#### 查看配置

```bash
cat ctrip-monitor-config.json | jq '.globalSettings'
```

---

### 5. 调整配置

编辑 `ctrip-monitor-config.json`：

#### 修改批次大小
```json
"maxConcurrentTasks": 15  // 改为 10 或 20
```

#### 修改检查频率
```json
"defaultFrequencyMinutes": 480  // 改为 360（6小时）或 720（12小时）
```

#### 修改夜间暂停时段
```json
"nightPauseHours": [2, 6]  // 改为 [1, 7] 或禁用 []
```

#### 修改批次延迟
```json
"batchDelayMinutes": [5, 10]  // 改为 [3, 8] 或 [10, 15]
```

---

## 📊 监控和调试

### 检查任务执行情况

```bash
# 查看最近执行的任务
grep "批次" ctrip-scheduler.log | tail -20

# 查看错误日志
grep "错误" ctrip-scheduler.log

# 统计成功率（待实现）
```

### 手动触发检查

```bash
# 立即执行一次调度
node ctrip-scheduler.js

# 检查特定任务（待实现）
```

---

## 🔧 故障排除

### 问题1：调度器不执行

**检查：**
1. Cron 任务是否正确设置 `crontab -l`
2. Node.js 路径是否正确 `which node`
3. 日志文件权限 `ls -l ctrip-scheduler.log`

### 问题2：任务被跳过

**原因：**
- 未到检查时间（查看 `lastCheckedAt` + `frequencyMinutes`）
- 任务已过期（`autoStopDate` 已过）
- 夜间暂停时段

### 问题3：请求失败

**排查：**
1. 检查网络连接
2. 检查浏览器状态
3. 查看携程是否有验证码
4. 考虑 IP 被限流

---

## 📈 性能优化建议

### 初期（0-30 任务）
- ✅ 使用默认配置
- ✅ 观察成功率
- ✅ 不需要代理

### 扩展期（30-100 任务）
- ✅ 减小批次大小到 10-12
- ✅ 增加批次延迟到 8-12 分钟
- ✅ 考虑购买 5 个代理 IP

### 规模化（100-300 任务）
- ✅ 启用 IP 轮换
- ✅ 分布式部署
- ✅ 实时监控

---

## 🎯 下一步行动

### 本周
- [ ] 测试调度器运行
- [ ] 添加 5-10 个测试任务
- [ ] 观察 24 小时稳定性

### 下周
- [ ] 扩展到 20-30 个任务
- [ ] 优化批次参数
- [ ] 准备购买代理 IP

---

## 💡 提示

- **备份配置**：定期备份 `ctrip-monitor-state.json`
- **监控日志**：每天查看日志，发现问题及时调整
- **渐进扩展**：不要一次添加太多任务，逐步增加
- **测试验证**：每次改配置后测试一下

---

**准备好开始了吗？运行第一次调度器测试吧！** 🚀

```bash
cd ~/.easyclaw/workspace
node ctrip-scheduler.js
```
