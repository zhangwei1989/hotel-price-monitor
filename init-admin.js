#!/usr/bin/env node
/**
 * 初始化管理员账号
 * 使用方式：
 *   node init-admin.js
 *   node init-admin.js admin MyPassword123
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 简化的 bcrypt 模拟（生产环境需要真正的 bcrypt）
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generatePassword() {
  return crypto.randomBytes(8).toString('hex');
}

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

async function initAdmin() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || generatePassword();
  
  const passwordHash = hashPassword(password);
  
  const config = {
    version: 1,
    admin: {
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
      lastLogin: null
    },
    jwt: {
      secret: generateSecret(),
      expiresIn: '7d'
    },
    security: {
      maxLoginAttempts: 5,
      lockoutDuration: 900000,
      sessionTimeout: 604800000
    }
  };
  
  const configPath = path.join(__dirname, 'pricewatcher-auth.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log('✅ 管理员账号已创建\n');
  console.log('📋 登录信息：');
  console.log('   用户名:', username);
  console.log('   密码:', password);
  console.log('');
  console.log('⚠️  请妥善保管密码！');
  console.log('💡 首次登录后建议修改密码');
  console.log('');
  console.log('配置文件:', configPath);
}

initAdmin().catch(console.error);
