import { useMemo } from 'react';

export function PriceHistoryChart({ 
  history, 
  threshold 
}: { 
  history: Array<{ ts: string; price: number | null }>;
  threshold?: number;
}) {
  const points = useMemo(() => {
    return (history || [])
      .filter((h) => h.price != null)
      .map((h) => ({ ts: h.ts, price: h.price as number }))
      .sort((a, b) => (a.ts > b.ts ? 1 : -1));
  }, [history]);

  if (!points.length) return (
    <div style={{ 
      height: 180, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#F9FAFB', 
      borderRadius: 12,
      color: '#9CA3AF',
      border: '1px dashed #E6E8EB'
    }}>
      暂无价格历史数据
    </div>
  );

  const prices = points.map((p) => p.price);
  if (threshold) prices.push(threshold);
  
  const min = Math.max(0, Math.min(...prices) * 0.95);
  const max = Math.max(...prices) * 1.05;
  
  const w = 800;
  const h = 240;
  const padT = 20;
  const padB = 40;
  const padL = 60;
  const padR = 20;

  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const scaleX = (i: number) => padL + (i * innerW) / Math.max(1, points.length - 1);
  const scaleY = (price: number) => {
    if (max === min) return padT + innerH / 2;
    return padT + innerH - ((price - min) * innerH) / (max - min);
  };

  // 生成折线路径
  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p.price).toFixed(1)}`)
    .join(' ');

  // 生成面积路径
  const areaD = `${lineD} L ${scaleX(points.length - 1).toFixed(1)} ${scaleY(min).toFixed(1)} L ${scaleX(0).toFixed(1)} ${scaleY(min).toFixed(1)} Z`;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 0' }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 网格背景线 */}
        <line x1={padL} y1={scaleY(min)} x2={w - padR} y2={scaleY(min)} stroke="#F3F4F6" strokeWidth={1} />
        <line x1={padL} y1={scaleY(max)} x2={w - padR} y2={scaleY(max)} stroke="#F3F4F6" strokeDasharray="4" strokeWidth={1} />

        {/* 目标价警戒线 */}
        {threshold && (
          <g>
            <line 
              x1={padL} y1={scaleY(threshold)} x2={w - padR} y2={scaleY(threshold)} 
              stroke="#EF4444" strokeDasharray="4" strokeWidth={1} strokeOpacity={0.6}
            />
            <text x={padL - 5} y={scaleY(threshold) + 4} fontSize={10} fill="#EF4444" textAnchor="end">目标价</text>
          </g>
        )}

        {/* 面积填充 */}
        <path d={areaD} fill="url(#areaGradient)" />

        {/* 主折线 */}
        <path d={lineD} stroke="#3B82F6" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* 数据点 */}
        {points.length < 50 && points.map((p, i) => (
          <circle key={i} cx={scaleX(i)} cy={scaleY(p.price)} r={3.5} fill="#fff" stroke="#3B82F6" strokeWidth={2} />
        ))}

        {/* 坐标轴标注 */}
        <text x={padL - 10} y={scaleY(min)} fontSize={11} fill="#9CA3AF" textAnchor="end">¥{min.toFixed(0)}</text>
        <text x={padL - 10} y={scaleY(max)} fontSize={11} fill="#9CA3AF" textAnchor="end">¥{max.toFixed(0)}</text>
        
        <text x={padL} y={h - 15} fontSize={11} fill="#9CA3AF">{points[0].ts.slice(5, 16).replace('T', ' ')}</text>
        <text x={w - padR} y={h - 15} fontSize={11} fill="#9CA3AF" textAnchor="end">{points[points.length - 1].ts.slice(5, 16).replace('T', ' ')}</text>
      </svg>
    </div>
  );
}
