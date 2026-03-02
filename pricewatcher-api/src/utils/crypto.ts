import crypto from 'crypto';

/**
 * 简化的密码哈希（与 init-admin.js 一致）
 * 生产环境建议使用 bcrypt
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
