import { useState } from 'react';
import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { login as loginApi } from '../api/auth';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = form.getFieldsValue();
    if (!values.username || !values.password) {
      message.error('请填写用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const { token } = await loginApi(values.username, values.password);
      if (remember) localStorage.setItem('pw_token', token);
      else sessionStorage.setItem('pw_token', token);
      message.success('登录成功');
      navigate('/');
    } catch (e: any) {
      message.error(e?.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      padding: '24px',
    }}>
      {/* Logo / Title */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          width: 40,
          height: 40,
          background: '#fff',
          borderRadius: 8,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#ededed', letterSpacing: '-0.3px' }}>
          PriceWatcher
        </div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
          登录以继续使用控制台
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: '#111',
        border: '1px solid #1f1f1f',
        borderRadius: 12,
        padding: '28px 24px',
      }}>
        <Form form={form} layout="vertical" onSubmitCapture={onSubmit}>
          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: '#ededed',
              marginBottom: 6,
            }}>
              用户名
            </label>
            <Form.Item name="username" noStyle>
              <input
                type="text"
                placeholder="admin"
                autoComplete="username"
                style={{
                  width: '100%',
                  height: 36,
                  background: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  padding: '0 12px',
                  fontSize: 14,
                  color: '#ededed',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#555'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                onChange={e => form.setFieldValue('username', e.target.value)}
              />
            </Form.Item>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: '#ededed',
              marginBottom: 6,
            }}>
              密码
            </label>
            <Form.Item name="password" noStyle>
              <input
                type="password"
                placeholder="请输入密码"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  height: 36,
                  background: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  padding: '0 12px',
                  fontSize: 14,
                  color: '#ededed',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#555'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                onChange={e => form.setFieldValue('password', e.target.value)}
              />
            </Form.Item>
          </div>

          {/* Remember me */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}>
            <div
              onClick={() => setRemember(!remember)}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: remember ? '1px solid #fff' : '1px solid #3a3a3a',
                background: remember ? '#fff' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {remember && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span
              style={{ fontSize: 13, color: '#888', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setRemember(!remember)}
            >
              记住我（7天）
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 36,
              background: loading ? '#333' : '#fff',
              color: loading ? '#666' : '#000',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, opacity 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#e5e5e5'; }}
            onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#fff'; }}
          >
            {loading && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="#666" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#aaa" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            )}
            {loading ? '登录中...' : '登录'}
          </button>
        </Form>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, fontSize: 12, color: '#444', textAlign: 'center' }}>
        PriceWatcher · 价格监控系统
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
