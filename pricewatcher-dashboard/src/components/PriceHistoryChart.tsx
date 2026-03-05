import { useMemo } from 'react';

export function PriceHistoryChart({
  history,
  threshold,
}: {
  history: Array<{ ts: string; price: number | null }>;
  threshold?: number;
}) {
  const points = useMemo(() => {
    return (history || [])
      .filter(h => h.price != null)
      .map(h => ({ ts: h.ts, price: h.price as number }))
      .sort((a, b) => (a.ts > b.ts ? 1 : -1));
  }, [history]);

  if (!points.length) return (
    <div style={{
      height: 180,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      borderRadius: 8,
      color: '#333',
      border: '1px dashed #1f1f1f',
      fontSize: 13,
    }}>
      暂无价格历史数据
    </div>
  );

  const prices = points.map(p => p.price);
  if (threshold) prices.push(threshold);

  const min = Math.max(0, Math.min(...prices) * 0.95);
  const max = Math.max(...prices) * 1.05;

  const W = 800, H = 220;
  const padT = 16, padB = 36, padL = 60, padR = 20;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const sx = (i: number) => padL + (i * innerW) / Math.max(1, points.length - 1);
  const sy = (price: number) => {
    if (max === min) return padT + innerH / 2;
    return padT + innerH - ((price - min) * innerH) / (max - min);
  };

  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(p.price).toFixed(1)}`)
    .join(' ');

  const areaD = `${lineD} L ${sx(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${sx(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  // 均价线
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  return (
    <div style={{ background: '#0a0a0a', borderRadius: 8, padding: '12px 0 0' }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 网格线 */}
        {[min, (min + max) / 2, max].map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke="#1a1a1a" strokeWidth={1} />
            <text x={padL - 8} y={sy(v) + 4} fontSize={10} fill="#444" textAnchor="end">¥{Math.round(v)}</text>
          </g>
        ))}

        {/* 目标价线 */}
        {threshold && threshold >= min && threshold <= max && (
          <g>
            <line x1={padL} y1={sy(threshold)} x2={W - padR} y2={sy(threshold)}
              stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.7} />
            <text x={W - padR + 4} y={sy(threshold) + 4} fontSize={10} fill="#22c55e">目标</text>
          </g>
        )}

        {/* 均价线 */}
        {points.length > 2 && (
          <line x1={padL} y1={sy(avg)} x2={W - padR} y2={sy(avg)}
            stroke="#444" strokeDasharray="2 3" strokeWidth={1} />
        )}

        {/* 面积填充 */}
        <path d={areaD} fill="url(#lineGrad)" />

        {/* 主折线 */}
        <path d={lineD} stroke="#3b82f6" strokeWidth={2} fill="none"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* 数据点（数量较少时显示） */}
        {points.length <= 40 && points.map((p, i) => {
          const hit = threshold && p.price < threshold;
          return (
            <circle key={i}
              cx={sx(i)} cy={sy(p.price)} r={3}
              fill={hit ? '#22c55e' : '#0a0a0a'}
              stroke={hit ? '#22c55e' : '#3b82f6'}
              strokeWidth={1.5}
            />
          );
        })}

        {/* X 轴标注 */}
        <text x={padL} y={H - 8} fontSize={10} fill="#333">{points[0].ts.slice(5, 10).replace('-', '/')}</text>
        <text x={W - padR} y={H - 8} fontSize={10} fill="#333" textAnchor="end">
          {points[points.length - 1].ts.slice(5, 16).replace('T', ' ')}
        </text>
      </svg>
    </div>
  );
}
