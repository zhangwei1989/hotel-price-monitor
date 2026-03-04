import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Input, Layout, Row, Space, Table, Tag, Typography, Statistic, ConfigProvider, theme } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  LogoutOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ThunderboltFilled,
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

  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const data = await fetchTasks({ page, pageSize, hotelName: q || undefined });
      setRows(data.tasks);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, pageSize]);

  const stats = useMemo(() => {
    const monitoring = rows.filter(r => (r.enabled ?? true)).length;
    const reached = rows.filter(r => r.lastPrice != null && r.lastPrice < r.threshold.value).length;
    return { monitoring, reached };
  }, [rows]);

  const columns = [
    {
      title: '酒店信息',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#fff', fontSize: 15 }}>{r.hotelName}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{r.city} · {r.roomName}</Text>
        </Space>
      ),
    },
    {
      title: '当前价格',
      render: (_: any, r: any) => (
        <Text strong style={{ color: r.lastPrice < r.threshold.value ? '#f59e0b' : '#fff', fontSize: 16 }}>
          {r.lastPrice ? `¥${r.lastPrice}` : '-'}
        </Text>
      )
    },
    {
      title: '目标价',
      render: (_: any, r: any) => <Text style={{ color: 'rgba(255,255,255,0.45)' }}>{`< ¥${r.threshold.value}`}</Text>
    },
    {
      title: '状态',
      render: (_: any, r: any) => {
        const below = r.lastPrice != null && r.lastPrice < r.threshold.value;
        return below ? 
          <Tag color="gold" icon={<ThunderboltFilled />}>达成</Tag> : 
          <Tag color="processing" icon={<SyncOutlined spin />}>监控中</Tag>;
      }
    },
    {
      title: '操作',
      align: 'right' as const,
      render: (_: any, r: any) => (
        <Button type="link" style={{ color: '#f59e0b' }} onClick={() => navigate(`/tasks/${r.id}`)}>详情</Button>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#f59e0b' } }}>
      <Layout style={{ minHeight: '100vh', background: '#000' }}>
        <Header style={{ background: 'rgba(20,20,20,0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <ThunderboltFilled style={{ color: '#f59e0b', fontSize: 24 }} />
            <Title level={4} style={{ margin: 0, color: '#fff' }}>PriceWatcher <span style={{ color: '#f59e0b', fontSize: 12 }}>PRO</span></Title>
          </Space>
          <Button ghost danger icon={<LogoutOutlined />}>退出</Button>
        </Header>

        <Content style={{ padding: '32px' }}>
          <Row gutter={24} style={{ marginBottom: 32 }}>
            <Col span={8}>
              <Card style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Statistic title={<Text style={{ color: 'rgba(255,255,255,0.45)' }}>总监控</Text>} value={total} valueStyle={{ color: '#fff' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Statistic title={<Text style={{ color: 'rgba(255,255,255,0.45)' }}>监控中</Text>} value={stats.monitoring} valueStyle={{ color: '#3b82f6' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Statistic title={<Text style={{ color: 'rgba(255,255,255,0.45)' }}>已达成</Text>} value={stats.reached} valueStyle={{ color: '#f59e0b' }} />
              </Card>
            </Col>
          </Row>

          <Card style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
              <Input prefix={<SearchOutlined />} placeholder="输入酒店名称快速筛选..." style={{ width: 400, background: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Button icon={<ReloadOutlined />} onClick={load}>刷新数据</Button>
            </div>
            <Table columns={columns as any} dataSource={rows} pagination={false} rowClassName={() => 'dark-row'} />
          </Card>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
