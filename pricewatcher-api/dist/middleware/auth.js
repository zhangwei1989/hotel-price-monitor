"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const FileService_1 = require("../services/FileService");
/**
 * JWT Token 认证中间件
 */
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            res.status(401).json({ error: '未授权：缺少 Token' });
            return;
        }
        // 读取 JWT 密钥
        const config = await FileService_1.fileService.readAuthConfig();
        // 验证 Token
        const decoded = jsonwebtoken_1.default.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ error: 'Token 已过期' });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(403).json({ error: 'Token 无效' });
        }
        else {
            res.status(500).json({ error: '认证失败' });
        }
    }
}
