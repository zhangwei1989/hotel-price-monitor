# PriceWatcher Dashboard - 开发启动方式（重要）

当前 EasyClaw exec 环境默认 Node 16，会导致 Vite 7 无法启动。
因此在需要由脚本/工具启动时，请使用 nvm 的 node 直接运行 vite：

```bash
cd /Users/zhangwei/.easyclaw/workspace/pricewatcher-dashboard

# 方式1（推荐）：直接用 node 执行 vite.js
/Users/zhangwei/.nvm/versions/node/v22.22.0/bin/node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174

# 方式2：你自己的终端（已 nvm use 22）
npm run dev -- --host 127.0.0.1 --port 5173
```

后端如果 3001 被占用，可临时改用 3002：

```bash
cd /Users/zhangwei/.easyclaw/workspace/pricewatcher-api
PORT=3002 npm run dev
```
