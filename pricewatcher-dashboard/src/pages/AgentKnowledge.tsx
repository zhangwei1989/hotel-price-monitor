import React, { useState, useEffect, useCallback } from 'react';

// ── 类型定义 ──────────────────────────────────────────────
interface HotelFile {
  name: string;
  isGlobal: boolean;
  isTemplate: boolean;
  content: string;
  updatedAt?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const HOTEL_DB_PATH = `${API_BASE}/api/agent/hotel-db`;

// ── 简单 Markdown 编辑器（textarea + 预览切换）──────────────
function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [preview, setPreview] = useState(false);

  // 极简 md → html（只处理标题和加粗）
  const toHtml = (md: string) =>
    md
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-1 border-b pb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\n/g, '<br/>');

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setPreview(false)}
          className={`px-3 py-1 text-xs rounded ${!preview ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          编辑
        </button>
        <button
          onClick={() => setPreview(true)}
          className={`px-3 py-1 text-xs rounded ${preview ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          预览
        </button>
      </div>
      {preview ? (
        <div
          className="flex-1 p-3 border rounded bg-white text-sm overflow-auto"
          dangerouslySetInnerHTML={{ __html: toHtml(value) }}
        />
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 p-3 border rounded font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          spellCheck={false}
        />
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────
export default function AgentKnowledge() {
  const [files, setFiles] = useState<HotelFile[]>([]);
  const [selected, setSelected] = useState<HotelFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [reloading, setReloading] = useState(false);

  // ── 读取文件列表 ─────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(`${HOTEL_DB_PATH}/list`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      // API 未就绪时使用 mock 数据
      setFiles([
        { name: '_global_scripts', isGlobal: true, isTemplate: false, content: '', updatedAt: '' },
        { name: '_template', isGlobal: false, isTemplate: true, content: '', updatedAt: '' },
      ]);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // ── 选中文件 ─────────────────────────────────────────────
  const selectFile = async (file: HotelFile) => {
    try {
      const res = await fetch(`${HOTEL_DB_PATH}/file?name=${encodeURIComponent(file.name)}`);
      const data = await res.json();
      const loaded = { ...file, content: data.content || '' };
      setSelected(loaded);
      setEditContent(loaded.content);
    } catch {
      setSelected(file);
      setEditContent(file.content || '');
    }
    setSaveMsg('');
  };

  // ── 保存 ─────────────────────────────────────────────────
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`${HOTEL_DB_PATH}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selected.name, content: editContent }),
      });
      setSaveMsg('✅ 已保存');
      loadFiles();
    } catch {
      setSaveMsg('❌ 保存失败');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 2000);
  };

  // ── 新建酒店 ─────────────────────────────────────────────
  const createHotel = async () => {
    if (!newName.trim()) return;
    try {
      // 读取模板内容
      const tplRes = await fetch(`${HOTEL_DB_PATH}/file?name=_template`);
      const tplData = await tplRes.json();
      await fetch(`${HOTEL_DB_PATH}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), content: tplData.content || '' }),
      });
      setCreating(false);
      setNewName('');
      await loadFiles();
      // 自动选中新建的文件
      const newFile: HotelFile = { name: newName.trim(), isGlobal: false, isTemplate: false, content: tplData.content || '' };
      selectFile(newFile);
    } catch {
      alert('创建失败，请检查后端服务');
    }
  };

  // ── 通知 agent 重载知识库 ────────────────────────────────
  const reloadAgent = async () => {
    setReloading(true);
    try {
      await fetch(`${API_BASE}/api/agent/reload-knowledge`, { method: 'POST' });
      setSaveMsg('✅ Agent 知识库已重载');
    } catch {
      setSaveMsg('⚠️ 重载信号发送失败（agent 将在下次重启时自动加载）');
    }
    setReloading(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  // ── 过滤 ─────────────────────────────────────────────────
  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const globalFiles = filtered.filter(f => f.isGlobal || f.isTemplate);
  const hotelFiles = filtered.filter(f => !f.isGlobal && !f.isTemplate);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* ── 左侧文件列表 ── */}
      <div className="w-64 flex-shrink-0 bg-white border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="text-sm font-semibold text-gray-700 mb-2">客服知识库</div>
          <input
            type="text"
            placeholder="搜索酒店..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* 全局配置 */}
          <div className="px-3 pt-3 pb-1 text-xs text-gray-400 font-medium uppercase tracking-wide">全局配置</div>
          {globalFiles.map(f => (
            <button
              key={f.name}
              onClick={() => selectFile(f)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${selected?.name === f.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
            >
              <span className="text-base">{f.isGlobal ? '📋' : '📄'}</span>
              <span className="truncate">{f.isGlobal ? '通用话术' : '酒店模板'}</span>
            </button>
          ))}

          {/* 酒店列表 */}
          <div className="px-3 pt-3 pb-1 text-xs text-gray-400 font-medium uppercase tracking-wide flex items-center justify-between">
            <span>酒店知识库</span>
            <span className="text-gray-300">{hotelFiles.length}</span>
          </div>
          {hotelFiles.map(f => (
            <button
              key={f.name}
              onClick={() => selectFile(f)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${selected?.name === f.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
            >
              <span className="text-base">🏨</span>
              <span className="truncate">{f.name}</span>
            </button>
          ))}

          {hotelFiles.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">暂无酒店知识库<br/>点击下方「新增酒店」</div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="p-3 border-t space-y-2">
          {creating ? (
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                placeholder="酒店名称"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createHotel()}
                className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button onClick={createHotel} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">确认</button>
              <button onClick={() => { setCreating(false); setNewName(''); }} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">取消</button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + 新增酒店
            </button>
          )}
          <button
            onClick={reloadAgent}
            disabled={reloading}
            className="w-full py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {reloading ? '重载中...' : '🔄 通知 Agent 重载'}
          </button>
        </div>
      </div>

      {/* ── 右侧编辑区 ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* 顶部工具栏 */}
            <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-800 text-sm">
                  {selected.isGlobal ? '📋 通用话术' : selected.isTemplate ? '📄 酒店模板' : `🏨 ${selected.name}`}
                </span>
                {selected.updatedAt && (
                  <span className="ml-2 text-xs text-gray-400">最后更新：{selected.updatedAt}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {saveMsg && <span className="text-xs text-gray-500">{saveMsg}</span>}
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>

            {/* 说明栏（全局话术/模板时显示） */}
            {(selected.isGlobal || selected.isTemplate) && (
              <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-xs text-amber-700">
                {selected.isGlobal
                  ? '📋 通用话术：适用于所有酒店。单酒店知识库中若有同名话术，会优先使用单酒店版本。'
                  : '📄 模板文件：新建酒店时会复制此模板作为初始内容。'}
              </div>
            )}

            {/* 编辑器 */}
            <div className="flex-1 p-4 overflow-hidden">
              <MarkdownEditor value={editContent} onChange={setEditContent} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">🏨</div>
              <div className="text-sm">从左侧选择酒店知识库进行编辑</div>
              <div className="text-xs mt-1 text-gray-300">或点击「新增酒店」创建第一个酒店知识库</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
