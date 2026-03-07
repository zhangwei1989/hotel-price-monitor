import { useState, useEffect, useCallback } from 'react';
import { Button, Input, message, Modal, Spin } from 'antd';
import {
  FileTextOutlined, GlobalOutlined, PlusOutlined,
  SaveOutlined, ReloadOutlined, BookOutlined, EyeOutlined, EditOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { AppLayout } from '../components/AppLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const HOTEL_DB_PATH = `${API_BASE}/api/agent/hotel-db`;
const PROMPTS_PATH = `${API_BASE}/api/agent/prompts`;

interface HotelFile {
  name: string;
  isGlobal: boolean;
  isTemplate: boolean;
  content: string;
  updatedAt?: string;
}

// 话术配置项定义
const PROMPT_ITEMS = [
  { key: 'classify', label: '意图分类', desc: '判断消息类型：价格/技术/默认/不回复', filename: 'classify_prompt_example.txt', color: '#f59e0b' },
  { key: 'default',  label: '通用话术', desc: '物流/售后/打招呼等通用场景', filename: 'default_prompt_example.txt', color: '#60a5fa' },
  { key: 'price',    label: '价格话术', desc: '议价策略与让步逻辑', filename: 'price_prompt_example.txt', color: '#34d399' },
  { key: 'tech',     label: '技术话术', desc: '产品参数解答', filename: 'tech_prompt_example.txt', color: '#a78bfa' },
];

// ── 深色 Markdown 预览 ───────────────────────────────────────
function MarkdownPreview({ content }: { content: string }) {
  const html = content
    .replace(/^### (.+)$/gm, '<h3 style="font-size:13px;font-weight:600;color:#ccc;margin:14px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:15px;font-weight:700;color:#ddd;margin:18px 0 6px;border-bottom:1px solid #222;padding-bottom:4px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:17px;font-weight:700;color:#ededed;margin:18px 0 8px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#ededed">$1</strong>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc;color:#aaa;margin-bottom:2px">$1</li>')
    .replace(/^<!--[\s\S]*?-->$/gm, '<span style="color:#333;font-size:11px;font-style:italic">[注释已隐藏]</span>')
    .replace(/\n\n/g, '<br/>')
    .replace(/\n/g, '<br/>');
  return (
    <div
      style={{ padding: '16px 20px', fontSize: 13, lineHeight: 1.9, color: '#aaa' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── 侧边栏菜单项 ─────────────────────────────────────────────
function SideItem({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 16px', cursor: 'pointer', fontSize: 13,
        borderRadius: 0,
        background: active ? '#1a2a3a' : 'transparent',
        color: active ? '#60a5fa' : '#aaa',
        fontWeight: active ? 600 : 400,
        borderLeft: active ? '2px solid #60a5fa' : '2px solid transparent',
        transition: 'all 0.15s',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = '#111'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <span style={{ flexShrink: 0, fontSize: 13 }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </div>
  );
}

// 选中项类型：hotel 文件 or prompt 配置
type SelectedItem =
  | { type: 'hotel'; file: HotelFile }
  | { type: 'prompt'; key: string; label: string; desc: string; filename: string; color: string; content: string };

export default function AgentKnowledge() {
  const [files, setFiles] = useState<HotelFile[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(`${HOTEL_DB_PATH}/list`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      setFiles([
        { name: '_global_scripts', isGlobal: true, isTemplate: false, content: '', updatedAt: '' },
        { name: '_template', isGlobal: false, isTemplate: true, content: '', updatedAt: '' },
      ]);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // 选择酒店知识库文件
  const selectHotelFile = async (file: HotelFile) => {
    setLoading(true);
    setPreview(false);
    try {
      const res = await fetch(`${HOTEL_DB_PATH}/file?name=${encodeURIComponent(file.name)}`);
      const data = await res.json();
      const loaded = { ...file, content: data.content || '' };
      setSelected({ type: 'hotel', file: loaded });
      setEditContent(loaded.content);
    } catch {
      setSelected({ type: 'hotel', file });
      setEditContent(file.content || '');
    }
    setLoading(false);
  };

  // 选择话术配置项
  const selectPrompt = async (item: typeof PROMPT_ITEMS[0]) => {
    setLoading(true);
    setPreview(false);
    try {
      const res = await fetch(`${PROMPTS_PATH}/file?name=${encodeURIComponent(item.filename)}`);
      const data = await res.json();
      const content = data.content || '';
      setSelected({ type: 'prompt', ...item, content });
      setEditContent(content);
    } catch {
      // 后端未连通时显示空内容
      setSelected({ type: 'prompt', ...item, content: '' });
      setEditContent('');
    }
    setLoading(false);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (selected.type === 'hotel') {
        await fetch(`${HOTEL_DB_PATH}/file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: selected.file.name, content: editContent }),
        });
      } else {
        await fetch(`${PROMPTS_PATH}/file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: selected.filename, content: editContent }),
        });
      }
      message.success('保存成功');
      if (selected.type === 'hotel') loadFiles();
    } catch {
      message.warning('后端未连接，内容仅在本地展示');
    }
    setSaving(false);
  };

  const createHotel = async () => {
    if (!newName.trim()) { message.warning('请输入酒店名称'); return; }
    setCreating(true);
    try {
      let tplContent = '';
      try {
        const tplRes = await fetch(`${HOTEL_DB_PATH}/file?name=_template`);
        const tplData = await tplRes.json();
        tplContent = tplData.content || '';
      } catch { /* ignore */ }
      await fetch(`${HOTEL_DB_PATH}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), content: tplContent }),
      });
      message.success(`已创建「${newName.trim()}」知识库`);
      setCreateModalOpen(false);
      const n = newName.trim();
      setNewName('');
      await loadFiles();
      selectHotelFile({ name: n, isGlobal: false, isTemplate: false, content: tplContent });
    } catch {
      message.warning('后端未连接，创建成功（本地模拟）');
      setCreateModalOpen(false);
    }
    setCreating(false);
  };

  const reloadAgent = async () => {
    setReloading(true);
    try {
      await fetch(`${API_BASE}/api/agent/reload-knowledge`, { method: 'POST' });
      message.success('Agent 知识库已重载');
    } catch {
      message.info('Agent 将在下次重启时自动加载最新知识库');
    }
    setReloading(false);
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const globalFiles = filtered.filter(f => f.isGlobal || f.isTemplate);
  const hotelFiles = filtered.filter(f => !f.isGlobal && !f.isTemplate);

  const dark = {
    bg: '#0a0a0a', card: '#111', border: '#1f1f1f',
    sider: '#0d0d0d', text: '#ededed', muted: '#555', accent: '#60a5fa',
  };

  // 当前选中的 prompt key（用于高亮侧边栏）
  const activePromptKey = selected?.type === 'prompt' ? selected.key : null;
  // 当前选中的 hotel name
  const activeHotelName = selected?.type === 'hotel' ? selected.file.name : null;

  // 右侧标题信息
  const rightTitle = selected == null ? null
    : selected.type === 'hotel'
      ? { label: selected.file.isGlobal ? '通用话术' : selected.file.isTemplate ? '酒店模板' : selected.file.name, tag: selected.file.isGlobal ? '全局' : null, tagColor: '#60a5fa', tagBg: '#0d1f33', tagBorder: '#1a3a5a', icon: selected.file.isGlobal ? <GlobalOutlined style={{ color: '#60a5fa' }} /> : selected.file.isTemplate ? <FileTextOutlined style={{ color: '#555' }} /> : <BookOutlined style={{ color: '#34d399' }} /> }
      : { label: selected.label, tag: '话术', tagColor: selected.color, tagBg: '#111', tagBorder: '#333', icon: <MessageOutlined style={{ color: selected.color }} /> };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', background: dark.bg, overflow: 'hidden' }}>

        {/* ── 页面标题区 ── */}
        <div style={{ padding: '24px 32px 16px', borderBottom: `1px solid ${dark.border}`, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#ededed' }}>AI 客服</h2>
          <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>管理话术配置、酒店知识库与通用话术</p>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── 左侧边栏 ── */}
          <div style={{
            width: 220, flexShrink: 0, background: dark.sider,
            borderRight: `1px solid ${dark.border}`, display: 'flex', flexDirection: 'column',
          }}>
            {/* 搜索（只对酒店搜索） */}
            <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${dark.border}` }}>
              <input
                placeholder="搜索酒店..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', background: '#111', border: '1px solid #1f1f1f',
                  borderRadius: 6, color: '#888', fontSize: 12, padding: '5px 10px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 文件列表 */}
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: 6 }}>

              {/* ─ 话术配置分组 ─ */}
              <div style={{ padding: '6px 16px 3px', fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em' }}>话术配置</div>
              {PROMPT_ITEMS.map(item => (
                <SideItem
                  key={item.key}
                  icon={<MessageOutlined style={{ color: activePromptKey === item.key ? item.color : '#2a2a2a' }} />}
                  label={item.label}
                  active={activePromptKey === item.key}
                  onClick={() => selectPrompt(item)}
                />
              ))}

              {/* ─ 全局配置分组 ─ */}
              <div style={{ padding: '10px 16px 3px', fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em' }}>全局配置</div>
              {globalFiles.map(f => (
                <SideItem
                  key={f.name}
                  icon={f.isGlobal
                    ? <GlobalOutlined style={{ color: activeHotelName === f.name ? '#60a5fa' : '#3a5a7a' }} />
                    : <FileTextOutlined style={{ color: activeHotelName === f.name ? '#888' : '#2a2a2a' }} />}
                  label={f.isGlobal ? '通用话术' : '酒店模板'}
                  active={activeHotelName === f.name}
                  onClick={() => selectHotelFile(f)}
                />
              ))}

              {/* ─ 酒店知识库分组 ─ */}
              <div style={{ padding: '10px 16px 3px', fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                酒店知识库
                <span style={{ background: '#161616', color: '#3a3a3a', borderRadius: 8, padding: '0 5px', fontSize: 10, border: '1px solid #222' }}>{hotelFiles.length}</span>
              </div>
              {hotelFiles.length === 0
                ? <div style={{ padding: '6px 16px', fontSize: 12, color: '#2a2a2a' }}>暂无酒店</div>
                : hotelFiles.map(f => (
                  <SideItem
                    key={f.name}
                    icon={<BookOutlined style={{ color: activeHotelName === f.name ? '#34d399' : '#1a3a2a' }} />}
                    label={f.name}
                    active={activeHotelName === f.name}
                    onClick={() => selectHotelFile(f)}
                  />
                ))
              }
            </div>

            {/* 底部按钮 */}
            <div style={{ padding: 12, borderTop: `1px solid ${dark.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                type="primary" size="small" icon={<PlusOutlined />} block
                onClick={() => setCreateModalOpen(true)}
                style={{ background: '#1677ff', border: 'none' }}
              >
                新增酒店
              </Button>
              <Button
                size="small" icon={<ReloadOutlined />} block
                onClick={reloadAgent} loading={reloading}
                style={{ background: '#161616', border: '1px solid #222', color: '#888' }}
              >
                通知 Agent 重载
              </Button>
            </div>
          </div>

          {/* ── 右侧编辑区 ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selected ? (
              <>
                {/* 顶部工具栏 */}
                <div style={{
                  background: dark.card, borderBottom: `1px solid ${dark.border}`,
                  padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {rightTitle?.icon}
                    <span style={{ fontSize: 14, fontWeight: 600, color: dark.text }}>{rightTitle?.label}</span>
                    {rightTitle?.tag && (
                      <span style={{ fontSize: 11, color: rightTitle.tagColor, background: rightTitle.tagBg, padding: '1px 8px', borderRadius: 10, border: `1px solid ${rightTitle.tagBorder}` }}>
                        {rightTitle.tag}
                      </span>
                    )}
                    {selected.type === 'prompt' && (
                      <span style={{ fontSize: 11, color: '#444' }}>{selected.desc}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button.Group size="small">
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => setPreview(false)}
                        style={{ background: !preview ? '#1677ff' : '#161616', border: '1px solid #222', color: !preview ? '#fff' : '#666' }}
                      >编辑</Button>
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => setPreview(true)}
                        style={{ background: preview ? '#1677ff' : '#161616', border: '1px solid #222', color: preview ? '#fff' : '#666' }}
                      >预览</Button>
                    </Button.Group>
                    <Button
                      type="primary" size="small" icon={<SaveOutlined />}
                      loading={saving} onClick={save}
                      style={{ background: '#1677ff', border: 'none' }}
                    >
                      保存
                    </Button>
                  </div>
                </div>

                {/* 提示条 */}
                {selected.type === 'hotel' && selected.file.isGlobal && (
                  <div style={{ background: '#0d1a0d', borderBottom: '1px solid #1a2a1a', padding: '6px 20px', fontSize: 12, color: '#4a7a4a' }}>
                    📋 通用话术适用于所有酒店，单酒店知识库中有同名话术时优先使用单酒店版本。
                  </div>
                )}
                {selected.type === 'prompt' && (
                  <div style={{ background: '#1a1200', borderBottom: '1px solid #2a2000', padding: '6px 20px', fontSize: 12, color: '#7a6a00' }}>
                    ⚠️ 修改话术配置后需点击「通知 Agent 重载」或重启 xianyu-agent 才能生效。文件路径：<code style={{ color: '#888', fontSize: 11 }}>xianyu-agent/prompts/{selected.filename}</code>
                  </div>
                )}

                {/* 编辑器 */}
                <div style={{ flex: 1, overflow: 'hidden', padding: 16, background: dark.bg }}>
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
                      <Spin />
                    </div>
                  ) : preview ? (
                    <div style={{ height: '100%', overflowY: 'auto', background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8 }}>
                      <MarkdownPreview content={editContent} />
                    </div>
                  ) : (
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      spellCheck={false}
                      style={{
                        width: '100%', height: '100%', resize: 'none', outline: 'none',
                        background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8,
                        color: '#ccc', fontFamily: 'Monaco, Menlo, Consolas, monospace',
                        fontSize: 13, lineHeight: 1.7, padding: '16px 20px',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 48 }}>🤖</div>
                <div style={{ color: dark.muted, fontSize: 14 }}>从左侧选择话术配置或酒店知识库</div>
                <div style={{ color: '#333', fontSize: 12 }}>话术配置影响回复策略，酒店知识库影响回复内容</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 新建弹窗 ── */}
      <Modal
        title={<span style={{ color: dark.text }}>新增酒店知识库</span>}
        open={createModalOpen}
        onOk={createHotel}
        onCancel={() => { setCreateModalOpen(false); setNewName(''); }}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
        width={400}
        styles={{ body: { background: dark.card }, content: { background: dark.card }, header: { background: dark.card } }}
      >
        <div style={{ paddingBottom: 8 }}>
          <div style={{ fontSize: 12, color: dark.muted, marginBottom: 10 }}>
            输入酒店名称，将以模板内容初始化知识库。
          </div>
          <Input
            autoFocus
            placeholder="例如：上海外滩华尔道夫"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onPressEnter={createHotel}
            style={{ background: '#161616', border: '1px solid #333', color: '#ccc' }}
          />
          {newName && (
            <div style={{ fontSize: 11, color: '#444', marginTop: 8 }}>
              创建后在商品描述中加入：[hotel:{newName}]
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
