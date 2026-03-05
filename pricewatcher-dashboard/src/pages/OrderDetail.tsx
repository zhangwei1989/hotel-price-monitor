import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Modal, message, Tag, Tooltip, Select, Form,
  Input, InputNumber, DatePicker, Space,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined,
  CopyOutlined, WarningFilled, CheckCircleFilled,
  ClockCircleFilled, SyncOutlined, StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AppLayout } from '../components/AppLayout';
import {
  fetchOrder, updateOrder, updateOrderStatus, deleteOrder,
  createOrder, type Order,
} from '../api/orders';

const { Option } = Select;
const { RangePicker } = DatePicker;

// ── 常量映射 ─────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: '待确认', color: '#f59e0b', icon: <ClockCircleFilled /> },
  confirmed:  { label: '已确认', color: '#60a5fa', icon: <CheckCircleFilled /> },
  checked_in: { label: '已入住', color: '#a78bfa', icon: <SyncOutlined spin /> },
  completed:  { label: '已完成', color: '#22c55e', icon: <CheckCircleFilled /> },
  cancelled:  { label: '已取消', color: '#555',    icon: <StopOutlined /> },
};

const ORDER_TYPE_MAP: Record<string, string> = {
  points_redemption: '积分兑换',
  cash_booking:      '现金代订',
  hybrid:            '混合',
};

const PREAUTH_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:  { label: '未退款', color: '#f59e0b' },
  partial:  { label: '部分退款', color: '#fb923c' },
  refunded: { label: '已退款', color: '#22c55e' },
};

// ── InfoRow ───────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      padding: '9px 0', borderBottom: '1px solid #1a1a1a',
    }}>
      <span style={{ color: '#555', fontSize: 12, width: 90, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#ededed', fontSize: 14, flex: 1 }}>{value || <span style={{ color: '#333' }}>—</span>}</span>
    </div>
  );
}

