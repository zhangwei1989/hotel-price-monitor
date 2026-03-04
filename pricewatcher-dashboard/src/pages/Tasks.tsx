import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, Input, Layout, Row,
  Space, Table, Tag, Typography, Statistic,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, LogoutOutlined,
  CheckCircleFilled, SyncOutlined, PauseCircleFilled, EyeOutlined,
} from '@ant-design/icons';
import { fetchTasks } from '../api/tasks';
import { useNavigate } from 'react-router-dom';
import { PauseResumeButton } from '../components/PauseResumeButton';
import { Filters } from '../components/Filters';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function Tasks() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');

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
      const data = await fetchTasks({
        page, pageSize, city, status,
        enabled: enabled ?? undefined,
        checkInFrom: checkInRange?.[0],
        checkInTo: checkInRange?.[1],
        currentPriceMin: priceMin,
        currentPriceMax: priceMax,
        belowTarget: belowTarget ?? undefined,
        sortBy, sortOrder,
        hotelName: q || undefined,
      });
      setRows(data.tasks);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, pageSize, city, status, enabled, checkInRange, priceMin, priceMax, belowTarget, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const monitoring = rows.filter(r => (r.enabled ?? true) && (r.lastPrice == null || r.lastPrice >= r.threshold.value)).length;
    const reached = rows.filter(r => (r.enabled ?? true) && r.lastPrice != null && r.lastPrice < r.threshold.value).length;
    const paused = rows.filter(r => !(r.enabled ?? true)).length;
    return { monitoring, reached, paused };
  }, [rows]);

  const columns = [
    {
      title: '酒店信息',
      dataIndex: 'hotelName',
      width: '32%',
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
      dataIndex: 'lastPrice',
      width: 110,
      render: (v: any, r: any) => {
        const hit = v != null && v < r.threshold.value;
        return (
          <span style={{ color: hit ? '#22c55e' : '#ededed', fontWeight: 600, fontSize: 15 }}>
            {v == null ? '—' : `¥${v}`}
          </span>
        );
      },
    },
    {
      title: '目标价',
      width: 100,
      render: (_: any, r: any) => (
        <span style={{ color: '#666', fontSize: 13 }}>{'< ¥' + r.threshold?.value}</span>
      ),
    },
    {
      title: '状态',
      width: 120,
      render: (_: any, r: any) => {
        const isEnabled = r.enabled ?? true;
        if (!isEnabled) return <Tag color="default" icon={<PauseCircleFilled />} style={{ background: '#1a1a1a', color: '#666' }}>已暂停</Tag>;
        const below = r.lastPrice != null && r.lastPrice < r.threshold.value;
        if (below) return <Tag icon={<CheckCircleFilled />} style={{ background: '#052e16', color: '#22c55e' }}>已达成</Tag>;
        return <Tag icon={<SyncOutlined spin />} style={{ background: '#0c1a2e', color: '#60a5fa' }}>监控中</Tag>;
      },
    },
    {
      title: '',
      width: 120,
      align: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EyeOutlined />} style={{ color: '#888' }} onClick={() => navigate(`/tasks/${r.id}`)}>详情</Button>
          <PauseResumeButton id={r.id} enabled={(r.enabled ?? true) === true} onChanged={load} />
        </Space>
      ),
    },
  ];

  function logout() {
    localStorage.removeItem('pw_token');
    sessionStorage.removeItem('pw_token');
    window.location.href = '/login';
  }

  function resetFilters() {
    setCity(undefined); setStatus(undefined); setEnabled(undefined);
    setCheckInRange(undefined); setPriceMin(undefined); setPriceMax(undefined);
    setBelowTarget(undefined); setSortBy('checkIn'); setSortOrder('asc');
    setQ(''); setPage(1);
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Header style={{ background: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size={10}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#000' }} />
          </div>
          <Title level={5} style={{ margin: 0, color: '#ededed', fontWeight: 600 }}>PriceWatcher</Title>
        </Space>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={logout}
          style={{ color: '#666', fontSize: 13 }}
        >退出</Button>
      </Header>

      <Content style={{ padding: '32px 40px' }}>
        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: 32 }}>
          {[
            { label: 'TOTAL TASKS', value: total, color: '#ededed' },
            { label: 'MONITORING', value: stats.monitoring, color: '#60a5fa' },
            { label: 'TARGET MET', value: stats.reached, color: '#22c55e' },
            { label: 'PAUSED', value: stats.paused, color: '#555' },
          ].map(item => (
            <Col span={6} key={item.label}>
              <Card bordered={false}>
                <Statistic
                  title={<span style={{ color: '#555', fontSize: 11, letterSpacing: '0.08em' }}>{item.label}</span>}
                  value={item.value}
                  valueStyle={{ color: item.color, fontSize: 28, fontWeight: 600 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Table card */}
        <Card bordered={false}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Space size={8}>
              <Input
                placeholder="搜索酒店名称..."
                prefix={<SearchOutlined style={{ color: '#555' }} />}
                style={{ width: 280, borderRadius: 6 }}
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
              <Button icon={<ReloadOutlined />} onClick={resetFilters} style={{ fontSize: 13 }}>重置</Button>
              <Button icon={<ReloadOutlined />} onClick={load} style={{ fontSize: 13 }}>刷新</Button>
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
              showTotal: t => <span style={{ color: '#555', fontSize: 12 }}>{t} 个任务</span>,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
            onRow={r => ({ onClick: () => navigate(`/tasks/${r.id}`), style: { cursor: 'pointer' } })}
          />
        </Card>
      </Content>
    </Layout>
  );
}
