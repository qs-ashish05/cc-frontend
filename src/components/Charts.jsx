import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartTooltip from "./ChartTooltip.jsx";

const GREEN = "#15803d";
const GREEN_SOFT = "#b7dfc4";
const INK = "#1f2937";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const BG = "#ffffff";

const tick = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: 12,
  fill: MUTED,
};
const truncate = (s, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function Empty() {
  return <p className="empty">No data for this selection.</p>;
}

// Horizontal bars. data: [{ key, label, count }]. Click a bar to filter by it.
export function BarList({ data, total, selected, onSelect }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={data.length * 28 + 12}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 0 }}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="label"
          width={125}
          tick={tick}
          tickFormatter={(v) => truncate(v)}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "rgba(21,128,61,0.06)" }}
          content={<ChartTooltip total={total} hint={onSelect ? "Click the bar to filter" : undefined} />}
        />
        <Bar
          dataKey="count"
          barSize={12}
          radius={[0, 3, 3, 0]}
          isAnimationActive={false}
          cursor={onSelect ? "pointer" : "default"}
          onClick={(d) => onSelect && onSelect(d?.payload?.key ?? d?.key)}
        >
          {data.map((d) => (
            <Cell key={d.key} fill={!selected || selected === d.key ? GREEN : GREEN_SOFT} />
          ))}
          <LabelList dataKey="count" position="right" style={{ ...tick, fill: INK }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Incidents over time (day, week or month buckets).
export function TrendChart({ series, total }) {
  if (!series.data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={series.data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke={LINE} />
        <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={36} />
        <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ stroke: MUTED, strokeWidth: 1, strokeDasharray: "3 3" }}
          content={<ChartTooltip total={total} />}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={GREEN}
          strokeWidth={2}
          fill={GREEN}
          fillOpacity={0.1}
          isAnimationActive={false}
          activeDot={{ r: 4, fill: GREEN, stroke: BG, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Vertical columns (hour of day, day of week). The busiest bar is highlighted.
export function ColumnChart({ data, total, xInterval = 0 }) {
  const max = Math.max(0, ...data.map((d) => d.count));
  if (!max) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke={LINE} />
        <XAxis dataKey="label" tick={tick} interval={xInterval} tickLine={false} axisLine={{ stroke: LINE }} />
        <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} width={40} />
        <Tooltip cursor={{ fill: "rgba(21,128,61,0.06)" }} content={<ChartTooltip total={total} />} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.count === max ? GREEN : GREEN_SOFT} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
