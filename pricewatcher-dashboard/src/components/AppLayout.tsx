import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
}

function logout() {
  localStorage.removeItem('pw_token');
  sessionStorage.removeItem('pw_token');
  window.location.href = '/login';
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        height: 56,
        background: '#000',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ color: '#ededed', fontWeight: 600, fontSize: 15, letterSpacing: '-0.3px' }}>
            PriceWatcher
          </span>
        </div>

        {/* Right: logout */}
        <button
          onClick={logout}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#555',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#888')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          退出
        </button>
      </header>

      {/* Page content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
