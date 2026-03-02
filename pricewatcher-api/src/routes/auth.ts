import express from 'express';
import jwt from 'jsonwebtoken';
import { fileService } from '../services/FileService';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { authenticateToken } from '../middleware/auth';
import { LoginRequest, LoginResponse } from '../types';

const router = express.Router();

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body as LoginRequest;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 读取认证配置
    const config = await fileService.readAuthConfig();

    // 验证用户名
    if (username !== config.admin.username) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isValid = verifyPassword(password, config.admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成 JWT Token
    const token = jwt.sign(
      { username: config.admin.username, role: 'admin' },
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    // 更新最后登录时间
    config.admin.lastLogin = new Date().toISOString();
    await fileService.writeAuthConfig(config);

    // 返回登录成功
    const response: LoginResponse = {
      token,
      user: {
        username: config.admin.username,
        role: 'admin'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

/**
 * GET /api/auth/verify
 * 验证 Token 是否有效
 */
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

/**
 * POST /api/auth/change-password
 * 修改密码
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: '新密码至少8位字符' });
    }

    const config = await fileService.readAuthConfig();

    // 验证旧密码
    const isValid = verifyPassword(oldPassword, config.admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    // 更新密码
    config.admin.passwordHash = hashPassword(newPassword);
    await fileService.writeAuthConfig(config);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

/**
 * POST /api/auth/logout
 * 登出（前端删除 Token 即可，这里只是记录）
 */
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: '登出成功' });
});

export default router;
