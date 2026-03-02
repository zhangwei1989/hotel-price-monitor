"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const crypto_1 = __importDefault(require("crypto"));
/**
 * 简化的密码哈希（与 init-admin.js 一致）
 * 生产环境建议使用 bcrypt
 */
function hashPassword(password) {
    return crypto_1.default.createHash('sha256').update(password).digest('hex');
}
/**
 * 验证密码
 */
function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}
