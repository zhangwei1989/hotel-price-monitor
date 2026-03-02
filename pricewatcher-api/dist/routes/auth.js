"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const FileService_1 = require("../services/FileService");
const crypto_1 = require("../utils/crypto");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        // 读取认证配置
        const config = await FileService_1.fileService.readAuthConfig();
        // 验证用户名
        if (username !== config.admin.username) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        // 验证密码
        const isValid = (0, crypto_1.verifyPassword)(password, config.admin.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        // 生成 JWT Token
        const token = jsonwebtoken_1.default.sign({ username: config.admin.username, role: 'admin' }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
        // 更新最后登录时间
        config.admin.lastLogin = new Date().toISOString();
        await FileService_1.fileService.writeAuthConfig(config);
        // 返回登录成功
        const response = {
            token,
            user: {
                username: config.admin.username,
                role: 'admin'
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '登录失败' });
    }
});
/**
 * GET /api/auth/verify
 * 验证 Token 是否有效
 */
router.get('/verify', auth_1.authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});
/**
 * POST /api/auth/change-password
 * 修改密码
 */
router.post('/change-password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: '旧密码和新密码不能为空' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: '新密码至少8位字符' });
        }
        const config = await FileService_1.fileService.readAuthConfig();
        // 验证旧密码
        const isValid = (0, crypto_1.verifyPassword)(oldPassword, config.admin.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: '旧密码错误' });
        }
        // 更新密码
        config.admin.passwordHash = (0, crypto_1.hashPassword)(newPassword);
        await FileService_1.fileService.writeAuthConfig(config);
        res.json({ message: '密码修改成功' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: '修改密码失败' });
    }
});
/**
 * POST /api/auth/logout
 * 登出（前端删除 Token 即可，这里只是记录）
 */
router.post('/logout', auth_1.authenticateToken, (req, res) => {
    res.json({ message: '登出成功' });
});
exports.default = router;
