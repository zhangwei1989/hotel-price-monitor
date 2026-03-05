import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';

export default function Home() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div style={{ padding: '48px 40px', maxWidth: 800 }}>
        {/* Welcome */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#ededed',
            letterSpacing: '-0.5px',
            margin: '0 0 8px',
          }}>
            欢迎回来
          </h1>
          <p style={{ fontSize: 14, color: '#555', margin: 0 }}>
            PriceWatcher 正在为你监控酒店价格变动
          </p>
        </div>

        {/* Nav cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <NavCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            }
            title="监控任务"
            desc="查看所有价格监控任务，手动触发检查"
            onClick={() => navigate('/tasks')}
          />
          <NavCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            title="价格趋势"
            desc="进入任务详情查看历史价格走势图表"
            onClick={() => navigate('/tasks')}
          />
        </div>
      </div>
    </AppLayout>
  );
}

function NavCard({ icon, title, desc, onClick }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#111',
        border: '1px solid #1f1f1f',
        borderRadius: 10,
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#333';
        (e.currentTarget as HTMLDivElement).style.background = '#161616';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#1f1f1f';
        (e.currentTarget as HTMLDivElement).style.background = '#111';
      }}
    >
      <div style={{ color: '#888' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#ededed', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#555' }}>{desc}</div>
      </div>
    </div>
  );
}
