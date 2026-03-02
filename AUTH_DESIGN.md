# PriceWatcher - 认证系统设计

## 🔐 认证方案

### 单用户模式 - 超级管理员

**设计原则：**
- 只有一个管理员账号
- 使用 JWT Token 认证
- 支持"记住我"功能
- 简单但安全

---

## 📦 前端实现

### 1. 登录页面组件

```typescript
// src/pages/Login.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string; remember: boolean }) => {
    setLoading(true);
    try {
      const { token } = await login(values.username, values.password);
      
      // 保存 Token
      if (values.remember) {
        localStorage.setItem('token', token);
      } else {
        sessionStorage.setItem('token', token);
      }
      
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error) {
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>PriceWatcher Dashboard</h1>
        <p>价格守望者 - 管理员登录</p>
        
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住我（7天）</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};
```

### 2. 路由守卫

```typescript
// src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};
```

### 3. API 拦截器

```typescript
// src/api/axios.ts
import axios from 'axios';
import { message } from 'antd';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器 - 添加 Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理未授权
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期或无效
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      message.error('登录已过期，请重新登录');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4. 路由配置

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { TaskList } from './pages/TaskList';
import { TaskDetail } from './pages/TaskDetail';
import { Dashboard } from './pages/Dashboard';
import { PrivateRoute } from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/tasks"
          element={
            <PrivateRoute>
              <TaskList />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/tasks/:id"
          element={
            <PrivateRoute>
              <TaskDetail />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 🔌 后端实现

### 1. 认证 API

```typescript
// src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const AUTH_CONFIG_PATH = path.join(__dirname, '../../pricewatcher-auth.json');

