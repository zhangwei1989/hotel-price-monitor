import { useEffect, useState } from 'react';
import {
  Button, Card, Col, Row, Space,
  Table, Tag, Typography, List, Statistic,
  Modal, InputNumber, message, Tooltip, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, LinkOutlined,
  ThunderboltOutlined, CheckCircleFilled, SyncOutlined,
  PauseCircleFilled, EditOutlined, ClockCircleOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchHistory, fetchTask, deleteTask } from '../api/tasks';
import { PauseResumeButton } from '../components/PauseResumeButton';
import { PriceHistoryChart } from '../components/PriceHistoryChart';
import { checkNow, updateThreshold, updateFrequency } from '../api/taskActions';
import { AppLayout } from '../components/AppLayout';

// ── 小工具：Info 行 ───────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
      <span style={{ color: '#555', fontSize: 12, width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#ededed', fontSize: 14 }}>{value}</span>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────
export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [checkingNow, setCheckingNow] = useState(false);
  const [thresholdModal, setThresholdModal] = useState(false);
  const [newThreshold, setNewThreshold] = useState<number | null>(null);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [freqModal, setFreqModal] = useState(false);
  const [newFreq, setNewFreq] = useState<number | null>(null);
  const [savingFreq, setSavingFreq] = useState(false);

  async function load() {
    if (!id) return;
    const [t, h] = await Promise.all([fetchTask(id), fetchHistory(id)]);
    setTask(t);
    setHistory(h.history || []);
  }

  useEffect(() => { load(); }, [id]);

  async function handleCheckNow() {
    setCheckingNow(true);
    try {
      await checkNow(id!);
      message.success('已标记立即检查');
    } catch {
      message.error('操作失败');
    } finally {
      setCheckingNow(false);
    }
  }

  async function handleSaveThreshold() {
    if (!newThreshold || newThreshold <= 0) return;
    setSavingThreshold(true);
    try {
      await updateThreshold(id!, newThreshold);
      message.success(`目标价已更新为 ¥${newThreshold}`);
      setThresholdModal(false);
      load();
    } catch {
      message.error('更新失败');
    } finally {
      setSavingThreshold(false);
    }
  }

  async function handleSaveFreq() {
    if (!newFreq || newFreq < 10) return;
    setSavingFreq(true);
    try {
      await updateFrequency(id!, newFreq);
      message.success(`检查频率已更新为每 ${newFreq} 分钟`);
      setFreqModal(false);
      load();
    } catch {
      message.error('更新失败');
    } finally {
      setSavingFreq(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteTask(id!);
      message.success('任务已删除');
      navigate('/tasks');
    } catch {
      message.error('删除失败');
    }
  }

  const isEnabled = task?.enabled ?? true;
  const below = task?.lastPrice != null && task?.lastPrice < task?.threshold?.value;

  return (
    <AppLayout>
      <div style={{ padding: '28px 40px' }}>
        {/* 返回 */}
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tasks')}
          style={{ color: '#666', fontSize: 13, marginBottom: 20, padding: 0 }}
        >
          返回列表
        </Button>

        {task && (
          <>
            {/* 顶部：酒店名 + 操作按钮 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ color: '#ededed', fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{task.hotelName}</div>
                <div style={{ color: '#666', fontSize: 13 }}>{task.city} · {task.roomName}</div>
              </div>
              <Space size={8}>
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={checkingNow}
                  onClick={handleCheckNow}
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f59e0b', borderRadius: 6, fontSize: 13 }}
                >
                  立即检查
                </Button>
                <Tooltip title="复制携程链接">
                  <Button
                    icon={<LinkOutlined />}
                    onClick={() => { navigator.clipboard.writeText(task.link || ''); message.success('链接已复制'); }}
                    disabled={!task.link}
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', borderRadius: 6 }}
                  />
                </Tooltip>
                <PauseResumeButton id={task.id} enabled={isEnabled} onChanged={load} />
                <Popconfirm
                  title="确认删除此任务？"
                  description="任务及所有历史数据将被永久删除，操作不可撤销"
                  onConfirm={handleDelete}
                  okText="确认删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    icon={<DeleteOutlined />}
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#ef4444', borderRadius: 6, fontSize: 13 }}
                  >
                    删除任务
                  </Button>
                </Popconfirm>
              </Space>
            </div>

            {/* 统计卡片行 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8 }}>
                  <Statistic
                    title={<span style={{ color: '#555', fontSize: 11, letterSpacing: '0.06em' }}>当前价格</span>}
                    value={task.lastPrice ?? '—'}
                    prefix={task.lastPrice ? '¥' : ''}
                    valueStyle={{ color: below ? '#22c55e' : '#ededed', fontWeight: 600, fontSize: 26 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8 }}>
                  <Statistic
                    title={<span style={{ color: '#555', fontSize: 11, letterSpacing: '0.06em' }}>目标价</span>}
                    value={task.threshold?.value}
                    prefix="¥"
                    valueStyle={{ color: '#60a5fa', fontWeight: 600, fontSize: 26 }}
                    suffix={
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => { setNewThreshold(task.threshold?.value); setThresholdModal(true); }}
                        style={{ color: '#444', marginLeft: 4 }}
                      />
                    }
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8 }}>
                  <Statistic
                    title={<span style={{ color: '#555', fontSize: 11, letterSpacing: '0.06em' }}>监控状态</span>}
                    valueRender={() => (
                      <div style={{ marginTop: 4 }}>
                        {!isEnabled
                          ? <Tag icon={<PauseCircleFilled />} style={{ background: '#1a1a1a', color: '#666', border: 'none', fontSize: 13, padding: '3px 10px' }}>已暂停</Tag>
                          : below
                          ? <Tag icon={<CheckCircleFilled />} style={{ background: '#052e16', color: '#22c55e', border: 'none', fontSize: 13, padding: '3px 10px' }}>已达成</Tag>
                          : <Tag icon={<SyncOutlined spin />} style={{ background: '#0c1a2e', color: '#60a5fa', border: 'none', fontSize: 13, padding: '3px 10px' }}>监控中</Tag>
                        }
                      </div>
                    )}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8 }}>
                  <Statistic
                    title={<span style={{ color: '#555', fontSize: 11, letterSpacing: '0.06em' }}>检查频率</span>}
                    value={task.frequencyMinutes}
                    suffix="分钟"
                    valueStyle={{ color: '#ededed', fontWeight: 600, fontSize: 26 }}
                    suffix={
                      <span>
                        <span style={{ fontSize: 14, color: '#888', marginRight: 4 }}>分钟</span>
                        <Button
                          type="text"
                          size="small"
                          icon={<ClockCircleOutlined />}
                          onClick={() => { setNewFreq(task.frequencyMinutes); setFreqModal(true); }}
                          style={{ color: '#444' }}
                        />
                      </span>
                    }
                  />
                </Card>
              </Col>
            </Row>

            {/* 详情信息 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8 }}>
                  <div style={{ color: '#555', fontSize: 11, letterSpacing: '0.06em', marginBottom: 12 }}>任务信息</div>
                  <InfoRow label="城市" value={task.city} />
                  <InfoRow label="入住" value={`${task.checkIn} → ${task.checkOut}`} />
                  <InfoRow label="房型" value={task.roomName} />
                  <InfoRow label="方案" value={task.ratePlanHint || '—'} />
                  <InfoRow label="最后检查" value={task.lastCheckedAt ? task.lastCheckedAt.replace('T', ' ').slice(0, 16) : '—'} />
                </Card>
              </Col>
              <Col span={12}>
                <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, height: '100%' }}>
                  <div style={{ color: '#555', fontSize: 11, letterSpacing: '0.06em', marginBottom: 12 }}>当前价格方案</div>
                  {task.currentPriceOptions?.length ? (
                    <List
                      size="small"
                      dataSource={task.currentPriceOptions}
                      renderItem={(it: any, idx: number) => (
                        <List.Item style={{ padding: '8px 0', borderBottom: idx < task.currentPriceOptions.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                          <span style={{ color: idx === 0 ? '#22c55e' : '#ededed', fontWeight: idx === 0 ? 600 : 400, fontSize: 15, width: 80 }}>¥{it.price}</span>
                          <span style={{ color: '#666', fontSize: 12 }}>{it.description}</span>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <div style={{ color: '#444', fontSize: 13, paddingTop: 8 }}>暂无价格方案</div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 价格趋势图 */}
            <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, marginBottom: 24 }}>
              <div style={{ color: '#555', fontSize: 11, letterSpacing: '0.06em', marginBottom: 16 }}>价格趋势</div>
              <PriceHistoryChart history={history as any} threshold={task.threshold?.value} />
            </Card>

            {/* 历史记录表格 */}
            <Card bordered={false} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8 }}>
              <div style={{ color: '#555', fontSize: 11, letterSpacing: '0.06em', marginBottom: 16 }}>价格历史（{history.length} 条）</div>
              <Table
                rowKey="ts"
                size="small"
                dataSource={history.slice().reverse()}
                columns={[
                  {
                    title: '时间', dataIndex: 'ts', width: 160,
                    render: (v: string) => <span style={{ color: '#666', fontSize: 12 }}>{v?.replace('T', ' ').slice(0, 16)}</span>
                  },
                  {
                    title: '价格', dataIndex: 'price', width: 100,
                    render: (v: any, r: any) => {
                      const hit = v != null && task?.threshold?.value && v < task.threshold.value;
                      return <span style={{ color: hit ? '#22c55e' : '#ededed', fontWeight: hit ? 600 : 400 }}>{v == null ? '—' : `¥${v}`}</span>;
                    }
                  },
                  {
                    title: '状态', dataIndex: 'triggered', width: 100,
                    render: (v: boolean) => v
                      ? <Tag style={{ background: '#052e16', color: '#22c55e', border: 'none', fontSize: 11 }}>已触发</Tag>
                      : <Tag style={{ background: '#0a0a0a', color: '#555', border: '1px solid #1f1f1f', fontSize: 11 }}>未触发</Tag>
                  },
                  { title: '备注', dataIndex: 'note', render: (v: any) => <span style={{ color: '#555', fontSize: 12 }}>{v || '—'}</span> },
                ]}
                pagination={{ pageSize: 20, size: 'small' }}
              />
            </Card>
          </>
        )}
      </div>

      {/* 修改检查频率弹窗 */}
      <Modal
        title={<span style={{ color: '#ededed' }}>修改检查频率</span>}
        open={freqModal}
        onCancel={() => setFreqModal(false)}
        onOk={handleSaveFreq}
        confirmLoading={savingFreq}
        styles={{ content: { background: '#111', border: '1px solid #1f1f1f' }, header: { background: '#111', borderBottom: '1px solid #1f1f1f' }, footer: { background: '#111', borderTop: '1px solid #1f1f1f' } }}
        okText="确认修改"
        cancelText="取消"
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>当前频率：每 {task?.frequencyMinutes} 分钟检查一次</div>
          <div style={{ color: '#555', fontSize: 12, marginBottom: 12 }}>最小间隔 10 分钟，建议 60-480 分钟</div>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <InputNumber
              value={newFreq}
              onChange={v => setNewFreq(v)}
              min={10}
              max={1440}
              suffix="分钟"
              style={{ width: '100%', background: '#0a0a0a', borderColor: '#2a2a2a' }}
              placeholder="输入频率（分钟）"
            />
            <Space size={8}>
              {[30, 60, 120, 240, 480].map(v => (
                <Button
                  key={v}
                  size="small"
                  onClick={() => setNewFreq(v)}
                  style={{
                    background: newFreq === v ? '#1d3a5c' : '#1a1a1a',
                    border: newFreq === v ? '1px solid #3b82f6' : '1px solid #2a2a2a',
                    color: newFreq === v ? '#60a5fa' : '#666',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  {v >= 60 ? `${v / 60}h` : `${v}m`}
                </Button>
              ))}
            </Space>
          </Space>
        </div>
      </Modal>

      {/* 修改目标价弹窗 */}
      <Modal
        title={<span style={{ color: '#ededed' }}>修改目标价</span>}
        open={thresholdModal}
        onCancel={() => setThresholdModal(false)}
        onOk={handleSaveThreshold}
        confirmLoading={savingThreshold}
        styles={{ content: { background: '#111', border: '1px solid #1f1f1f' }, header: { background: '#111', borderBottom: '1px solid #1f1f1f' }, footer: { background: '#111', borderTop: '1px solid #1f1f1f' } }}
        okText="确认修改"
        cancelText="取消"
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>当前目标价：¥{task?.threshold?.value}</div>
          <InputNumber
            value={newThreshold}
            onChange={v => setNewThreshold(v)}
            prefix="¥"
            min={1}
            style={{ width: '100%', background: '#0a0a0a', borderColor: '#2a2a2a' }}
            placeholder="输入新的目标价"
          />
        </div>
      </Modal>
    </AppLayout>
  );
}
