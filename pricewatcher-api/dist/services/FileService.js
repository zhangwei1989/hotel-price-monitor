"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileService = exports.FileService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class FileService {
    constructor() {
        this.authConfigPath = path_1.default.join(__dirname, '../../../pricewatcher-auth.json');
        this.statePath = path_1.default.join(__dirname, '../../../ctrip-monitor-state.json');
    }
    async readAuthConfig() {
        const content = await promises_1.default.readFile(this.authConfigPath, 'utf-8');
        return JSON.parse(content);
    }
    async writeAuthConfig(config) {
        await promises_1.default.writeFile(this.authConfigPath, JSON.stringify(config, null, 2));
    }
    async readMonitorState() {
        const content = await promises_1.default.readFile(this.statePath, 'utf-8');
        return JSON.parse(content);
    }
    async writeMonitorState(state) {
        await promises_1.default.writeFile(this.statePath, JSON.stringify(state, null, 2));
    }
}
exports.FileService = FileService;
exports.fileService = new FileService();
