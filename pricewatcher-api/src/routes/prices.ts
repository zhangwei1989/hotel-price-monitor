import express from 'express';
import { taskService } from '../services/TaskService';

const router = express.Router();

// GET /api/prices/history/:taskId
router.get('/history/:taskId', async (req, res) => {
  try {
    const task = await taskService.getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json({ taskId: task.id, history: task.history ?? [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取历史失败' });
  }
});

export default router;
