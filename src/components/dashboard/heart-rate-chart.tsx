type Props = { values: number[]; threshold: number };

const W = 600;
const H = 160;
const PAD = 8;

export function HeartRateChart({ values, threshold }: Props) {
  const min = Math.min(...values, threshold) - 10;
  const max = Math.max(...values, threshold) + 10;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (values.length - 1);
  const y = (v: number) => H - PAD - ((v - min) * (H - PAD * 2)) / (max - min);
  const path = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const peak = values.indexOf(Math.max(...values));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-40 w-full"
      role="img"
      aria-label={`Nhịp tim 24 giờ, cao nhất ${values[peak]} bpm`}
    >
      <line x1={PAD} x2={W - PAD} y1={y(threshold)} y2={y(threshold)} className="stroke-brass" strokeWidth="1" strokeDasharray="4 4" />
      <path d={path} fill="none" className="stroke-graphite" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={x(peak)} cy={y(values[peak])} r="4" className="fill-ember-orange" />
    </svg>
  );
}
