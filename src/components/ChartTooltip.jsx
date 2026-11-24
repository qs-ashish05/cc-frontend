// Shared hover tooltip for every chart.
export default function ChartTooltip({ active, payload, total, unit = "incidents", hint }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  const count = payload[0].value;
  const share = total ? ((count / total) * 100).toFixed(1) : null;

  return (
    <div className="tip">
      <div className="tip-title">{datum.full || datum.label}</div>
      <div className="tip-row">
        <strong>{Number(count).toLocaleString()}</strong> {unit}
        {share !== null && (
          <span className="tip-muted">
            {" "}
            · {share}% of {total.toLocaleString()}
          </span>
        )}
      </div>
      {hint && <div className="tip-hint">{hint}</div>}
    </div>
  );
}
