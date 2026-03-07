import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import priceRoutes from './routes/prices';
import statsRoutes from './routes/stats';
import taskActionRoutes from './routes/task-actions';
import orderRoutes from './routes/orders';
import orderAnalyticsRoutes from './routes/order-analytics';
import agentRoutes from './routes/agent';
import { authenticateToken } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// public
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);

// protected — 监控任务
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/prices', authenticateToken, priceRoutes);
app.use('/api/stats', authenticateToken, statsRoutes);
app.use('/api/task-actions', authenticateToken, taskActionRoutes);

// protected — AI 客服（话术配置 + 酒店知识库）
app.use('/api/agent', authenticateToken, agentRoutes);

// protected — 订单管理（TASK-ORDER-API-04）
// 注意：analytics 路由须在 orders/:id 路由前注册，避免路径冲突
app.use('/api/orders/analytics', authenticateToken, orderAnalyticsRoutes);
app.use('/api/orders/pre-auth', authenticateToken, orderAnalyticsRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`PriceWatcher API running on http://127.0.0.1:${port}`);
});
