import { useState, useEffect } from 'react';
import { message } from 'antd';
import { createTask, updateTask } from '../api/tasks';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** 编辑模式：传入任务数据 */
  initialData?: any;
  /** 编辑模式：保存成功回调 */
  onUpdated?: () => void;
}

const FREQ_PRESETS = [
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '4h', value: 240 },
  { label: '8h', value: 480 },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 34,
  background: '#0a0a0a',
  border: '1px solid #2a2a2a',
  borderRadius: 6,
  padding: '0 10px',
  fontSize: 13,
  color: '#ededed',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#888',
  marginBottom: 5,
  letterSpacing: '0.02em',
};

const sectionStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: '#444',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: '1px solid #1a1a1a',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={e => { e.target.style.borderColor = '#555'; props.onFocus?.(e); }}
      onBlur={e => { e.target.style.borderColor = '#2a2a2a'; props.onBlur?.(e); }}
    />
  );
}

const emptyForm = {
  hotelName: '', city: '', link: '', checkIn: '', checkOut: '',
  roomName: '', ratePlanHint: '', thresholdValue: '', frequencyMinutes: 60, autoStopDate: '',
};

export function AddTaskModal({ open, onClose, onCreated, initialData, onUpdated }: Props) {
  const isEdit = !!initialData;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 编辑模式：打开时预填字段
  useEffect(() => {
    if (open && initialData) {
      setForm({
        hotelName: initialData.hotelName ?? '',
        city: initialData.city ?? '',
        link: initialData.link ?? '',
        checkIn: initialData.checkIn ?? '',
        checkOut: initialData.checkOut ?? '',
        roomName: initialData.roomName ?? '',
        ratePlanHint: initialData.ratePlanHint ?? '',
        thresholdValue: String(initialData.threshold?.value ?? ''),
        frequencyMinutes: initialData.frequencyMinutes ?? 60,
        autoStopDate: initialData.autoStopDate ?? '',
      });
      setErrors({});
    }
    if (open && !initialData) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [open, initialData]);

  function set(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    const today = new Date().toISOString().slice(0, 10);
    if (!form.hotelName.trim()) errs.hotelName = '酒店名称不能为空';
    if (!form.city.trim()) errs.city = '城市不能为空';
    if (!form.roomName.trim()) errs.roomName = '房型名称不能为空';
    if (!form.checkIn) errs.checkIn = '请选择入住日期';
    // 编辑模式下不限制入住日期不能早于今天（历史订单）
    else if (!isEdit && form.checkIn < today) errs.checkIn = '入住日期不能早于今天';
    if (!form.checkOut) errs.checkOut = '请选择退房日期';
    else if (form.checkIn && form.checkOut <= form.checkIn) errs.checkOut = '退房日期须晚于入住日期';
    if (!form.thresholdValue) errs.thresholdValue = '请填写目标价';
    else if (isNaN(Number(form.thresholdValue)) || Number(form.thresholdValue) <= 0) errs.thresholdValue = '目标价须为正数';
    if (!form.frequencyMinutes || form.frequencyMinutes < 10) errs.frequencyMinutes = '频率最小 10 分钟';
    if (form.link.trim()) {
      try { new URL(form.link); } catch { errs.link = '链接格式不正确'; }
    }
    if (form.autoStopDate && form.checkOut && form.autoStopDate < form.checkOut) {
      errs.autoStopDate = '自动停止日期不能早于退房日期';
    }
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const checkIn = form.checkIn;
      const checkOut = form.checkOut;
      const nights = Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
      );
      const payload = {
        hotelName: form.hotelName.trim(),
        city: form.city.trim(),
        roomName: form.roomName.trim(),
        ratePlanHint: form.ratePlanHint.trim(),
        link: form.link.trim() || undefined,
        checkIn,
        checkOut,
        nights,
        threshold: { type: 'absolute', value: Number(form.thresholdValue) },
        frequencyMinutes: form.frequencyMinutes,
        autoStopDate: form.autoStopDate || undefined,
      };

      if (isEdit) {
        await updateTask(initialData.id, payload);
        message.success('任务已更新');
        handleClose();
        onUpdated?.();
      } else {
        await createTask({ ...payload, type: 'hotel', provider: 'ctrip', currency: 'CNY', enabled: true });
        message.success('任务创建成功');
        handleClose();
        onCreated();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || (isEdit ? '更新失败，请重试' : '创建失败，请重试');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setErrors({});
    onClose();
  }

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        background: '#111',
        border: '1px solid #1f1f1f',
        borderRadius: 12,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #1a1a1a',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#ededed' }}>
              {isEdit ? '编辑监控任务' : '添加监控任务'}
            </div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
              {isEdit ? '修改任务信息，价格历史数据保留' : '填写酒店信息，自动开始价格监控'}
            </div>
          </div>
          <button onClick={handleClose} style={{
            background: 'transparent', border: 'none', color: '#555', cursor: 'pointer',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#888')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* 酒店信息 */}
          <div style={sectionStyle}>酒店信息</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="酒店名称" required>
              <FocusInput
                placeholder="如：长沙玛珂酒店"
                value={form.hotelName}
                onChange={e => set('hotelName', e.target.value)}
              />
              {errors.hotelName && <ErrMsg>{errors.hotelName}</ErrMsg>}
            </Field>
            <Field label="城市" required>
              <FocusInput
                placeholder="如：长沙"
                value={form.city}
                onChange={e => set('city', e.target.value)}
              />
              {errors.city && <ErrMsg>{errors.city}</ErrMsg>}
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="房型名称" required>
              <FocusInput
                placeholder="如：豪华大床房"
                value={form.roomName}
                onChange={e => set('roomName', e.target.value)}
              />
              {errors.roomName && <ErrMsg>{errors.roomName}</ErrMsg>}
            </Field>
            <Field label="价格方案提示">
              <FocusInput
                placeholder="如：不含早"
                value={form.ratePlanHint}
                onChange={e => set('ratePlanHint', e.target.value)}
              />
            </Field>
          </div>

          <Field label="携程链接">
            <FocusInput
              placeholder="https://hotels.ctrip.com/..."
              value={form.link}
              onChange={e => set('link', e.target.value)}
            />
            {errors.link && <ErrMsg>{errors.link}</ErrMsg>}
          </Field>

          {/* 日期 */}
          <div style={sectionStyle}>入住日期</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="入住日期" required>
              <FocusInput
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={form.checkIn}
                onChange={e => set('checkIn', e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
              {errors.checkIn && <ErrMsg>{errors.checkIn}</ErrMsg>}
            </Field>
            <Field label="退房日期" required>
              <FocusInput
                type="date"
                min={form.checkIn || new Date().toISOString().slice(0, 10)}
                value={form.checkOut}
                onChange={e => set('checkOut', e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
              {errors.checkOut && <ErrMsg>{errors.checkOut}</ErrMsg>}
            </Field>
          </div>

          {/* 监控设置 */}
          <div style={sectionStyle}>监控设置</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="目标价（¥）" required>
              <FocusInput
                type="number"
                min={1}
                placeholder="低于此价格时通知"
                value={form.thresholdValue}
                onChange={e => set('thresholdValue', e.target.value)}
              />
              {errors.thresholdValue && <ErrMsg>{errors.thresholdValue}</ErrMsg>}
            </Field>
            <Field label="自动停止日期">
              <FocusInput
                type="date"
                min={form.checkOut || new Date().toISOString().slice(0, 10)}
                value={form.autoStopDate}
                onChange={e => set('autoStopDate', e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
              {errors.autoStopDate && <ErrMsg>{errors.autoStopDate}</ErrMsg>}
            </Field>
          </div>

          <Field label="检查频率" required>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FREQ_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => set('frequencyMinutes', p.value)}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    borderRadius: 6,
                    border: form.frequencyMinutes === p.value ? '1px solid #3b82f6' : '1px solid #2a2a2a',
                    background: form.frequencyMinutes === p.value ? '#1d3a5c' : '#0a0a0a',
                    color: form.frequencyMinutes === p.value ? '#60a5fa' : '#666',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min={10}
                  placeholder="自定义"
                  value={FREQ_PRESETS.some(p => p.value === form.frequencyMinutes) ? '' : form.frequencyMinutes}
                  onChange={e => set('frequencyMinutes', Number(e.target.value))}
                  style={{ ...inputStyle, width: 80, height: 32 }}
                  onFocus={e => { e.target.style.borderColor = '#555'; }}
                  onBlur={e => { e.target.style.borderColor = '#2a2a2a'; }}
                />
                <span style={{ fontSize: 12, color: '#555' }}>分钟</span>
              </div>
            </div>
            {errors.frequencyMinutes && <ErrMsg>{errors.frequencyMinutes}</ErrMsg>}
          </Field>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #1a1a1a',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          flexShrink: 0,
        }}>
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              height: 34, padding: '0 16px', borderRadius: 6,
              border: '1px solid #2a2a2a', background: 'transparent',
              color: '#888', fontSize: 13, cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              height: 34, padding: '0 20px', borderRadius: 6,
              border: 'none',
              background: loading ? '#333' : '#fff',
              color: loading ? '#666' : '#000',
              fontSize: 13, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#e5e5e5'); }}
            onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#fff'); }}
          >
            {loading && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="#666" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#aaa" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            )}
            {loading ? (isEdit ? '保存中...' : '创建中...') : (isEdit ? '保存修改' : '创建任务')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
        input[type="number"]::-webkit-inner-spin-button { opacity: 0.3; }
      `}</style>
    </div>
  );
}

function ErrMsg({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{children}</div>;
}
