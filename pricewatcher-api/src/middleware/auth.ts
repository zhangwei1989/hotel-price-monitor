import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { fileService } from '../services/FileService';
import { User } from '../types';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * JWT Token 认证中间件
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: '未授权：缺少 Token' });
      return;
    }

    // 读取 JWT 密钥
    const config = await fileService.readAuthConfig();

    // 验证 Token
    const decoded = jwt.verify(token, config.jwt.secret) as User;
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token 已过期' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Token 无效' });
    } else {
      res.status(500).json({ error: '认证失败' });
    }
  }
}
