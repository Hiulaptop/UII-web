export function WeeklyBars({ values }: { values: number[] }) {
  const W = 520;
  const H = 200;
  const pad = 24;
  const n = values.length;
  const bw = Math.min(56, (W - pad * 2) / n - 12);
  const gap = n > 1 ? (W - pad * 2 - bw * n) / (n - 1) : 0;
  const max = Math.max(1, ...values) + 1;
  const peak = values.indexOf(Math.max(...values));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full max-w-[520px]"
      role="img"
      aria-label={`Số cảnh báo theo tuần: ${values.map((v, i) => `tuần ${i + 1}: ${v}`).join(", ")}`}
    >
      <line x1={pad} x2={W - pad} y1={H - 24} y2={H - 24} className="stroke-mist" />
      {values.map((v, i) => {
        const bh = ((H - 56) * v) / max;
        const x = pad + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={H - 24 - bh} width={bw} height={bh} className={v > 0 && i === peak ? "fill-ember-orange" : "fill-graphite"} />
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="fill-slate text-[12px]">
              Tuần {i + 1}
            </text>
            <text x={x + bw / 2} y={H - 30 - bh} textAnchor="middle" className="fill-graphite text-[12px]">
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
