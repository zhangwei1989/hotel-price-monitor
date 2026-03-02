import express from 'express';
import { taskService } from '../services/TaskService';

const router = express.Router();

// POST /api/task-actions/:id/pause
router.post('/:id/pause', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await taskService.updateTask(id, { enabled: false, pausedAt: new Date().toISOString() } as any);
    if (!updated) return res.status(404).json({ error: '任务不存在' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '暂停失败' });
  }
});

// POST /api/task-actions/:id/resume
router.post('/:id/resume', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await taskService.updateTask(id, { enabled: true, pausedAt: null } as any);
    if (!updated) return res.status(404).json({ error: '任务不存在' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '恢复失败' });
  }
});

export default router;
