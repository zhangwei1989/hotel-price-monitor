import React, { useEffect, useState } from 'react';
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
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>PriceWatcher Dashboard</Typography.Title>
        <Button onClick={logout}>退出</Button>
      </Header>
      <Content style={{ padding: 24 }}>
        <Space style={{ marginBottom: 16 }}>
          <Button onClick={() => navigate('/tasks')}>返回列表</Button>
        </Space>

        <Card title={task ? task.hotelName : '任务详情'}>
          {task && (
            <>
              <Space style={{ marginBottom: 12 }}>
                <PauseResumeButton id={task.id} enabled={(task.enabled ?? true) === true} onChanged={load} />
              </Space>
              <Typography.Paragraph>
                <b>城市：</b>{task.city} &nbsp; <b>房型：</b>{task.roomName}（{task.ratePlanHint}）
              </Typography.Paragraph>
              <Typography.Paragraph>
                <b>日期：</b>{task.checkIn} → {task.checkOut} &nbsp; <b>频率：</b>{task.frequencyMinutes} 分钟
              </Typography.Paragraph>
              <Typography.Paragraph>
                <b>当前价：</b>{task.lastPrice == null ? '-' : `¥${task.lastPrice}`} &nbsp; <b>目标价：</b>{`< ¥${task.threshold.value}`}
                &nbsp; {task.lastPrice != null && task.lastPrice < task.threshold.value ? <Tag color="green">已低于目标</Tag> : <Tag color="blue">监控中</Tag>}
              </Typography.Paragraph>
            </>
          )}

          <Typography.Title level={5} style={{ marginTop: 24 }}>价格趋势</Typography.Title>
          <PriceHistoryChart history={history as any} />

          <Typography.Title level={5} style={{ marginTop: 24 }}>可选价格方案</Typography.Title>
          {task?.currentPriceOptions?.length ? (
            <List
              size="small"
              dataSource={task.currentPriceOptions}
              renderItem={(it: any) => (
                <List.Item>
                  <b style={{ width: 90, display: 'inline-block' }}>¥{it.price}</b>
                  <span style={{ color: '#666' }}>{it.description}</span>
                </List.Item>
              )}
            />
          ) : (
            <div style={{ color: '#888' }}>暂无</div>
          )}

          <Typography.Title level={5} style={{ marginTop: 24 }}>价格历史</Typography.Title>
          <Table
            rowKey={(r) => r.ts}
            size="small"
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
