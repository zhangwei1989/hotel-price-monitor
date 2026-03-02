"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TaskService_1 = require("../services/TaskService");
const router = express_1.default.Router();
// GET /api/prices/history/:taskId
router.get('/history/:taskId', async (req, res) => {
    try {
        const task = await TaskService_1.taskService.getTask(req.params.taskId);
        if (!task)
            return res.status(404).json({ error: '任务不存在' });
        res.json({ taskId: task.id, history: task.history ?? [] });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: '获取历史失败' });
    }
});
exports.default = router;
