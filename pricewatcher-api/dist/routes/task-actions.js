"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TaskService_1 = require("../services/TaskService");
const router = express_1.default.Router();
// POST /api/task-actions/:id/pause
router.post('/:id/pause', async (req, res) => {
    try {
        const id = req.params.id;
        const updated = await TaskService_1.taskService.updateTask(id, { enabled: false, pausedAt: new Date().toISOString() });
        if (!updated)
            return res.status(404).json({ error: '任务不存在' });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: '暂停失败' });
    }
});
// POST /api/task-actions/:id/resume
router.post('/:id/resume', async (req, res) => {
    try {
        const id = req.params.id;
        const updated = await TaskService_1.taskService.updateTask(id, { enabled: true, pausedAt: null });
        if (!updated)
            return res.status(404).json({ error: '任务不存在' });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: '恢复失败' });
    }
});
exports.default = router;
