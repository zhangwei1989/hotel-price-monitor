"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const FileService_1 = require("../services/FileService");
const router = express_1.default.Router();
// GET /api/stats/overview
router.get('/overview', async (req, res) => {
    try {
        const state = await FileService_1.fileService.readMonitorState();
        const total = state.monitors.length;
        const belowTarget = state.monitors.filter(t => t.lastPrice != null && t.lastPrice < t.threshold.value).length;
        const active = state.monitors.filter(t => !t.autoStopDate || new Date(t.autoStopDate) >= new Date()).length;
        res.json({ total, active, belowTarget });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: '获取统计失败' });
    }
});
exports.default = router;
