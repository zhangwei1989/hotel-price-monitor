import { useEffect, useState } from 'react';
import { Card, Table, Tag, Tabs, Spin, Empty, Tooltip } from 'antd';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { AppLayout } from '../components/AppLayout';
import {
  fetchAnalyticsSummary, fetchAnalyticsMonthly,
  fetchAnalyticsByCity, fetchAnalyticsByGroup, fetchAnalyticsByType,
  fetchPreAuthPending,
} from '../api/orders';
import { WarningFilled } from '@ant-design/icons';

const PIE_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#facc15'];

// ── 统计卡片 ─────────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#ededed' }: {
  label: string; value: React.ReactNode; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: '#111', border: '1px solid #1f1f1f', borderRadius: 10,
      padding: '18px 24px',
    }}>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── 月度趋势图 ────────────────────────────────────────────────
function MonthlyChart({ data }: { data: any[] }) {
  if (!data?.length) return <Empty description="暂无数据" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 11 }} />
        <YAxis tick={{ fill: '#555', fontSize: 11 }} />
        <RTooltip
          contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6 }}
          labelStyle={{ color: '#888' }}
          formatter={(v: any, name: string) => [
            `¥${Number(v).toLocaleString()}`,
            name === 'cashProfit' ? '现金收益' : '积分价值',
          ]}
        />
        <Bar dataKey="cashProfit" fill="#60a5fa" radius={[3, 3, 0, 0]} name="现金收益" />
        <Bar dataKey="pointsValue" fill="#a78bfa" radius={[3, 3, 0, 0]} name="积分价值" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 订单数趋势 ────────────────────────────────────────────────
function OrderCountChart({ data }: { data: any[] }) {
  if (!data?.length) return <Empty description="暂无数据" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 11 }} />
        <YAxis tick={{ fill: '#555', fontSize: 11 }} allowDecimals={false} />
        <RTooltip
          contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6 }}
          labelStyle={{ color: '#888' }}
          formatter={(v: any) => [v, '订单数']}
        />
        <Line type="monotone" dataKey="orderCount" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── 城市分布 ─────────────────────────────────────────────────
function CityTable({ data }: { data: any[] }) {
  const columns = [
    { title: '城市', dataIndex: 'city', render: (v: string) => <span style={{ color: '#ededed' }}>{v}</span> },
    { title: '订单数', dataIndex: 'orderCount', sorter: (a: any, b: any) => a.orderCount - b.orderCount },
    {
      title: '总收益',
      dataIndex: 'totalRevenue',
      render: (v: number) => <span style={{ color: '#22c55e' }}>¥{v?.toLocaleString()}</span>,
      sorter: (a: any, b: any) => a.totalRevenue - b.totalRevenue,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '现金收益',
      dataIndex: 'cashProfit',
      render: (v: number) => <span style={{ color: '#60a5fa' }}>¥{v?.toLocaleString()}</span>,
    },
  ];
  return (
    <Table dataSource={data} columns={columns} rowKey="city" size="small" pagination={false}
      style={{ background: 'transparent' }} />
  );
}

