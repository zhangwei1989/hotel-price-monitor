import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Input, Layout, Row, Space, Table, Tag, Typography, Statistic, ConfigProvider, theme } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  LogoutOutlined,
  ThunderboltFilled,
  SyncOutlined,
} from '@ant-design/icons';
import { fetchTasks } from '../api/tasks';
import { useNavigate } from 'react-router-dom';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function Tasks() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');

  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const data = await fetchTasks({ page, pageSize, hotelName: q || undefined });
      setRows(data.tasks);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, pageSize]);

  const stats = useMemo(() => {
    const monitoring = rows.length;
    const reached = rows.filter(r => r.lastPrice != null && r.lastPrice < r.threshold.value).length;
    return { monitoring, reached };
  }, [rows]);

  const columns = [
    {
      title: '酒店信息',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#fff', fontSize: 15 }}>{r.hotelName}</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{r.city} · {r.roomName}</Text>
        </Space>
      ),
    },
    {
      title: '当前价格',
      render: (_: any, r: any) => (
        <Text strong style={{ color: (r.lastPrice && r.lastPrice < r.threshold.value) ? '#fbbf24' : '#fff', fontSize: 16 }}>
          {r.lastPrice ? `¥${r.lastPrice}` : '-'}
        </Text>
      )
    },
    {
      title: '目标价',
      render: (_: any, r: any) => <Text style={{ color: '#94a3b8' }}>{`< ¥${r.threshold.value}`}</Text>
    },
    {
      title: '状态',
      render: (_: any, r: any) => {
        const below = r.lastPrice != null && r.lastPrice < r.threshold.value;
        return below ? 
          <Tag color="gold" icon={<ThunderboltFilled />}>已达成</Tag> : 
          <Tag color="processing" icon={<SyncOutlined spin />}>监控中</Tag>;
      }
    },
    {
      title: '操作',
      align: 'right' as const,
      render: (_: any, r: any) => (
        <Button type="link" style={{ color: '#3b82f6' }} onClick={() => navigate(`/tasks/${r.id}`)}>详情</Button>
      )
    }
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: '#3b82f6', borderRadius: 12 },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Header style={{ 
          background: 'rgba(15, 23, 42, 0.8)', 
          backdropFilter: 'blur(12px)', 
          borderBottom: '1px solid rgba(255,255,255,0.1)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0 32px'
        }}>
          <Space>
            <ThunderboltFilled style={{ color: '#3b82f6', fontSize: 24 }} />
            <Title level={4} style={{ margin: 0, color: '#fff', letterSpacing: -0.5 }}>PriceWatcher <span style={{ color: '#3b82f6', fontSize: 12, fontWeight: 300 }}>BUSINESS</span></Title>
          </Space>
          <Button ghost icon={<LogoutOutlined />} style={{ borderRadius: 8 }}>退出</Button>
        </Header>

        <Content style={{ padding: '40px' }}>
          <Row gutter={24} style={{ marginBottom: 32 }}>
            <Col span={8}>
              <Card bordered={false}>
                <Statistic title="总监控任务" value={total} valueStyle={{ color: '#fff' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false}>
                <Statistic title="正在实时监控" value={stats.monitoring} valueStyle={{ color: '#3b82f6' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false}>
                <Statistic title="已达成低价" value={stats.reached} valueStyle={{ color: '#fbbf24' }} />
              </Card>
            </Col>
          </Row>

          <Card bordered={false} style={{ background: 'rgba(30, 41, 59, 0.4)' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Input 
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />} 
                placeholder="搜索酒店名称..." 
                style={{ width: 320, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)' }} 
                value={q}
                onChange={e => setQ(e.target.value)}
                onPressEnter={load}
              />
              <Button icon={<ReloadOutlined />} onClick={load} style={{ borderRadius: 8 }}>刷新数据</Button>
            </div>
            <Table 
              columns={columns as any} 
              dataSource={rows} 
              pagination={false} 
              rowKey="id"
            />
          </Card>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
