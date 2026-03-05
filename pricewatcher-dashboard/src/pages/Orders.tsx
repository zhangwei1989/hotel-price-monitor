import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, DatePicker, message, Tooltip, Badge,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, CheckCircleFilled,
  ClockCircleFilled, SyncOutlined, StopOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AppLayout } from '../components/AppLayout';
import {
  fetchOrders, createOrder, updateOrder, updateOrderStatus, deleteOrder,
  type Order,
} from '../api/orders';

const { Option } = Select;
const { RangePicker } = DatePicker;

// ── 状态标签 ─────────────────────────────────────────────────
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

// ── 订单表单 Modal ────────────────────────────────────────────
function OrderModal({
  open, order, onClose, onSaved,
}: {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (order) {
        form.setFieldsValue({
          ...order,
          checkRange: order.checkIn && order.checkOut
            ? [dayjs(order.checkIn), dayjs(order.checkOut)]
            : undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ orderType: 'cash_booking', status: 'pending', hotelGroup: '万豪' });
      }
    }
  }, [open, order, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const [checkIn, checkOut] = values.checkRange || [];
      const payload = {
        ...values,
        checkIn: checkIn?.format('YYYY-MM-DD'),
        checkOut: checkOut?.format('YYYY-MM-DD'),
        checkRange: undefined,
      };
      if (order) {
        await updateOrder(order.id, payload);
        message.success('订单已更新');
      } else {
        await createOrder(payload);
        message.success('订单已创建');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return; // 表单校验失败
      message.error(err?.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={order ? '编辑订单' : '新建订单'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      width={680}
      styles={{ body: { paddingTop: 16 } }}
    >
      <Form form={form} layout="vertical" size="small">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          {/* 基本信息 */}
          <Form.Item label="客户姓名" name="customerName" rules={[{ required: true }]}>
            <Input placeholder="张三" />
          </Form.Item>
          <Form.Item label="联系方式" name="customerContact" rules={[{ required: true }]}>
            <Input placeholder="138xxxx" />
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

          {/* 酒店信息 */}
          <Form.Item label="城市" name="city" rules={[{ required: true }]}>
            <Input placeholder="上海" />
          </Form.Item>
          <Form.Item label="酒店集团" name="hotelGroup" rules={[{ required: true }]}>
            <Select>
              {['万豪', '希尔顿', '洲际', '凯悦', '雅高', '其他'].map(g => (
                <Option key={g} value={g}>{g}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="酒店名称" name="hotelName" rules={[{ required: true }]} style={{ gridColumn: 'span 2' }}>
            <Input placeholder="上海外滩华尔道夫酒店" />
          </Form.Item>
          <Form.Item label="房型" name="roomType" rules={[{ required: true }]}>
            <Input placeholder="豪华大床房" />
          </Form.Item>
          <Form.Item label="入住 / 退房" name="checkRange" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          {/* 财务信息 */}
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
            <InputNumber min={0} style={{ width: '100%' }} placeholder="积分折现金额" />
          </Form.Item>
          <Form.Item label="预订方式" name="bookingMethod">
            <Input placeholder="官网 / APP / 电话" />
          </Form.Item>

          {/* 备注 */}
          <Form.Item label="备注" name="note" style={{ gridColumn: 'span 2' }}>
            <Input.TextArea rows={2} placeholder="客户特殊要求等" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

// ── 主页面 ────────────────────────────────────────────────────
export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 筛选
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [orderType, setOrderType] = useState<string | undefined>();
  const [city, setCity] = useState('');
  const [checkInRange, setCheckInRange] = useState<[string, string] | undefined>();

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize, sortBy: 'createdAt', sortOrder: 'desc' };
      if (q) params.q = q;
      if (status) params.status = status;
      if (orderType) params.orderType = orderType;
      if (city) params.city = city;
      if (checkInRange) {
        params.checkInFrom = checkInRange[0];
        params.checkInTo = checkInRange[1];
      }
      const result = await fetchOrders(params);
      setOrders(result.orders);
      setTotal(result.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, status, orderType, city, checkInRange]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: `删除订单`,
      content: `确认删除 ${name} 的订单？`,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteOrder(id);
        message.success('已删除');
        load();
      },
    });
  };

  const handleStatusChange = async (id: string, newStatus: Order['status']) => {
    try {
      await updateOrderStatus(id, newStatus);
      message.success('状态已更新');
      load();
    } catch {
      message.error('状态更新失败');
    }
  };

  // ── 预授权告警数 ──────────────────────────────────────────
  const preAuthWarning = orders.filter(
    o => o.preAuth && o.preAuth > 0 && (o.preAuthStatus === 'pending' || o.preAuthStatus === 'partial')
  ).length;

  const columns = [
    {
      title: '客户',
      dataIndex: 'customerName',
      width: 90,
      render: (v: string, r: Order) => (
        <div>
          <div style={{ color: '#ededed', fontSize: 13, fontWeight: 500 }}>{v}</div>
          <div style={{ color: '#555', fontSize: 11 }}>{r.customerContact}</div>
        </div>
      ),
    },
    {
      title: '酒店 / 房型',
      dataIndex: 'hotelName',
      render: (v: string, r: Order) => (
        <div>
          <div style={{ color: '#ededed', fontSize: 13 }}>{v}</div>
          <div style={{ color: '#666', fontSize: 11 }}>{r.hotelGroup} · {r.roomType}</div>
        </div>
      ),
    },
    {
      title: '入住 / 退房',
      dataIndex: 'checkIn',
      width: 150,
      render: (_: any, r: Order) => (
        <div style={{ color: '#888', fontSize: 12 }}>
          <div>{r.checkIn} → {r.checkOut}</div>
          <div style={{ color: '#555' }}>{r.nights} 晚 · {r.city}</div>
        </div>
      ),
    },
    {
      title: '收益',
      dataIndex: 'cashProfit',
      width: 110,
      render: (v: number, r: Order) => (
        <div>
          <div style={{ color: v >= 0 ? '#22c55e' : '#f87171', fontSize: 14, fontWeight: 600 }}>
            ¥{v?.toLocaleString()}
          </div>
          <div style={{ color: '#555', fontSize: 11 }}>
            售 ¥{r.salePrice?.toLocaleString()} / 成 ¥{r.costPrice?.toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      title: '预授权',
      dataIndex: 'preAuthStatus',
      width: 80,
      render: (v: string | null, r: Order) => {
        if (!r.preAuth || r.preAuth <= 0) return <span style={{ color: '#333' }}>—</span>;
        const colorMap: Record<string, string> = {
          pending: '#f59e0b', partial: '#fb923c', refunded: '#22c55e',
        };
        const labelMap: Record<string, string> = {
          pending: '待退', partial: '部分', refunded: '已退',
        };
        return (
          <Tooltip title={`预授权 ¥${r.preAuth}，已退 ¥${r.preAuthRefund || 0}`}>
            <Tag color={colorMap[v || 'pending']} style={{ fontSize: 11 }}>
              {labelMap[v || 'pending']}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string, r: Order) => {
        const s = STATUS_MAP[v] || STATUS_MAP.pending;
        return (
          <Select
            size="small"
            value={v}
            onChange={val => handleStatusChange(r.id, val)}
            style={{ width: 90 }}
            variant="borderless"
          >
            {Object.entries(STATUS_MAP).map(([k, { label }]) => (
              <Option key={k} value={k}>
                <span style={{ color: STATUS_MAP[k].color, fontSize: 12 }}>{label}</span>
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'orderType',
      width: 80,
      render: (v: string) => (
        <span style={{ color: '#666', fontSize: 12 }}>{ORDER_TYPE_MAP[v] || v}</span>
      ),
    },
    {
      title: '',
      width: 70,
      render: (_: any, r: Order) => (
        <Space size={4}>
          <Button
            type="text" size="small" icon={<EyeOutlined />}
            style={{ color: '#555' }}
            onClick={() => navigate(`/orders/${r.id}`)}
          />
          <Button
            type="text" size="small" icon={<EditOutlined />}
            style={{ color: '#555' }}
            onClick={() => { setEditOrder(r); setModalOpen(true); }}
          />
          <Button
            type="text" size="small" icon={<DeleteOutlined />}
            style={{ color: '#555' }}
            onClick={() => handleDelete(r.id, r.customerName)}
          />
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px' }}>
        {/* 标题行 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#ededed' }}>订单管理</h2>
            <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>代订酒店订单记录与跟进</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {preAuthWarning > 0 && (
              <Badge count={preAuthWarning} size="small">
                <Button
                  size="small"
                  style={{ borderColor: '#f59e0b', color: '#f59e0b', background: 'transparent', fontSize: 12 }}
                  onClick={() => navigate('/analytics?tab=preauth')}
                >
                  ⚠ 待退预授权
                </Button>
              </Badge>
            )}
            <Button
              icon={<ReloadOutlined />} size="small"
              style={{ borderColor: '#2a2a2a', background: '#0a0a0a', color: '#888' }}
              onClick={load}
            />
            <Button
              type="primary" icon={<PlusOutlined />} size="small"
              style={{ background: '#fff', color: '#000', border: 'none', fontWeight: 500 }}
              onClick={() => { setEditOrder(null); setModalOpen(true); }}
            >
              新建订单
            </Button>
          </div>
        </div>

        {/* 筛选栏 */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
          padding: '12px 16px',
          background: '#111', border: '1px solid #1f1f1f', borderRadius: 8,
        }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#444' }} />}
            placeholder="搜索客户 / 酒店"
            value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
            style={{ width: 200, background: '#0a0a0a', borderColor: '#2a2a2a', color: '#ededed' }}
            size="small"
          />
          <Select
            placeholder="状态" allowClear value={status} size="small"
            onChange={v => { setStatus(v); setPage(1); }}
            style={{ width: 100 }}
          >
            {Object.entries(STATUS_MAP).map(([k, { label }]) => (
              <Option key={k} value={k}>{label}</Option>
            ))}
          </Select>
          <Select
            placeholder="类型" allowClear value={orderType} size="small"
            onChange={v => { setOrderType(v); setPage(1); }}
            style={{ width: 110 }}
          >
            {Object.entries(ORDER_TYPE_MAP).map(([k, v]) => (
              <Option key={k} value={k}>{v}</Option>
            ))}
          </Select>
          <Input
            placeholder="城市" value={city} size="small"
            onChange={e => { setCity(e.target.value); setPage(1); }}
            style={{ width: 100, background: '#0a0a0a', borderColor: '#2a2a2a', color: '#ededed' }}
          />
          <RangePicker
            size="small"
            placeholder={['入住开始', '入住结束']}
            onChange={v => {
              setCheckInRange(v ? [v[0]!.format('YYYY-MM-DD'), v[1]!.format('YYYY-MM-DD')] : undefined);
              setPage(1);
            }}
            style={{ background: '#0a0a0a', borderColor: '#2a2a2a' }}
          />
          <Button
            size="small" style={{ borderColor: '#2a2a2a', background: '#0a0a0a', color: '#666' }}
            onClick={() => { setQ(''); setStatus(undefined); setOrderType(undefined); setCity(''); setCheckInRange(undefined); setPage(1); }}
          >
            重置
          </Button>
        </div>

        {/* 表格 */}
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page, pageSize, total,
            onChange: setPage,
            showTotal: t => <span style={{ color: '#555', fontSize: 12 }}>共 {t} 条</span>,
            size: 'small',
          }}
          style={{ background: 'transparent' }}
          rowClassName={() => 'order-row'}
        />
      </div>

      <OrderModal
        open={modalOpen}
        order={editOrder}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </AppLayout>
  );
}
