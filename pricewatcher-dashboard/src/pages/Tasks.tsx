import { useEffect, useState } from 'react';
import {
  Button, Card, Col, Input,
  Row, Space, Table, Tag, Statistic, message,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined,
  CheckCircleFilled, SyncOutlined, PauseCircleFilled,
  EyeOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { fetchTasks } from '../api/tasks';
import { checkNow, fetchSummary } from '../api/taskActions';
import { useNavigate } from 'react-router-dom';
import { PauseResumeButton } from '../components/PauseResumeButton';
import { Filters } from '../components/Filters';
import { AppLayout } from '../components/AppLayout';
import { AddTaskModal } from '../components/AddTaskModal';

export default function Tasks() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [city, setCity] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [enabled, setEnabled] = useState<string | undefined>();
  const [checkInRange, setCheckInRange] = useState<[string, string] | undefined>();
  const [priceMin, setPriceMin] = useState<number | undefined>();
  const [priceMax, setPriceMax] = useState<number | undefined>();
  const [belowTarget, setBelowTarget] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<any>('checkIn');
  const [sortOrder, setSortOrder] = useState<any>('asc');

  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const [data, sum] = await Promise.all([
        fetchTasks({
          page, pageSize, city, status,
          enabled: enabled ?? undefined,
          checkInFrom: checkInRange?.[0],
          checkInTo: checkInRange?.[1],
          currentPriceMin: priceMin,
          currentPriceMax: priceMax,
          belowTarget: belowTarget ?? undefined,
          sortBy, sortOrder,
          hotelName: q || undefined,
        }),
        fetchSummary().catch(() => null),
      ]);
      setRows(data.tasks);
      setTotal(data.total);
      if (sum) setSummary(sum);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, pageSize, city, status, enabled, checkInRange, priceMin, priceMax, belowTarget, sortBy, sortOrder]);

  async function handleCheckNow(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckingId(id);
    try {
      await checkNow(id);
      message.success('已标记立即检查，下次调度将优先执行');
      load();
    } catch {
      message.error('操作失败');
    } finally {
      setCheckingId(null);
    }
  }

  const columns = [
    {
      title: '酒店信息',
      render: (_: any, r: any) => (
        <div>
          <div style={{ color: '#ededed', fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{r.hotelName}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{r.city} · {r.roomName}</div>
        </div>
      ),
    },
    {
      title: '入住日期',
      width: 160,
      render: (_: any, r: any) => (
        <div>
          <div style={{ color: '#ededed', fontSize: 13 }}>{r.checkIn}</div>
          <div style={{ color: '#666', fontSize: 11 }}>至 {r.checkOut}</div>
        </div>
      ),
    },
    {
      title: '当前价格',
      width: 110,
      render: (_: any, r: any) => {
        const hit = r.lastPrice != null && r.lastPrice < r.threshold.value;
        return (
          <span style={{ color: hit ? '#22c55e' : '#ededed', fontWeight: 600, fontSize: 15 }}>
            {r.lastPrice == null ? '—' : `¥${r.lastPrice}`}
          </span>
        );
      },
    },
    {
      title: '目标价',
      width: 100,
      render: (_: any, r: any) => (
        <span style={{ color: '#666', fontSize: 13 }}>{`< ¥${r.threshold?.value}`}</span>
      ),
    },
    {
      title: '状态',
      width: 120,
      render: (_: any, r: any) => {
        const isEnabled = r.enabled ?? true;
        if (!isEnabled) return <Tag icon={<PauseCircleFilled />} style={{ background: '#1a1a1a', color: '#666', border: 'none' }}>已暂停</Tag>;
        const below = r.lastPrice != null && r.lastPrice < r.threshold.value;
        if (below) return <Tag icon={<CheckCircleFilled />} style={{ background: '#052e16', color: '#22c55e', border: 'none' }}>已达成</Tag>;
        return <Tag icon={<SyncOutlined spin />} style={{ background: '#0c1a2e', color: '#60a5fa', border: 'none' }}>监控中</Tag>;
      },
    },
    {
      title: '',
      width: 180,
      align: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Button
            size="small"
            type="text"
            icon={<ThunderboltOutlined />}
            loading={checkingId === r.id}
            style={{ color: '#f59e0b', fontSize: 12 }}
            onClick={(e) => handleCheckNow(r.id, e)}
          >
            立即检查
          </Button>
          <Button
            size="small"
            type="text"
            icon={<EyeOutlined />}
            style={{ color: '#888' }}
            onClick={() => navigate(`/tasks/${r.id}`)}
          >
            详情
          </Button>
          <PauseResumeButton id={r.id} enabled={(r.enabled ?? true) === true} onChanged={load} />
        </Space>
      ),
    },
  ];

  function resetFilters() {
    setCity(undefined); setStatus(undefined); setEnabled(undefined);
    setCheckInRange(undefined); setPriceMin(undefined); setPriceMax(undefined);
    setBelowTarget(undefined); setSortBy('checkIn'); setSortOrder('asc');
    setQ(''); setPage(1);
  }

  const statCards = [
    { label: 'TOTAL TASKS', value: summary?.total ?? total, color: '#ededed' },
    { label: 'MONITORING', value: summary?.active ?? '—', color: '#60a5fa' },
    { label: 'TARGET MET', value: summary?.reached ?? '—', color: '#22c55e' },
    { label: 'PAUSED', value: summary?.paused ?? '—', color: '#555' },
  ];

  return (
    <AppLayout>
      <div style={{ padding: '32px 40px' }}>
        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: 28 }}>
          {statCards.map(item => (
            <Col span={6} key={item.label}>
              <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8 }}>
                <Statistic
                  title={<span style={{ color: '#444', fontSize: 11, letterSpacing: '0.08em', fontWeight: 500 }}>{item.label}</span>}
                  value={item.value}
                  valueStyle={{ color: item.color, fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Table */}
        <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Space size={8}>
              <Input
                placeholder="搜索酒店名称..."
                prefix={<SearchOutlined style={{ color: '#444' }} />}
                style={{ width: 260, background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, color: '#ededed' }}
                value={q}
                onChange={e => setQ(e.target.value)}
                onPressEnter={() => { setPage(1); load(); }}
                allowClear
              />
              <Filters
                city={city} setCity={v => { setPage(1); setCity(v); }}
                status={status} setStatus={v => { setPage(1); setStatus(v); }}
                enabled={enabled} setEnabled={v => { setPage(1); setEnabled(v); }}
                checkInRange={checkInRange} setCheckInRange={v => { setPage(1); setCheckInRange(v); }}
                priceMin={priceMin} setPriceMin={v => { setPage(1); setPriceMin(v); }}
                priceMax={priceMax} setPriceMax={v => { setPage(1); setPriceMax(v); }}
                belowTarget={belowTarget} setBelowTarget={v => { setPage(1); setBelowTarget(v); }}
                sortBy={sortBy} setSortBy={v => { setPage(1); setSortBy(v); }}
                sortOrder={sortOrder} setSortOrder={v => { setPage(1); setSortOrder(v); }}
                cityOptions={[...new Set(rows.map((r: any) => r.city))]}
              />
            </Space>
            <Space size={8}>
              <Button icon={<ReloadOutlined />} onClick={resetFilters} style={{ fontSize: 12, borderColor: '#2a2a2a', background: '#0a0a0a', color: '#888' }}>重置</Button>
              <Button icon={<ReloadOutlined />} onClick={load} style={{ fontSize: 12, borderColor: '#2a2a2a', background: '#0a0a0a', color: '#888' }}>刷新</Button>
              <button
                onClick={() => setAddModalOpen(true)}
                style={{
                  height: 32, padding: '0 14px', borderRadius: 6,
                  border: 'none', background: '#fff', color: '#000',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e5e5e5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                添加任务
              </button>
            </Space>
          </div>

          <Table
            rowKey="id"
            loading={loading}
            columns={columns as any}
            dataSource={rows}
            pagination={{
              total,
              current: page,
              pageSize,
              showSizeChanger: true,
              showTotal: t => <span style={{ color: '#444', fontSize: 12 }}>{t} 个任务</span>,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
            onRow={r => ({ onClick: () => navigate(`/tasks/${r.id}`), style: { cursor: 'pointer' } })}
          />
        </Card>
      </div>

      <AddTaskModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={() => { setPage(1); load(); }}
      />
    </AppLayout>
  );
}