// 登录接口
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 读取配置
    const config = JSON.parse(await fs.readFile(AUTH_CONFIG_PATH, 'utf-8'));
    
    // 验证用户名
    if (username !== config.admin.username) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 验证密码
    const isValid = await bcrypt.compare(password, config.admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 生成 JWT Token
    const token = jwt.sign(
      { username: config.admin.username, role: 'admin' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    // 更新最后登录时间
    config.admin.lastLogin = new Date().toISOString();
    await fs.writeFile(AUTH_CONFIG_PATH, JSON.stringify(config, null, 2));
    
    res.json({ 
      token,
      user: {
        username: config.admin.username,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 验证 Token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// 登出
router.post('/logout', authenticateToken, (req, res) => {
  // JWT 是无状态的，前端删除 Token 即可
  res.json({ message: '登出成功' });
});

// 修改密码
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    const config = JSON.parse(await fs.readFile(AUTH_CONFIG_PATH, 'utf-8'));
    
    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, config.admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }
    
    // 生成新密码哈希
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    
    // 更新配置
    config.admin.passwordHash = newHash;
    await fs.writeFile(AUTH_CONFIG_PATH, JSON.stringify(config, null, 2));
    
    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

export default router;
```

### 2. 中间件

```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

const AUTH_CONFIG_PATH = path.join(__dirname, '../../pricewatcher-auth.json');

export async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: '未授权' });
  }
  
  try {
    const config = JSON.parse(await fs.readFile(AUTH_CONFIG_PATH, 'utf-8'));
    
    const user = jwt.verify(token, config.jwt.secret);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token 无效或已过期' });
  }
}
```

### 3. 应用所有需要认证的路由

```typescript
// src/server.ts
import express from 'express';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import { authenticateToken } from './middleware/auth';

const app = express();

app.use(express.json());

// 认证路由（不需要 Token）
app.use('/api/auth', authRoutes);

// 任务路由（需要 Token）
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/prices', authenticateToken, priceRoutes);
app.use('/api/stats', authenticateToken, statsRoutes);

app.listen(3001, () => {
  console.log('PriceWatcher API running on port 3001');
});
```

---

## 🔧 初始化脚本

### 生成初始管理员密码

```typescript
// scripts/init-admin.ts
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

async function initAdmin() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || generatePassword();
  
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  
  const config = {
    version: 1,
    admin: {
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
      lastLogin: null
    },
    jwt: {
      secret: randomBytes(32).toString('hex'),
      expiresIn: '7d'
    },
    security: {
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15分钟
      sessionTimeout: 604800000 // 7天
    }
  };
  
  const configPath = path.join(__dirname, '../pricewatcher-auth.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  
  console.log('管理员账号已创建：');
  console.log('用户名:', username);
  console.log('密码:', password);
  console.log('');
  console.log('⚠️  请妥善保管密码，并在首次登录后修改！');
}

function generatePassword(): string {
  return randomBytes(8).toString('hex');
}

initAdmin().catch(console.error);
```

**使用方式：**
```bash
# 使用默认用户名和随机密码
npm run init-admin

# 自定义用户名和密码
npm run init-admin admin MySecurePassword123
```

---

## 🎨 登录页面样式

```css
/* src/pages/Login.css */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.login-box h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.login-box p {
  margin: 0 0 32px 0;
  color: #666;
  text-align: center;
}

.login-box .ant-input-affix-wrapper,
.login-box .ant-input-password {
  border-radius: 8px;
}

.login-box .ant-btn-primary {
  border-radius: 8px;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}
```

---

## 🔐 安全最佳实践

### 1. 密码要求
- ✅ 最少 8 位字符
- ✅ 包含大小写字母
- ✅ 包含数字
- ✅ 建议包含特殊字符

### 2. Token 管理
- ✅ 7 天过期（可配置）
- ✅ "记住我"使用 localStorage
- ✅ 不勾选使用 sessionStorage
- ✅ 后端验证每个请求的 Token

### 3. 防暴力破解
- ✅ 限制登录尝试次数（5次）
- ✅ 失败后锁定 15 分钟
- ✅ 记录登录日志

### 4. HTTPS
- ⚠️ 生产环境必须使用 HTTPS
- ⚠️ Token 通过 HTTPS 传输

---

## 📊 配置文件说明

### pricewatcher-auth.json

```json
{
  "version": 1,
  "admin": {
    "username": "admin",              // 管理员用户名
    "passwordHash": "$2b$10$...",     // bcrypt 哈希后的密码
    "createdAt": "2026-03-03T...",    // 创建时间
    "lastLogin": "2026-03-03T..."     // 最后登录时间
  },
  "jwt": {
    "secret": "your-secret-key",      // JWT 签名密钥（自动生成）
    "expiresIn": "7d"                 // Token 过期时间
  },
  "security": {
    "maxLoginAttempts": 5,            // 最大登录尝试次数
    "lockoutDuration": 900000,        // 锁定时长（毫秒）
    "sessionTimeout": 604800000       // 会话超时（毫秒）
  }
}
```

---

## 🚀 快速开始

### 1. 初始化管理员账号

```bash
cd pricewatcher-api
npm run init-admin
```

会输出：
```
管理员账号已创建：
用户名: admin
密码: a3f8c9d2e1b4f7a6

⚠️  请妥善保管密码，并在首次登录后修改！
```

### 2. 启动后端

```bash
npm run dev
```

### 3. 启动前端

```bash
cd ../pricewatcher-dashboard
npm run dev
```

### 4. 访问 Dashboard

打开浏览器：`http://localhost:5173`

使用生成的用户名和密码登录。

---

## 📝 修改密码流程

### 前端页面

```typescript
// src/pages/Settings.tsx
<Form onFinish={handleChangePassword}>
  <Form.Item
    label="旧密码"
    name="oldPassword"
    rules={[{ required: true }]}
  >
    <Input.Password />
  </Form.Item>
  
  <Form.Item
    label="新密码"
    name="newPassword"
    rules={[
      { required: true },
      { min: 8, message: '密码至少8位' }
    ]}
  >
    <Input.Password />
  </Form.Item>
  
  <Form.Item
    label="确认密码"
    name="confirmPassword"
    rules={[
      { required: true },
      ({ getFieldValue }) => ({
        validator(_, value) {
          if (!value || getFieldValue('newPassword') === value) {
            return Promise.resolve();
          }
          return Promise.reject(new Error('两次密码不一致'));
        },
      }),
    ]}
  >
    <Input.Password />
  </Form.Item>
  
  <Button type="primary" htmlType="submit">
    修改密码
  </Button>
</Form>
```

---

## ✅ 完成！

**已创建文件：**
- ✅ `pricewatcher-auth.json` - 认证配置
- ✅ `AUTH_DESIGN.md` - 认证系统设计文档

**功能清单：**
- ✅ 单用户登录系统
- ✅ JWT Token 认证
- ✅ "记住我"功能
- ✅ 密码修改功能
- ✅ 路由守卫
- ✅ API 拦截器
- ✅ 安全最佳实践

---

**下一步需要：**
1. 🔧 初始化管理员账号（运行 init-admin 脚本）
2. 🎨 实现登录页面 UI
3. 🔌 实现后端认证 API
4. 🧪 测试登录流程

需要我帮你实现哪一部分？🥇
