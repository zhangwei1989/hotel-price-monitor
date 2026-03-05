import { useMemo, useState, useCallback } from 'react';

interface HistoryPoint {
  ts: string;
  price: number | null;
  triggered?: boolean;
}

interface Props {
  history: HistoryPoint[];
  threshold?: number;
}

const W = 800, H = 240;
const padT = 20, padB = 40, padL = 64, padR = 32;
const innerW = W - padL - padR;
const innerH = H - padT - padB;

export function PriceHistoryChart({ history, threshold }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: { ts: string; price: number; triggered: boolean } } | null>(null);

  const points = useMemo(() => {
    return (history || [])
      .filter(h => h.price != null)
      .map(h => ({ ts: h.ts, price: h.price as number, triggered: h.triggered ?? false }))
      .sort((a, b) => (a.ts > b.ts ? 1 : -1));
  }, [history]);

  // 数据不足
  if (points.length < 2) return (
    <div style={{
      height: 180, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a', borderRadius: 8,
      border: '1px dashed #1f1f1f', gap: 8,
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize: 13, color: '#333' }}>
        {points.length === 0 ? '暂无价格历史数据' : '数据不足，至少需要 2 条记录才能显示趋势'}
      </span>
    </div>
  );

  const allPrices = points.map(p => p.price);
  if (threshold) allPrices.push(threshold);

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const lowestPrice = Math.min(...points.map(p => p.price));
  const avg = points.reduce((s, p) => s + p.price, 0) / points.length;

  const padding = (maxPrice - minPrice) * 0.12 || 50;
  const domainMin = Math.max(0, minPrice - padding);
  const domainMax = maxPrice + padding;

  const sx = (i: number) => padL + (i * innerW) / Math.max(1, points.length - 1);
  const sy = (price: number) => {
    if (domainMax === domainMin) return padT + innerH / 2;
    return padT + innerH - ((price - domainMin) * innerH) / (domainMax - domainMin);
  };

  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(p.price).toFixed(1)}`)
    .join(' ');

  const areaD = `${lineD} L ${sx(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${padL.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  // Y 轴刻度（4档）
  const yTicks = [domainMin, domainMin + (domainMax - domainMin) / 3, domainMin + (domainMax - domainMin) * 2 / 3, domainMax];

  // X 轴标注（最多 5 个）
  const xTickIndices = points.length <= 5
    ? points.map((_, i) => i)
    : [0, Math.floor(points.length * 0.25), Math.floor(points.length * 0.5), Math.floor(points.length * 0.75), points.length - 1];

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const relX = svgX - padL;
    if (relX < 0 || relX > innerW) { setTooltip(null); return; }
    const idx = Math.round((relX / innerW) * (points.length - 1));
    const p = points[Math.max(0, Math.min(idx, points.length - 1))];
    setTooltip({ x: sx(idx), y: sy(p.price), point: p });
  }, [points]);

  return (
    <div style={{ background: '#0a0a0a', borderRadius: 8, padding: '12px 0 4px', position: 'relative' }}>
      {/* 图例 */}
      <div style={{ display: 'flex', gap: 16, padding: '0 0 10px 64px', flexWrap: 'wrap' }}>
        <LegendItem color="#3b82f6" label={`均价 ¥${Math.round(avg)}`} />
        {threshold && <LegendItem color="#22c55e" dashed label={`目标价 ¥${threshold}`} />}
        <LegendItem color="#f59e0b" dashed label={`历史最低 ¥${lowestPrice}`} />
      </div>

      <svg
        width="100%" height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={padL} y={padT} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {/* Y 轴网格线 + 标注 */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)}
              stroke="#1a1a1a" strokeWidth={1} />
            <text x={padL - 8} y={sy(v) + 4} fontSize={10} fill="#3a3a3a" textAnchor="end">
              ¥{Math.round(v)}
            </text>
          </g>
        ))}

        {/* 历史最低价线 */}
        {lowestPrice >= domainMin && lowestPrice <= domainMax && (
          <g clipPath="url(#chartClip)">
            <line x1={padL} y1={sy(lowestPrice)} x2={W - padR} y2={sy(lowestPrice)}
              stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.2} strokeOpacity={0.8} />
          </g>
        )}

        {/* 目标价线 */}
        {threshold && threshold >= domainMin && threshold <= domainMax && (
          <g clipPath="url(#chartClip)">
            <line x1={padL} y1={sy(threshold)} x2={W - padR} y2={sy(threshold)}
              stroke="#22c55e" strokeDasharray="5 3" strokeWidth={1.2} strokeOpacity={0.8} />
          </g>
        )}

        {/* 均价线 */}
        {points.length > 2 && (
          <g clipPath="url(#chartClip)">
            <line x1={padL} y1={sy(avg)} x2={W - padR} y2={sy(avg)}
              stroke="#2a2a2a" strokeDasharray="2 3" strokeWidth={1} />
          </g>
        )}

        {/* 面积填充 */}
        <path d={areaD} fill="url(#areaGrad)" clipPath="url(#chartClip)" />

        {/* 主折线 */}
        <path d={lineD} stroke="#3b82f6" strokeWidth={2} fill="none"
          strokeLinecap="round" strokeLinejoin="round" clipPath="url(#chartClip)" />

        {/* 数据点（≤60条时显示） */}
        {points.length <= 60 && points.map((p, i) => {
          const hit = threshold != null && p.price < threshold;
          const isLowest = p.price === lowestPrice;
          return (
            <circle key={i}
              cx={sx(i)} cy={sy(p.price)} r={isLowest ? 4.5 : hit ? 3.5 : 2.5}
              fill={isLowest ? '#f59e0b' : hit ? '#22c55e' : '#0a0a0a'}
              stroke={isLowest ? '#f59e0b' : hit ? '#22c55e' : '#3b82f6'}
              strokeWidth={1.5}
            />
          );
        })}

        {/* Tooltip 竖线 */}
        {tooltip && (
          <line x1={tooltip.x} y1={padT} x2={tooltip.x} y2={padT + innerH}
            stroke="#333" strokeWidth={1} strokeDasharray="3 3" />
        )}

        {/* Tooltip 高亮点 */}
        {tooltip && (
          <circle cx={tooltip.x} cy={tooltip.y} r={5}
            fill={tooltip.point.triggered ? '#22c55e' : '#3b82f6'}
            stroke="#0a0a0a" strokeWidth={2} />
        )}

        {/* X 轴标注 */}
        {xTickIndices.map(i => (
          <text key={i} x={sx(i)} y={H - 8} fontSize={10} fill="#3a3a3a" textAnchor="middle">
            {points[i].ts.slice(5, 10).replace('-', '/')}
          </text>
        ))}
      </svg>

      {/* Tooltip 浮层 */}
      {tooltip && (() => {
        const p = tooltip.point;
        const hit = threshold != null && p.price < threshold;
        // tooltip 靠近右侧时向左展示
        const pct = (tooltip.x - padL) / innerW;
        const alignRight = pct > 0.65;
        return (
          <div style={{
            position: 'absolute',
            top: 40,
            left: alignRight ? undefined : `calc(${(tooltip.x / W) * 100}% + 12px)`,
            right: alignRight ? `calc(${((W - tooltip.x) / W) * 100}% + 12px)` : undefined,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: '#ededed',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}>
            <div style={{ color: '#555', marginBottom: 4 }}>
              {p.ts.replace('T', ' ').slice(0, 16)}
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: hit ? '#22c55e' : '#ededed' }}>
              ¥{p.price}
            </div>
            {hit && (
              <div style={{ fontSize: 11, color: '#22c55e', marginTop: 2 }}>✓ 低于目标价</div>
            )}
            {p.triggered && (
              <div style={{ fontSize: 11, color: '#22c55e', marginTop: 2 }}>🔔 已触发通知</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}>
      <svg width="20" height="10" viewBox="0 0 20 10">
        {dashed
          ? <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="1.5" strokeDasharray="4 2" />
          : <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="2" />
        }
      </svg>
      {label}
    </div>
  );
}
