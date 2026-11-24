import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { pct } from "../utils.js";

// Multi-line chart: one coloured line per selected location / category, with a legend.
export function CompareChart({ series, groups, colors }) {
  if (!series.data.length) return <div className="empty">No data to compare.</div>;
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={series.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} width={36} />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="tip">
                  <div className="tip-title">{payload[0].payload.full}</div>
                  {payload.map((p) => (
                    <div key={p.dataKey}>
                      <span className="swatch" style={{ background: p.color }} /> {p.name}: {p.value}
                    </div>
                  ))}
                </div>
              ) : null
            }
          />
          <Legend verticalAlign="bottom" height={36} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          {groups.map((g, i) => (
            <Line
              key={g.key}
              type="monotone"
              dataKey={`s${i}`}
              name={g.label}
              stroke={colors[g.key]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Clickable bars that support several selected items at once.
export function MultiBarList({ data, total, selected, onToggle, colors, caption }) {
  if (!data.length) return <div className="empty">No data.</div>;
  const max = Math.max(1, ...data.map((d) => d.count));
  const hasSel = selected.length > 0;
  return (
    <div>
      <ul className="mbars">
        {data.map((d) => {
          const on = selected.includes(d.key);
          return (
            <li key={d.key}>
              <button
                type="button"
                className={`mbar${hasSel && !on ? " dim" : ""}${on ? " on" : ""}`}
                aria-pressed={on}
                onClick={() => onToggle(d.key)}
                title={`${d.label}: ${d.count.toLocaleString()} incidents`}
              >
                <span className="mbar-label">{d.label}</span>
                <span className="mbar-track">
                  <span
                    className="mbar-fill"
                    style={{ width: `${(d.count / max) * 100}%`, background: (on && colors[d.key]) || "var(--green)" }}
                  />
                </span>
                <span className="mbar-val">
                  {d.count.toLocaleString()} <small>{pct(d.count, total)}%</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {caption && <p className="caption">{caption}</p>}
    </div>
  );
}

// Legend of the active filters; chips use the same colours as the comparison chart.
export function FilterChips({ items, onRemove, onClear }) {
  if (!items.length) return null;
  return (
    <div className="chips" aria-label="Active filters">
      <span className="muted">Showing:</span>
      {items.map((c) => (
        <span className="chip" key={`${c.kind}-${c.key}`}>
          <span className="swatch" style={{ background: c.color || "var(--green)" }} />
          <span className="chip-kind">{c.kind}:</span> {c.label}
          <button type="button" aria-label={`Remove ${c.label}`} onClick={() => onRemove(c)}>
            ×
          </button>
        </span>
      ))}
      <button type="button" className="chip-clear" onClick={onClear}>
        Clear all
      </button>
    </div>
  );
}
