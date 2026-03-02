"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TaskService_1 = require("../services/TaskService");
const router = express_1.default.Router();
// GET /api/tasks
router.get('/', async (req, res) => {
    try {
        const { city, status, hotelName, checkInFrom, checkInTo, currentPriceMin, currentPriceMax, belowTarget, enabled, sortBy, sortOrder, page, pageSize, } = req.query;
        const result = await TaskService_1.taskService.listTasks({
            city,
            status,
            hotelName,
            checkInFrom,
            checkInTo,
            currentPriceMin: currentPriceMin != null ? Number(currentPriceMin) : undefined,
            currentPriceMax: currentPriceMax != null ? Number(currentPriceMax) : undefined,
            belowTarget: belowTarget != null ? (belowTarget === 'true') : undefined,
            enabled: enabled != null ? (enabled === 'true') : undefined,
            sortBy,
            sortOrder,
            page: page != null ? Number(page) : undefined,
            pageSize: pageSize != null ? Number(pageSize) : undefined,
        });
        res.json(result);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: '获取任务列表失败' });
    }
});
// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
    try {
        const task = await TaskService_1.taskService.getTask(req.params.id);
        if (!task)
            return res.status(404).json({ error: '任务不存在' });
        res.json(task);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: '获取任务详情失败' });
    }
});
// POST /api/tasks
router.post('/', async (req, res) => {
    try {
        const task = await TaskService_1.taskService.createTask(req.body);
        res.status(201).json(task);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: '创建任务失败' });
    }
});
// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
    try {
        const updated = await TaskService_1.taskService.updateTask(req.params.id, req.body);
        if (!updated)
            return res.status(404).json({ error: '任务不存在' });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: '更新任务失败' });
    }
});
// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
    try {
        const ok = await TaskService_1.taskService.deleteTask(req.params.id);
        if (!ok)
            return res.status(404).json({ error: '任务不存在' });
        res.json({ ok: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: '删除任务失败' });
    }
});
exports.default = router;
