import { useMemo } from 'react';

export function PriceHistoryChart({ history }: { history: Array<{ ts: string; price: number | null }> }) {
  const points = useMemo(() => {
    return (history || [])
      .filter((h) => h.price != null)
      .map((h) => ({ ts: h.ts, price: h.price as number }))
      .sort((a, b) => (a.ts > b.ts ? 1 : -1));
  }, [history]);

  if (!points.length) return <div style={{ color: '#888' }}>暂无可用价格历史</div>;

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const w = 720;
  const h = 180;
  const pad = 24;

  const scaleX = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const scaleY = (price: number) => {
    if (max === min) return h / 2;
    return h - pad - ((price - min) * (h - pad * 2)) / (max - min);
  };

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p.price).toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <svg width={w} height={h} style={{ maxWidth: '100%', background: '#fafafa', border: '1px solid #eee', borderRadius: 8 }}>
        <path d={d} stroke="#1677ff" strokeWidth={2} fill="none" />
        {points.map((p, i) => (
          <circle key={p.ts} cx={scaleX(i)} cy={scaleY(p.price)} r={3} fill="#1677ff" />
        ))}
        <text x={pad} y={pad} fontSize={12} fill="#666">min ¥{min}</text>
        <text x={w - pad - 80} y={pad} fontSize={12} fill="#666">max ¥{max}</text>
      </svg>
      <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
        {points[0].ts.slice(0, 16).replace('T', ' ')} → {points[points.length - 1].ts.slice(0, 16).replace('T', ' ')}
      </div>
    </div>
  );
}
