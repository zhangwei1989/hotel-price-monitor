import { useEffect, useState } from 'react';
import { Button, Tag, Spin, Divider, Tooltip } from 'antd';
import {
  ReloadOutlined, BulbOutlined, RiseOutlined,
  WarningOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { AppLayout } from '../components/AppLayout';
import {
  fetchAnalyticsSummary, fetchAnalyticsMonthly,
  fetchAnalyticsByCity, fetchAnalyticsByGroup,
  fetchPreAuthPending,
} from '../api/orders';
import { fetchOrders } from '../api/orders';
import { fetchTasks } from '../api/tasks';

// ── 建议卡片 ─────────────────────────────────────────────────
interface Advice {
  type: 'opportunity' | 'warning' | 'insight' | 'action';
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
}

const TYPE_CONFIG = {
  opportunity: { icon: <RiseOutlined />,       color: '#22c55e', label: '机会' },
  warning:     { icon: <WarningOutlined />,     color: '#f59e0b', label: '预警' },
  insight:     { icon: <BulbOutlined />,        color: '#60a5fa', label: '洞察' },
  action:      { icon: <CheckCircleOutlined />, color: '#a78bfa', label: '行动' },
};

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#555' };
const PRIORITY_LABEL = { high: '高优先', medium: '中', low: '低' };

function AdviceCard({ advice }: { advice: Advice }) {
  const cfg = TYPE_CONFIG[advice.type];
  return (
    <div style={{
      background: '#111', border: '1px solid #1f1f1f', borderRadius: 10,
      padding: '18px 20px', display: 'flex', gap: 14,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${cfg.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: cfg.color, fontSize: 16,
      }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#ededed' }}>{advice.title}</span>
          <Tag style={{
            background: 'transparent', border: `1px solid ${cfg.color}`,
            color: cfg.color, fontSize: 10, padding: '0 5px', lineHeight: '16px',
          }}>{cfg.label}</Tag>
          <Tag style={{
            background: `${PRIORITY_COLOR[advice.priority]}18`,
            border: `1px solid ${PRIORITY_COLOR[advice.priority]}40`,
            color: PRIORITY_COLOR[advice.priority], fontSize: 10, padding: '0 5px', lineHeight: '16px',
          }}>{PRIORITY_LABEL[advice.priority]}</Tag>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#888', lineHeight: 1.6 }}>{advice.body}</p>
        {advice.tags && advice.tags.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {advice.tags.map(t => (
              <span key={t} style={{
                fontSize: 11, color: '#444', background: '#1a1a1a',
                padding: '2px 8px', borderRadius: 4,
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 规则引擎：根据真实数据生成建议 ─────────────────────────────
function generateAdvice(data: {
  summary: any;
  monthly: any[];
  byCity: any[];
  byGroup: any[];
  preAuth: any[];
  orders: any[];
  tasks: any[];
}): Advice[] {
  const advices: Advice[] = [];
  const { summary, monthly, byCity, byGroup, preAuth, orders, tasks } = data;

  // ── 预授权预警 ───────────────────────────────────────────
  const overduePreAuth = preAuth.filter(p => p.overdue);
  if (overduePreAuth.length > 0) {
    advices.push({
      type: 'warning',
      priority: 'high',
      title: `${overduePreAuth.length} 笔预授权超期未退`,
      body: `${overduePreAuth.map(p => `${p.hotelName}（${p.customerName}）¥${p.preAuth}`).join('、')}。入住超7天未退预授权，存在资金风险，请立即联系客户处理。`,
      tags: ['预授权', '资金风险', '紧急'],
    });
  } else if (preAuth.length > 0) {
    advices.push({
      type: 'action',
      priority: 'medium',
      title: `${preAuth.length} 笔预授权待退款`,
      body: `共 ${preAuth.length} 笔预授权未完成退款，总金额 ¥${preAuth.reduce((s, p) => s + (p.preAuth || 0), 0).toLocaleString()}。建议按入住时间优先跟进。`,
      tags: ['预授权', '待处理'],
    });
  }

  // ── 价格监控命中机会 ─────────────────────────────────────
  const triggeredTasks = tasks.filter(t => t.lastPrice != null && t.lastPrice < (t.threshold?.value ?? Infinity));
  if (triggeredTasks.length > 0) {
    advices.push({
      type: 'opportunity',
      priority: 'high',
      title: `${triggeredTasks.length} 个监控任务价格已达标`,
      body: `${triggeredTasks.map(t => `${t.hotelName}（¥${t.lastPrice}，目标 ¥${t.threshold?.value}）`).join('；')}。建议立即联系客户确认是否下单。`,
      tags: ['价格提醒', '下单时机'],
    });
  }

  // ── 近期入住提醒 ─────────────────────────────────────────
  const upcomingCheckIns = orders.filter(o => {
    if (o.status === 'cancelled' || o.status === 'completed') return false;
    const days = Math.ceil((new Date(o.checkIn).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 3;
  });
  if (upcomingCheckIns.length > 0) {
    advices.push({
      type: 'action',
      priority: 'high',
      title: `${upcomingCheckIns.length} 个客户 3 天内入住`,
      body: `即将入住：${upcomingCheckIns.map(o => `${o.customerName}（${o.hotelName} ${o.checkIn}）`).join('、')}。请提前确认预订、提醒客户携带证件，并告知特殊服务安排。`,
      tags: ['入住提醒', '客户维护'],
    });
  }

  // ── 收益趋势分析 ─────────────────────────────────────────
  if (monthly.length >= 3) {
    const recentThree = monthly.slice(-3);
    const [m1, m2, m3] = recentThree;
    const trend = m3.cashProfit - m1.cashProfit;
    if (trend > 0) {
      advices.push({
        type: 'insight',
        priority: 'low',
        title: '近3月现金收益持续增长',
        body: `近3个月收益：¥${m1.cashProfit?.toLocaleString()} → ¥${m2.cashProfit?.toLocaleString()} → ¥${m3.cashProfit?.toLocaleString()}，增长 ¥${trend.toLocaleString()}。业务趋势良好，可适当扩大客源。`,
        tags: ['收益趋势', '增长'],
      });
    } else if (trend < 0) {
      advices.push({
        type: 'warning',
        priority: 'medium',
        title: '近3月收益出现下滑',
        body: `近3个月收益：¥${m1.cashProfit?.toLocaleString()} → ¥${m2.cashProfit?.toLocaleString()} → ¥${m3.cashProfit?.toLocaleString()}，下降 ¥${Math.abs(trend).toLocaleString()}。建议分析客源流失原因，考虑开拓新渠道。`,
        tags: ['收益趋势', '下滑'],
      });
    }
  }

  // ── 城市机会 ─────────────────────────────────────────────
  if (byCity.length >= 2) {
    const top = byCity[0];
    const weakCities = byCity.filter(c => c.orderCount === 1);
    if (top) {
      advices.push({
        type: 'insight',
        priority: 'low',
        title: `${top.city} 是当前核心市场`,
        body: `${top.city} 贡献最高收益 ¥${top.totalRevenue?.toLocaleString()}，占据 ${byCity.length} 个城市之首。建议深耕该城市的高端客户资源，同时关注 ${byCity[1]?.city || '次要城市'} 的增长潜力。`,
        tags: [top.city, '核心市场', '城市策略'],
      });
    }
    if (weakCities.length > 0) {
      advices.push({
        type: 'insight',
        priority: 'low',
        title: `${weakCities.length} 个城市订单量仅1单`,
        body: `${weakCities.map(c => c.city).join('、')} 等城市仅有1单记录。建议评估这些市场是否值得继续投入，或是否有未记录的重复客户。`,
        tags: ['城市分析', '市场评估'],
      });
    }
  }

  // ── 集团积分策略 ─────────────────────────────────────────
  if (byGroup.length > 0) {
    const topGroup = byGroup[0];
    const pointsGroups = byGroup.filter(g => g.pointsValue > 0);
    if (pointsGroups.length > 0) {
      const totalPoints = pointsGroups.reduce((s, g) => s + g.pointsValue, 0);
      advices.push({
        type: 'opportunity',
        priority: 'medium',
        title: `积分兑换带来 ¥${totalPoints.toLocaleString()} 附加价值`,
        body: `${pointsGroups.map(g => `${g.hotelGroup} ¥${g.pointsValue?.toLocaleString()}`).join('、')}。积分策略效果显著，建议向客户重点推介 ${topGroup.hotelGroup} 会员体系，提升复购率。`,
        tags: ['积分策略', '附加价值', topGroup.hotelGroup],
      });
    }
  }

  // ── 监控任务建议 ─────────────────────────────────────────
  const expiredTasks = tasks.filter(t => t.autoStopDate && new Date(t.autoStopDate) < new Date());
  if (expiredTasks.length > 0) {
    advices.push({
      type: 'action',
      priority: 'low',
      title: `${expiredTasks.length} 个监控任务已过期`,
      body: `${expiredTasks.map(t => t.hotelName).join('、')} 的监控任务已过入住日期。建议清理过期任务，减少系统负担。`,
      tags: ['任务管理', '清理'],
    });
  }

  const activeTasks = tasks.filter(t => t.enabled !== false && !(t.autoStopDate && new Date(t.autoStopDate) < new Date()));
  if (activeTasks.length === 0 && tasks.length === 0) {
    advices.push({
      type: 'action',
      priority: 'medium',
      title: '尚未设置价格监控任务',
      body: '当前没有任何价格监控任务。建议为近期有代订意向的客户创建监控任务，在价格合适时第一时间通知。',
      tags: ['价格监控', '入门建议'],
    });
  }

  // ── 无数据兜底 ───────────────────────────────────────────
  if (advices.length === 0) {
    advices.push({
      type: 'insight',
      priority: 'low',
      title: '当前运营状况良好',
      body: '没有发现需要特别关注的风险或机会。预授权已全部退款、订单状态正常、价格监控运行中。继续保持！',
      tags: ['一切正常'],
    });
  }

  // 按优先级排序
  const pOrder = { high: 0, medium: 1, low: 2 };
  return advices.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]);
}

// ── 主页面 ────────────────────────────────────────────────────
export default function AiAdvisor() {
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshAt, setRefreshAt] = useState(new Date());
  const [stats, setStats] = useState({ orders: 0, tasks: 0, preAuth: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const [summary, monthly, byCity, byGroup, preAuth, ordersResult, tasksResult] = await Promise.all([
        fetchAnalyticsSummary(),
        fetchAnalyticsMonthly(),
        fetchAnalyticsByCity(),
        fetchAnalyticsByGroup(),
        fetchPreAuthPending(),
        fetchOrders({ pageSize: 200 }),
        fetchTasks({ pageSize: 200 }),
      ]);

      const generated = generateAdvice({
        summary,
        monthly,
        byCity,
        byGroup,
        preAuth,
        orders: ordersResult.orders || [],
        tasks: tasksResult.tasks || [],
      });

      setAdvices(generated);
      setStats({
        orders: ordersResult.total || 0,
        tasks: tasksResult.total || 0,
        preAuth: preAuth.length || 0,
      });
      setRefreshAt(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const highCount = advices.filter(a => a.priority === 'high').length;
  const byType = {
    opportunity: advices.filter(a => a.type === 'opportunity').length,
    warning: advices.filter(a => a.type === 'warning').length,
    insight: advices.filter(a => a.type === 'insight').length,
    action: advices.filter(a => a.type === 'action').length,
  };

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px', maxWidth: 900 }}>
        {/* 标题 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#ededed' }}>
              AI 代订建议
            </h2>
            <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>
              基于订单数据 & 价格监控自动生成，分析 {stats.orders} 个订单 / {stats.tasks} 个监控任务
            </p>
          </div>
          <Button
            icon={<ReloadOutlined />} size="small" onClick={load} loading={loading}
            style={{ borderColor: '#2a2a2a', background: '#0a0a0a', color: '#888' }}
          >
            刷新
          </Button>
        </div>

        {/* 摘要栏 */}
        {!loading && (
          <div style={{
            display: 'flex', gap: 16, marginBottom: 20,
            padding: '14px 18px', background: '#111',
            border: `1px solid ${highCount > 0 ? '#7f1d1d' : '#1f1f1f'}`,
            borderRadius: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>本次分析结果</div>
              <div style={{ fontSize: 13, color: '#888' }}>
                共 <span style={{ color: '#ededed', fontWeight: 600 }}>{advices.length}</span> 条建议
                {highCount > 0 && (
                  <span style={{ color: '#ef4444', marginLeft: 8 }}>
                    ⚠ {highCount} 条高优先级需立即处理
                  </span>
                )}
              </div>
            </div>
            <Divider type="vertical" style={{ height: 'auto', borderColor: '#1f1f1f' }} />
            <div style={{ display: 'flex', gap: 16 }}>
              {Object.entries(byType).map(([type, count]) => {
                const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
                return count > 0 ? (
                  <div key={type} style={{ textAlign: 'center' }}>
                    <div style={{ color: cfg.color, fontSize: 18, fontWeight: 700 }}>{count}</div>
                    <div style={{ color: '#555', fontSize: 11 }}>{cfg.label}</div>
                  </div>
                ) : null;
              })}
            </div>
            <Divider type="vertical" style={{ height: 'auto', borderColor: '#1f1f1f' }} />
            <div style={{ fontSize: 11, color: '#333', alignSelf: 'center' }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {refreshAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {/* 建议列表 */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spin size="large" tip="正在分析数据..." />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {advices.map((a, i) => <AdviceCard key={i} advice={a} />)}
          </div>
        )}

        {/* 说明 */}
        <div style={{ marginTop: 32, padding: '14px 18px', background: '#0a0a0a', borderRadius: 8, border: '1px solid #151515' }}>
          <div style={{ fontSize: 11, color: '#333', lineHeight: 1.8 }}>
            💡 建议基于本地订单数据和规则引擎自动生成，包含：预授权超期预警、价格监控命中提醒、近期入住提醒、收益趋势分析、城市机会洞察、积分策略建议。数据实时读取，点击「刷新」获取最新分析。
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
