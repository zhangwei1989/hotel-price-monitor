"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = exports.TaskService = void 0;
const FileService_1 = require("./FileService");
class TaskService {
    async listTasks(filter = {}) {
        const state = await FileService_1.fileService.readMonitorState();
        let tasks = [...state.monitors];
        // filters
        if (filter.city) {
            tasks = tasks.filter(t => t.city === filter.city);
        }
        if (filter.status) {
            tasks = tasks.filter(t => t.lastStatus === filter.status);
        }
        if (typeof filter.enabled === 'boolean') {
            tasks = tasks.filter(t => (t.enabled ?? true) === filter.enabled);
        }
        if (filter.hotelName) {
            const q = filter.hotelName.toLowerCase();
            tasks = tasks.filter(t => t.hotelName.toLowerCase().includes(q) || t.roomName.toLowerCase().includes(q));
        }
        if (filter.checkInFrom) {
            tasks = tasks.filter(t => t.checkIn >= filter.checkInFrom);
        }
        if (filter.checkInTo) {
            tasks = tasks.filter(t => t.checkIn <= filter.checkInTo);
        }
        if (typeof filter.currentPriceMin === 'number') {
            tasks = tasks.filter(t => (t.lastPrice ?? Number.POSITIVE_INFINITY) >= filter.currentPriceMin);
        }
        if (typeof filter.currentPriceMax === 'number') {
            tasks = tasks.filter(t => (t.lastPrice ?? Number.NEGATIVE_INFINITY) <= filter.currentPriceMax);
        }
        if (typeof filter.belowTarget === 'boolean') {
            tasks = tasks.filter(t => {
                if (t.lastPrice == null)
                    return false;
                return filter.belowTarget ? t.lastPrice < t.threshold.value : t.lastPrice >= t.threshold.value;
            });
        }
        // sorting
        const sortBy = filter.sortBy || 'checkIn';
        const sortOrder = filter.sortOrder || 'asc';
        tasks.sort((a, b) => {
            const dir = sortOrder === 'asc' ? 1 : -1;
            const av = a[sortBy];
            const bv = b[sortBy];
            if (av === bv)
                return 0;
            return av > bv ? dir : -dir;
        });
        // pagination
        const total = tasks.length;
        const pageSize = filter.pageSize ?? 20;
        const page = filter.page ?? 1;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return { tasks: tasks.slice(start, end), total, page, pageSize };
    }
    async getTask(id) {
        const state = await FileService_1.fileService.readMonitorState();
        return state.monitors.find(t => t.id === id) ?? null;
    }
    async createTask(task) {
        const state = await FileService_1.fileService.readMonitorState();
        state.monitors.push(task);
        state.metadata = state.metadata || { totalTasks: 0, activeTasks: 0, lastSchedulerRun: null, schedulerEnabled: true };
        state.metadata.totalTasks = state.monitors.length;
        state.metadata.activeTasks = state.monitors.length;
        await FileService_1.fileService.writeMonitorState(state);
        return task;
    }
    async updateTask(id, patch) {
        const state = await FileService_1.fileService.readMonitorState();
        const idx = state.monitors.findIndex(t => t.id === id);
        if (idx === -1)
            return null;
        state.monitors[idx] = { ...state.monitors[idx], ...patch };
        await FileService_1.fileService.writeMonitorState(state);
        return state.monitors[idx];
    }
    async deleteTask(id) {
        const state = await FileService_1.fileService.readMonitorState();
        const before = state.monitors.length;
        state.monitors = state.monitors.filter(t => t.id !== id);
        if (state.monitors.length === before)
            return false;
        state.metadata = state.metadata || { totalTasks: 0, activeTasks: 0, lastSchedulerRun: null, schedulerEnabled: true };
        state.metadata.totalTasks = state.monitors.length;
        state.metadata.activeTasks = state.monitors.length;
        await FileService_1.fileService.writeMonitorState(state);
        return true;
    }
}
exports.TaskService = TaskService;
exports.taskService = new TaskService();
