import express from 'express';
import { fileService } from '../services/FileService';

const router = express.Router();

// GET /api/stats/overview
router.get('/overview', async (req, res) => {
  try {
    const state = await fileService.readMonitorState();
    const total = state.monitors.length;
    const belowTarget = state.monitors.filter(t => t.lastPrice != null && t.lastPrice < t.threshold.value).length;
    const active = state.monitors.filter(t => !t.autoStopDate || new Date(t.autoStopDate) >= new Date()).length;
    res.json({ total, active, belowTarget });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取统计失败' });
  }
});

export default router;
