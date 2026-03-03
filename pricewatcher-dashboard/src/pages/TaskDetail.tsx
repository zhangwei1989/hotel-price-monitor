import { useEffect, useState } from 'react';
import { Button, Card, Layout, Space, Table, Tag, Typography, List } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchHistory, fetchTask } from '../api/tasks';
import { PauseResumeButton } from '../components/PauseResumeButton';
import { PriceHistoryChart } from '../components/PriceHistoryChart';

const { Header, Content } = Layout;

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  async function load() {
    if (!id) return;
    const t = await fetchTask(id);
    setTask(t);
    const h = await fetchHistory(id);
    setHistory(h.history || []);
  }

  useEffect(() => { load(); }, [id]);

  function logout() {
    localStorage.removeItem('pw_token');
    sessionStorage.removeItem('pw_token');
    window.location.href = '/login';
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 24 }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0, letterSpacing: 0.2 }}>PriceWatcher</Typography.Title>
        <Button onClick={logout}>退出</Button>
      </Header>
      <Content style={{ padding: 24 }}>
        <Space style={{ marginBottom: 12 }}>
          <Button onClick={() => navigate('/tasks')}>返回列表</Button>
        </Space>

        <Card title={task ? task.hotelName : '任务详情'} styles={{ body: { padding: 16 } }}>
          {task && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <Space size={8}>
                  <PauseResumeButton id={task.id} enabled={(task.enabled ?? true) === true} onChanged={load} />
                  <Button size="small" onClick={() => navigator.clipboard.writeText(task.link || '')} disabled={!task.link}>
                    复制携程链接
                  </Button>
                </Space>
                <Tag color={(task.enabled ?? true) ? 'blue' : 'default'}>{(task.enabled ?? true) ? '监控中' : '已暂停'}</Tag>
              </div>

              <Space wrap size={12} style={{ marginBottom: 8, color: '#6B7280' }}>
                <span><b style={{ color: '#111827' }}>城市：</b>{task.city}</span>
                <span><b style={{ color: '#111827' }}>房型：</b>{task.roomName}（{task.ratePlanHint}）</span>
                <span><b style={{ color: '#111827' }}>日期：</b>{task.checkIn} → {task.checkOut}</span>
                <span><b style={{ color: '#111827' }}>频率：</b>{task.frequencyMinutes} 分钟</span>
                <span><b style={{ color: '#111827' }}>当前价：</b>{task.lastPrice == null ? '-' : `¥${task.lastPrice}`}</span>
                <span><b style={{ color: '#111827' }}>目标价：</b>{`< ¥${task.threshold.value}`}</span>
              </Space>

              <div style={{ marginBottom: 8 }}>
                {task.lastPrice != null && task.lastPrice < task.threshold.value ? <Tag color="green">已低于目标</Tag> : <Tag color="blue">未低于目标</Tag>}
              </div>
            </>
          )}

          <Typography.Title level={5} style={{ marginTop: 20, marginBottom: 8 }}>价格趋势</Typography.Title>
          <PriceHistoryChart history={history as any} />

          <Typography.Title level={5} style={{ marginTop: 20, marginBottom: 8 }}>可选价格方案</Typography.Title>
          {task?.currentPriceOptions?.length ? (
            <List
              size="small"
              dataSource={task.currentPriceOptions}
              renderItem={(it: any) => (
                <List.Item style={{ paddingInline: 0 }}>
                  <b style={{ width: 90, display: 'inline-block' }}>¥{it.price}</b>
                  <span style={{ color: '#6B7280' }}>{it.description}</span>
                </List.Item>
              )}
            />
          ) : (
            <div style={{ color: '#9CA3AF' }}>暂无</div>
          )}

          <Typography.Title level={5} style={{ marginTop: 20, marginBottom: 8 }}>价格历史</Typography.Title>
          <Table
            rowKey={(r) => r.ts}
            size="middle"
            dataSource={history.slice().reverse()}
            columns={[
              { title: '时间', dataIndex: 'ts' },
              { title: '价格', dataIndex: 'price', render: (v: any) => (v == null ? '-' : `¥${v}`) },
              { title: '状态', dataIndex: 'status' },
              { title: '备注', dataIndex: 'note' },
            ]}
            pagination={{ pageSize: 20 }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
