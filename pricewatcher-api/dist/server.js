"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const prices_1 = __importDefault(require("./routes/prices"));
const stats_1 = __importDefault(require("./routes/stats"));
const task_actions_1 = __importDefault(require("./routes/task-actions"));
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '2mb' }));
// public
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', auth_1.default);
// protected
app.use('/api/tasks', auth_2.authenticateToken, tasks_1.default);
app.use('/api/prices', auth_2.authenticateToken, prices_1.default);
app.use('/api/stats', auth_2.authenticateToken, stats_1.default);
app.use('/api/task-actions', auth_2.authenticateToken, task_actions_1.default);
const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
    console.log(`PriceWatcher API running on http://127.0.0.1:${port}`);
});