// ── 分区卡片 ─────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#111', border: '1px solid #1f1f1f',
      borderRadius: 10, padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{ fontSize: 12, color: '#555', fontWeight: 500, letterSpacing: '0.5px', marginBottom: 12, textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── 编辑 Modal ────────────────────────────────────────────────
function EditModal({
  open, order, onClose, onSaved,
}: {
  open: boolean; order: Order | null; onClose: () => void; onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && order) {
      form.setFieldsValue({
        ...order,
        checkRange: order.checkIn && order.checkOut
          ? [dayjs(order.checkIn), dayjs(order.checkOut)]
          : undefined,
      });
    }
  }, [open, order, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const [checkIn, checkOut] = values.checkRange || [];
      await updateOrder(order!.id, {
        ...values,
        checkIn: checkIn?.format('YYYY-MM-DD'),
        checkOut: checkOut?.format('YYYY-MM-DD'),
        checkRange: undefined,
      });
      message.success('订单已更新');
      onSaved();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title="编辑订单" onCancel={onClose} onOk={handleOk}
      confirmLoading={loading} width={680} styles={{ body: { paddingTop: 16 } }}>
      <Form form={form} layout="vertical" size="small">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="客户姓名" name="customerName" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="联系方式" name="customerContact" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="订单类型" name="orderType" rules={[{ required: true }]}>
            <Select>
              <Option value="cash_booking">现金代订</Option>
              <Option value="points_redemption">积分兑换</Option>
              <Option value="hybrid">混合</Option>
            </Select>
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select>
              {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                <Option key={v} value={v}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="城市" name="city" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="酒店集团" name="hotelGroup" rules={[{ required: true }]}>
            <Select>
              {['万豪', '希尔顿', '洲际', '凯悦', '雅高', '其他'].map(g => (
                <Option key={g} value={g}>{g}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="酒店名称" name="hotelName" rules={[{ required: true }]} style={{ gridColumn: 'span 2' }}>
            <Input />
          </Form.Item>
          <Form.Item label="房型" name="roomType" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="入住 / 退房" name="checkRange" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="代订成本价 (¥)" name="costPrice" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="售价 (¥)" name="salePrice" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="预授权金额 (¥)" name="preAuth">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="无则留空" />
          </Form.Item>
          <Form.Item label="已退预授权 (¥)" name="preAuthRefund">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="无则留空" />
          </Form.Item>
          <Form.Item label="积分价值 (¥)" name="pointsValue">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="预订方式" name="bookingMethod">
            <Input />
          </Form.Item>
          <Form.Item label="客户需求" name="customerNeeds" style={{ gridColumn: 'span 2' }}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="备注" name="note" style={{ gridColumn: 'span 2' }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

// ── 主页面 ────────────────────────────────────────────────────
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const o = await fetchOrder(id);
      setOrder(o);
    } catch {
      message.error('订单不存在');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  // 删除
  const handleDelete = () => {
    Modal.confirm({
      title: '删除订单',
      content: `确认删除 ${order?.customerName} 的订单？此操作不可撤销。`,
      okText: '删除', okButtonProps: { danger: true },
      onOk: async () => {
        await deleteOrder(id!);
        message.success('已删除');
        navigate('/orders');
      },
    });
  };

  // 复制订单
  const handleCopy = async () => {
    if (!order) return;
    setCopyLoading(true);
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, nights: _n,
        cashProfit: _cp, totalRevenue: _tr, preAuthStatus: _ps, ...rest } = order as any;
      const newOrder = await createOrder({ ...rest, status: 'pending', note: `复制自 #${id?.slice(-6)}` });
      message.success('订单已复制');
      navigate(`/orders/${newOrder.id}`);
    } catch {
      message.error('复制失败');
    } finally {
      setCopyLoading(false);
    }
  };

  // 状态变更
  const handleStatusChange = async (status: Order['status']) => {
    try {
      await updateOrderStatus(id!, status);
      message.success('状态已更新');
      load();
    } catch {
      message.error('更新失败');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ padding: '48px 32px', color: '#555', fontSize: 14 }}>加载中...</div>
      </AppLayout>
    );
  }

  if (!order) return null;

  const s = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const needsPreAuthWarning = order.preAuth && order.preAuth > 0
    && (order.preAuthStatus === 'pending' || order.preAuthStatus === 'partial');

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px', maxWidth: 860 }}>

        {/* 顶部导航 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Button
            icon={<ArrowLeftOutlined />} type="text" size="small"
            style={{ color: '#555', padding: '4px 0' }}
            onClick={() => navigate('/orders')}
          >
            订单列表
          </Button>
          <span style={{ color: '#2a2a2a' }}>/</span>
          <span style={{ color: '#555', fontSize: 13 }}>
            {order.customerName} · {order.hotelName}
          </span>
        </div>

        {/* 预授权警告条 */}
        {needsPreAuthWarning && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', marginBottom: 16,
            background: '#2d1a00', border: '1px solid #92400e',
            borderRadius: 8, fontSize: 13, color: '#f59e0b',
          }}>
            <WarningFilled style={{ fontSize: 16 }} />
            <span>
              预授权 ¥{order.preAuth?.toLocaleString()} 尚未完全退款
              {order.preAuthStatus === 'partial'
                ? `（已退 ¥${order.preAuthRefund?.toLocaleString()}，余 ¥${((order.preAuth || 0) - (order.preAuthRefund || 0)).toLocaleString()}）`
                : ''}
              ，请尽快处理。
            </span>
          </div>
        )}

        {/* 标题行 + 操作 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#ededed' }}>
                {order.customerName}
              </h2>
              <span style={{ color: s.color, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                {s.icon} {s.label}
              </span>
            </div>
            <p style={{ margin: 0, color: '#555', fontSize: 13 }}>
              {order.hotelName} · {order.city} · {order.checkIn} → {order.checkOut}（{order.nights} 晚）
            </p>
          </div>

          <Space size={8}>
            {/* 状态快捷切换 */}
            <Select
              value={order.status}
              size="small"
              onChange={handleStatusChange}
              style={{ width: 100 }}
            >
              {Object.entries(STATUS_MAP).map(([k, { label }]) => (
                <Option key={k} value={k}>
                  <span style={{ color: STATUS_MAP[k].color, fontSize: 12 }}>{label}</span>
                </Option>
              ))}
            </Select>
            <Tooltip title="复制订单">
              <Button
                icon={<CopyOutlined />} size="small" loading={copyLoading}
                style={{ borderColor: '#2a2a2a', background: '#0a0a0a', color: '#888' }}
                onClick={handleCopy}
              />
            </Tooltip>
            <Button
              icon={<EditOutlined />} size="small"
              style={{ borderColor: '#2a2a2a', background: '#0a0a0a', color: '#888' }}
              onClick={() => setEditOpen(true)}
            >
              编辑
            </Button>
            <Button
              icon={<DeleteOutlined />} size="small" danger
              style={{ borderColor: '#7f1d1d', background: '#0a0a0a', color: '#ef4444' }}
              onClick={handleDelete}
            >
              删除
            </Button>
          </Space>
        </div>

        {/* 收益摘要卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: '售价', value: `¥${order.salePrice?.toLocaleString()}`, color: '#ededed' },
            { label: '成本', value: `¥${order.costPrice?.toLocaleString()}`, color: '#888' },
            { label: '现金收益', value: `¥${order.cashProfit?.toLocaleString()}`, color: order.cashProfit >= 0 ? '#22c55e' : '#f87171' },
            { label: '综合收益', value: `¥${order.totalRevenue?.toLocaleString()}`, color: '#60a5fa' },
          ].map(c => (
            <div key={c.label} style={{
              background: '#111', border: '1px solid #1f1f1f', borderRadius: 10,
              padding: '14px 18px',
            }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color, letterSpacing: '-0.5px' }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* 基本信息 */}
        <Section title="基本信息">
          <InfoRow label="订单类型" value={
            <Tag style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', fontSize: 11 }}>
              {ORDER_TYPE_MAP[order.orderType] || order.orderType}
            </Tag>
          } />
          <InfoRow label="来源" value={order.source} />
          <InfoRow label="创建时间" value={new Date(order.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} />
          <InfoRow label="最后更新" value={new Date(order.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} />
          {order.note && <InfoRow label="备注" value={<span style={{ color: '#888' }}>{order.note}</span>} />}
        </Section>

        {/* 客户信息 */}
        <Section title="客户信息">
          <InfoRow label="客户姓名" value={order.customerName} />
          <InfoRow label="联系方式" value={order.customerContact} />
          {order.customerNeeds && <InfoRow label="客户需求" value={<span style={{ color: '#888' }}>{order.customerNeeds}</span>} />}
        </Section>

        {/* 酒店信息 */}
        <Section title="酒店信息">
          <InfoRow label="城市" value={order.city} />
          <InfoRow label="酒店集团" value={order.hotelGroup} />
          <InfoRow label="酒店名称" value={order.hotelName} />
          <InfoRow label="房型" value={order.roomType} />
          <InfoRow label="入住日期" value={order.checkIn} />
          <InfoRow label="退房日期" value={order.checkOut} />
          <InfoRow label="入住晚数" value={`${order.nights} 晚`} />
          {order.bookingMethod && <InfoRow label="预订方式" value={order.bookingMethod} />}
        </Section>

        {/* 财务信息 */}
        <Section title="财务信息">
          <InfoRow label="代订成本价" value={<span style={{ color: '#888' }}>¥{order.costPrice?.toLocaleString()}</span>} />
          <InfoRow label="售价" value={<span style={{ color: '#ededed' }}>¥{order.salePrice?.toLocaleString()}</span>} />
          <InfoRow label="现金收益" value={
            <span style={{ color: order.cashProfit >= 0 ? '#22c55e' : '#f87171', fontWeight: 600 }}>
              ¥{order.cashProfit?.toLocaleString()}
            </span>
          } />
          {(order.pointsEarned || order.pointsValue) && (
            <>
              {order.pointsEarned && <InfoRow label="获得积分" value={`${order.pointsEarned?.toLocaleString()} 分`} />}
              {order.pointsValue && <InfoRow label="积分折现" value={<span style={{ color: '#a78bfa' }}>¥{order.pointsValue?.toLocaleString()}</span>} />}
            </>
          )}
          <InfoRow label="综合收益" value={
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>¥{order.totalRevenue?.toLocaleString()}</span>
          } />
          {order.preAuth && order.preAuth > 0 ? (
            <>
              <InfoRow label="预授权金额" value={<span style={{ color: '#f59e0b' }}>¥{order.preAuth?.toLocaleString()}</span>} />
              <InfoRow label="已退预授权" value={<span style={{ color: '#888' }}>¥{(order.preAuthRefund || 0).toLocaleString()}</span>} />
              <InfoRow label="预授权状态" value={
                order.preAuthStatus ? (
                  <Tag color={PREAUTH_STATUS_MAP[order.preAuthStatus]?.color} style={{ fontSize: 11, border: 'none' }}>
                    {PREAUTH_STATUS_MAP[order.preAuthStatus]?.label}
                  </Tag>
                ) : '—'
              } />
            </>
          ) : (
            <InfoRow label="预授权" value={<span style={{ color: '#333' }}>无</span>} />
          )}
        </Section>

      </div>

      <EditModal
        open={editOpen}
        order={order}
        onClose={() => setEditOpen(false)}
        onSaved={load}
      />
    </AppLayout>
  );
}