// ── 集团排行 ─────────────────────────────────────────────────
function GroupChart({ data }: { data: any[] }) {
  if (!data?.length) return <Empty description="暂无数据" />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>收益占比</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="totalRevenue" nameKey="hotelGroup" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#333' }}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <RTooltip contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6 }}
              formatter={(v: any) => [`¥${Number(v).toLocaleString()}`, '总收益']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>集团明细</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((g, i) => (
            <div key={g.hotelGroup} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, color: '#888' }}>{g.hotelGroup}</div>
              <div style={{ fontSize: 13, color: '#ededed', fontWeight: 500 }}>¥{g.totalRevenue?.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#555', width: 50, textAlign: 'right' }}>{g.orderCount} 单</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 预授权待退 ────────────────────────────────────────────────
function PreAuthTable({ data }: { data: any[] }) {
  const columns = [
    {
      title: '客户',
      dataIndex: 'customerName',
      render: (v: string) => <span style={{ color: '#ededed' }}>{v}</span>,
    },
    {
      title: '酒店',
      dataIndex: 'hotelName',
      render: (v: string, r: any) => (
        <div>
          <div style={{ color: '#ededed', fontSize: 13 }}>{v}</div>
          <div style={{ color: '#555', fontSize: 11 }}>{r.checkIn} → {r.checkOut}</div>
        </div>
      ),
    },
    {
      title: '预授权',
      dataIndex: 'preAuth',
      render: (v: number) => <span style={{ color: '#f59e0b', fontWeight: 600 }}>¥{v?.toLocaleString()}</span>,
    },
    {
      title: '已退',
      dataIndex: 'preAuthRefund',
      render: (v: number) => <span style={{ color: '#22c55e' }}>¥{(v || 0).toLocaleString()}</span>,
    },
    {
      title: '状态',
      dataIndex: 'preAuthStatus',
      render: (v: string, r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag color={v === 'partial' ? 'orange' : 'gold'} style={{ fontSize: 11 }}>
            {v === 'partial' ? '部分退款' : '未退款'}
          </Tag>
          {r.overdue && (
            <Tooltip title="入住超7天未退，请尽快处理">
              <WarningFilled style={{ color: '#ef4444', fontSize: 14 }} />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  if (!data?.length) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: '#555' }}>
      ✓ 暂无待退预授权
    </div>
  );

  return (
    <Table dataSource={data} columns={columns} rowKey="id" size="small" pagination={false}
      style={{ background: 'transparent' }}
      rowClassName={r => r.overdue ? 'preauth-overdue' : ''}
    />
  );
}

// ── 主页面 ────────────────────────────────────────────────────
export default function Analytics() {
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [byCity, setByCity] = useState<any[]>([]);
  const [byGroup, setByGroup] = useState<any[]>([]);
  const [byType, setByType] = useState<any[]>([]);
  const [preAuth, setPreAuth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAnalyticsSummary(),
      fetchAnalyticsMonthly(),
      fetchAnalyticsByCity(),
      fetchAnalyticsByGroup(),
      fetchAnalyticsByType(),
      fetchPreAuthPending(),
    ]).then(([s, m, c, g, t, p]) => {
      setSummary(s);
      setMonthly(m);
      setByCity(c);
      setByGroup(g);
      setByType(t);
      setPreAuth(p);
    }).finally(() => setLoading(false));
  }, []);

  const overdueCount = preAuth.filter(p => p.overdue).length;

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    </AppLayout>
  );

  const tabItems = [
    {
      key: 'overview',
      label: '总览',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* KPI 卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <StatCard label="总订单数" value={summary?.totalOrders ?? 0} sub={`${summary?.activeOrders ?? 0} 个进行中`} />
            <StatCard label="总现金收益" value={`¥${(summary?.totalCashProfit ?? 0).toLocaleString()}`} color="#22c55e" />
            <StatCard label="积分折现价值" value={`¥${(summary?.totalPointsValue ?? 0).toLocaleString()}`} color="#a78bfa" />
            <StatCard label="综合收益" value={`¥${(summary?.totalRevenue ?? 0).toLocaleString()}`} color="#60a5fa"
              sub={`均单 ¥${summary?.avgRevenuePerOrder?.toLocaleString() ?? 0}`} />
          </div>

          {/* 图表行 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 10, padding: '20px 24px' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 16, fontWeight: 500 }}>月度收益趋势</div>
              <MonthlyChart data={monthly} />
            </div>
            <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 10, padding: '20px 24px' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 16, fontWeight: 500 }}>月度订单量</div>
              <OrderCountChart data={monthly} />
            </div>
          </div>

          {/* 类型分布 */}
          <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 10, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16, fontWeight: 500 }}>订单类型分布</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {byType.map((t, i) => (
                <div key={t.orderType} style={{
                  flex: '1 1 140px', background: '#0a0a0a', border: '1px solid #1a1a1a',
                  borderRadius: 8, padding: '14px 18px',
                }}>
                  <div style={{ fontSize: 12, color: PIE_COLORS[i % PIE_COLORS.length], marginBottom: 6 }}>
                    {{ points_redemption: '积分兑换', cash_booking: '现金代订', hybrid: '混合' }[t.orderType as string] || t.orderType}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#ededed' }}>{t.orderCount}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>¥{t.avgPerOrder?.toLocaleString()} / 单</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'city',
      label: '城市分析',
      children: (
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 10, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16, fontWeight: 500 }}>各城市订单 & 收益</div>
          <CityTable data={byCity} />
        </div>
      ),
    },
    {
      key: 'group',
      label: '集团排行',
      children: (
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 10, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16, fontWeight: 500 }}>酒店集团收益排行</div>
          <GroupChart data={byGroup} />
        </div>
      ),
    },
    {
      key: 'preauth',
      label: (
        <span>
          预授权跟踪
          {overdueCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: '50%',
              background: '#ef4444', color: '#fff', fontSize: 10,
              marginLeft: 6, fontWeight: 700,
            }}>{overdueCount}</span>
          )}
        </span>
      ),
      children: (
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 10, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>待退预授权</span>
            {overdueCount > 0 && (
              <Tag color="error" style={{ fontSize: 11 }}>
                {overdueCount} 笔超期（入住 7 天以上未退）
              </Tag>
            )}
          </div>
          <PreAuthTable data={preAuth} />
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#ededed' }}>数据统计</h2>
          <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>订单收益、城市分布、集团排行、预授权跟踪</p>
        </div>
        <Tabs items={tabItems} defaultActiveKey="overview" />
      </div>
    </AppLayout>
  );
}
