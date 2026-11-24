import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { pct } from "../utils.js";

const GREEN = "#15803d";
const TICK = { fontSize: 11, fill: "#6b7280" };

function Tip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tip">
      <div className="tip-title">{p.full}</div>
      <div>
        {p.count.toLocaleString()} incidents <span className="tip-muted">({pct(p.count, total)}%)</span>
      </div>
    </div>
  );
}

function Columns({ data, total, xInterval = "preserveEnd", height = 220 }) {
  if (!data?.length) return <div className="empty">No data.</div>;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={TICK} interval={xInterval} minTickGap={8} />
          <YAxis tick={TICK} allowDecimals={false} width={36} />
          <Tooltip cursor={{ fill: "#f0fdf4" }} content={<Tip total={total} />} />
          <Bar dataKey="count" name="Incidents" fill={GREEN} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ series, total }) {
  return <Columns data={series.data} total={total} xInterval="preserveStartEnd" height={240} />;
}

export function ColumnChart({ data, total, xInterval }) {
  return <Columns data={data} total={total} xInterval={xInterval} />;
}
