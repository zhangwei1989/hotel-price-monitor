import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import priceRoutes from './routes/prices';
import statsRoutes from './routes/stats';
import taskActionRoutes from './routes/task-actions';
import { authenticateToken } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// public
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);

// protected
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/prices', authenticateToken, priceRoutes);
app.use('/api/stats', authenticateToken, statsRoutes);
app.use('/api/task-actions', authenticateToken, taskActionRoutes);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`PriceWatcher API running on http://127.0.0.1:${port}`);
});
