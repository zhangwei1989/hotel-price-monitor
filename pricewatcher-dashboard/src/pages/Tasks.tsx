import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Layout, Select, Space, Table, Tag, Typography } from 'antd';
import { fetchTasks } from '../api/tasks';
import { useNavigate } from 'react-router-dom';
import { PauseResumeButton } from '../components/PauseResumeButton';
import { Filters, SortBy, SortOrder } from '../components/Filters';

const { Header, Content } = Layout;

export default function Tasks() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [city, setCity] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [enabled, setEnabled] = useState<string | undefined>(undefined);
  const [checkInRange, setCheckInRange] = useState<[string, string] | undefined>(undefined);
  const [priceMin, setPriceMin] = useState<number | undefined>(undefined);
  const [priceMax, setPriceMax] = useState<number | undefined>(undefined);
  const [belowTarget, setBelowTarget] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortBy>('checkIn');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [q, setQ] = useState('');

  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const data = await fetchTasks({
        page,
        pageSize,
        city,
        status,
        enabled: enabled ?? undefined,
        checkInFrom: checkInRange?.[0],
        checkInTo: checkInRange?.[1],
        currentPriceMin: priceMin,
        currentPriceMax: priceMax,
        belowTarget: belowTarget ?? undefined,
        sortBy,
        sortOrder,
        hotelName: q || undefined,
      });
      setRows(data.tasks);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, city, status, enabled, checkInRange, priceMin, priceMax, belowTarget, sortBy, sortOrder]);

  const columns = useMemo(
    () => [
      {
        title: '酒店',
        dataIndex: 'hotelName',
        render: (_: any, r: any) => (
          <div>
            <div style={{ fontWeight: 600 }}>{r.hotelName}</div>
            <div style={{ color: '#888' }}>{r.city} · {r.roomName}</div>
          </div>
        ),
      },
      { title: '日期', render: (_: any, r: any) => `${r.checkIn} → ${r.checkOut}` },
      { title: '当前价', dataIndex: 'lastPrice', render: (v: any) => (v == null ? '-' : `¥${v}`) },
      { title: '目标价', render: (_: any, r: any) => `< ¥${r.threshold?.value}` },
      {
        title: '状态',
        dataIndex: 'lastStatus',
        render: (s: string, r: any) => {
          const isEnabled = (r.enabled ?? true) === true;
          if (!isEnabled) return <Tag color="default">已暂停</Tag>;
          const below = r.lastPrice != null && r.lastPrice < r.threshold.value;
          if (below) return <Tag color="green">已低于目标</Tag>;
          if (s === 'at_threshold') return <Tag color="gold">等于目标</Tag>;
          return <Tag color="blue">监控中</Tag>;
        },
      },
      {
        title: '操作',
        render: (_: any, r: any) => (
          <Space>
            <Button size="small" onClick={() => navigate(`/tasks/${r.id}`)}>详情</Button>
            <PauseResumeButton id={r.id} enabled={(r.enabled ?? true) === true} onChanged={load} />
          </Space>
        ),
      },
    ],
    [navigate]
  );

  function logout() {
    localStorage.removeItem('pw_token');
    sessionStorage.removeItem('pw_token');
    window.location.href = '/login';
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>PriceWatcher Dashboard</Typography.Title>
        <Button onClick={logout}>退出</Button>
      </Header>
      <Content style={{ padding: 24 }}>
        <Card>
          <Space wrap style={{ marginBottom: 16 }}>
            <Filters
              city={city}
              setCity={(v) => { setPage(1); setCity(v); }}
              status={status}
              setStatus={(v) => { setPage(1); setStatus(v); }}
              enabled={enabled}
              setEnabled={(v) => { setPage(1); setEnabled(v); }}
              checkInRange={checkInRange}
              setCheckInRange={(v) => { setPage(1); setCheckInRange(v); }}
              priceMin={priceMin}
              setPriceMin={(v) => { setPage(1); setPriceMin(v); }}
              priceMax={priceMax}
              setPriceMax={(v) => { setPage(1); setPriceMax(v); }}
              belowTarget={belowTarget}
              setBelowTarget={(v) => { setPage(1); setBelowTarget(v); }}
              sortBy={sortBy}
              setSortBy={(v) => { setPage(1); setSortBy(v); }}
              sortOrder={sortOrder}
              setSortOrder={(v) => { setPage(1); setSortOrder(v); }}
              cityOptions={[...new Set(rows.map((r: any) => r.city))]}
            />
            <Input.Search
              placeholder="搜索酒店名/房型"
              style={{ width: 260 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onSearch={() => { setPage(1); load(); }}
              allowClear
            />
            <Button onClick={() => {
              setCity(undefined); setStatus(undefined); setEnabled(undefined);
              setCheckInRange(undefined); setPriceMin(undefined); setPriceMax(undefined);
              setBelowTarget(undefined); setSortBy('checkIn'); setSortOrder('asc');
              setQ(''); setPage(1);
            }}>重置</Button>
          </Space>

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
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
