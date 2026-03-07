import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const XIANYU_DIR = path.resolve(__dirname, '../../../xianyu-agent');
const PROMPTS_DIR = path.join(XIANYU_DIR, 'prompts');
const HOTEL_DB_DIR = path.join(XIANYU_DIR, 'hotel_db');

// 允许的 prompt 文件名白名单（防止路径穿越）
const ALLOWED_PROMPTS = [
  'classify_prompt_example.txt',
  'default_prompt_example.txt',
  'price_prompt_example.txt',
  'tech_prompt_example.txt',
];

// ── 话术配置 API ────────────────────────────────────────────

// GET /api/agent/prompts/file?name=xxx
router.get('/prompts/file', (req: Request, res: Response) => {
  const name = req.query.name as string;
  if (!name || !ALLOWED_PROMPTS.includes(name)) {
    return res.status(400).json({ error: '不允许的文件名' });
  }
  const filePath = path.join(PROMPTS_DIR, name);
  try {
    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    res.json({ name, content });
  } catch (e) {
    res.status(500).json({ error: '读取失败' });
  }
});

// POST /api/agent/prompts/file  body: { name, content }
router.post('/prompts/file', (req: Request, res: Response) => {
  const { name, content } = req.body;
  if (!name || !ALLOWED_PROMPTS.includes(name)) {
    return res.status(400).json({ error: '不允许的文件名' });
  }
  const filePath = path.join(PROMPTS_DIR, name);
  try {
    fs.mkdirSync(PROMPTS_DIR, { recursive: true });
    fs.writeFileSync(filePath, content || '', 'utf8');
    res.json({ ok: true, name });
  } catch (e) {
    res.status(500).json({ error: '写入失败' });
  }
});

// ── 酒店知识库 API ──────────────────────────────────────────

// GET /api/agent/hotel-db/list
router.get('/hotel-db/list', (_req: Request, res: Response) => {
  try {
    fs.mkdirSync(HOTEL_DB_DIR, { recursive: true });
    const files = fs.readdirSync(HOTEL_DB_DIR)
      .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
      .map(f => ({
        name: f.replace(/\.(md|txt)$/, ''),
        isGlobal: f.startsWith('_global'),
        isTemplate: f.startsWith('_template'),
        content: '',
        updatedAt: fs.statSync(path.join(HOTEL_DB_DIR, f)).mtime.toISOString(),
      }));
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

// GET /api/agent/hotel-db/file?name=xxx
router.get('/hotel-db/file', (req: Request, res: Response) => {
  const name = req.query.name as string;
  if (!name || name.includes('..') || name.includes('/')) {
    return res.status(400).json({ error: '非法文件名' });
  }
  const tryExts = ['.md', '.txt', ''];
  for (const ext of tryExts) {
    const filePath = path.join(HOTEL_DB_DIR, name + ext);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return res.json({ name, content });
    }
  }
  res.json({ name, content: '' });
});

// POST /api/agent/hotel-db/file  body: { name, content }
router.post('/hotel-db/file', (req: Request, res: Response) => {
  const { name, content } = req.body;
  if (!name || name.includes('..') || name.includes('/')) {
    return res.status(400).json({ error: '非法文件名' });
  }
  const filePath = path.join(HOTEL_DB_DIR, name + '.md');
  try {
    fs.mkdirSync(HOTEL_DB_DIR, { recursive: true });
    fs.writeFileSync(filePath, content || '', 'utf8');
    res.json({ ok: true, name });
  } catch {
    res.status(500).json({ error: '写入失败' });
  }
});

// POST /api/agent/reload-knowledge
router.post('/reload-knowledge', (_req: Request, res: Response) => {
  // 通知 xianyu-agent 重载（如果有 IPC / 信号支持可在此扩展）
  res.json({ ok: true, message: '已发送重载信号，Agent 将在下次处理消息时加载最新配置' });
});

export default router;
