import express from 'express';
import { taskService } from '../services/TaskService';
import { fileService } from '../services/FileService';

const router = express.Router();

// ── POST /api/task-actions/:id/pause ─────────────────────────
router.post('/:id/pause', async (req, res) => {
  try {
    const updated = await taskService.updateTask(req.params.id, {
      enabled: false,
      pausedAt: new Date().toISOString(),
    } as any);
    if (!updated) return res.status(404).json({ error: '任务不存在' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '暂停失败' });
  }
});

// ── POST /api/task-actions/:id/resume ────────────────────────
router.post('/:id/resume', async (req, res) => {
  try {
    const updated = await taskService.updateTask(req.params.id, {
      enabled: true,
      pausedAt: null,
    } as any);
    if (!updated) return res.status(404).json({ error: '任务不存在' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '恢复失败' });
  }
});

// ── POST /api/task-actions/:id/check-now ─────────────────────
// 立即触发一次价格检查（写入 lastCheckedAt = 1970，让调度器下次优先执行）
router.post('/:id/check-now', async (req, res) => {
  try {
    const task = await taskService.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });

    // 重置 lastCheckedAt → 强制下次调度立即执行
    const updated = await taskService.updateTask(req.params.id, {
      lastCheckedAt: new Date(0).toISOString(),
      lastStatus: 'pending',
    } as any);

    res.json({ ok: true, message: '已标记为立即检查，下次调度周期将优先执行', task: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '操作失败' });
  }
});

// ── PATCH /api/task-actions/:id/threshold ────────────────────
// 修改目标价
router.patch('/:id/threshold', async (req, res) => {
  try {
    const { value } = req.body;
    if (typeof value !== 'number' || value <= 0) {
      return res.status(400).json({ error: '请提供有效的目标价（正数）' });
    }

    const task = await taskService.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });

    const updated = await taskService.updateTask(req.params.id, {
      threshold: { ...task.threshold, value },
    } as any);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新目标价失败' });
  }
});

// ── PATCH /api/task-actions/:id/frequency ────────────────────
// 修改检查频率（分钟）
router.patch('/:id/frequency', async (req, res) => {
  try {
    const { frequencyMinutes } = req.body;
    if (typeof frequencyMinutes !== 'number' || frequencyMinutes < 10) {
      return res.status(400).json({ error: '频率最小为 10 分钟' });
    }

    const updated = await taskService.updateTask(req.params.id, {
      frequencyMinutes,
    } as any);
    if (!updated) return res.status(404).json({ error: '任务不存在' });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新频率失败' });
  }
});

// ── POST /api/task-actions/batch/pause ───────────────────────
// 批量暂停
router.post('/batch/pause', async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供任务 ID 列表' });
    }

    const results = await Promise.all(
      ids.map(id =>
        taskService.updateTask(id, {
          enabled: false,
          pausedAt: new Date().toISOString(),
        } as any).then(t => ({ id, ok: !!t }))
      )
    );

    res.json({ results, paused: results.filter(r => r.ok).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '批量暂停失败' });
  }
});

// ── POST /api/task-actions/batch/resume ──────────────────────
// 批量恢复
router.post('/batch/resume', async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供任务 ID 列表' });
    }

    const results = await Promise.all(
      ids.map(id =>
        taskService.updateTask(id, {
          enabled: true,
          pausedAt: null,
        } as any).then(t => ({ id, ok: !!t }))
      )
    );

    res.json({ results, resumed: results.filter(r => r.ok).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '批量恢复失败' });
  }
});

// ── POST /api/task-actions/batch/delete ──────────────────────
// 批量删除任务（TASK-API-01）
router.post('/batch/delete', async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供任务 ID 列表' });
    }

    const results = await Promise.all(
      ids.map(id =>
        taskService.deleteTask(id)
          .then(ok => ({ id, ok: !!ok }))
          .catch(() => ({ id, ok: false }))
      )
    );

    const deleted = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;

    res.json({ deleted, failed, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '批量删除失败' });
  }
});

// ── POST /api/task-actions/batch/check-now ───────────────────
// 批量立即检查（TASK-API-03）
router.post('/batch/check-now', async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供任务 ID 列表' });
    }

    const results = await Promise.all(
      ids.map(id =>
        taskService.updateTask(id, {
          lastCheckedAt: new Date(0).toISOString(),
          lastStatus: 'pending',
        } as any)
          .then(t => ({ id, ok: !!t }))
          .catch(() => ({ id, ok: false }))
      )
    );

    const triggered = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;

    res.json({
      triggered,
      failed,
      results,
      message: `已标记 ${triggered} 个任务立即检查，下次调度周期将优先执行`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '批量立即检查失败' });
  }
});

// ── GET /api/task-actions/stats/summary ──────────────────────
// 获取全局统计摘要
router.get('/stats/summary', async (req, res) => {
  try {
    const state = await fileService.readMonitorState();
    const monitors = state.monitors || [];

    const total = monitors.length;
    const active = monitors.filter(t => t.enabled ?? true).length;
    const paused = total - active;
    const reached = monitors.filter(
      t => t.lastPrice != null && t.lastPrice < t.threshold.value
    ).length;
    const cities = [...new Set(monitors.map(t => t.city))];
    const lastRun = state.metadata?.lastSchedulerRun || null;

    res.json({ total, active, paused, reached, cities, lastRun });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取统计失败' });
  }
});

export default router;
