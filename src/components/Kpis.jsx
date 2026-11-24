export default function Kpis({ items }) {
  return (
    <div className="kpis">
      {items.map((k) => (
        <div className="kpi" key={k.label} data-tip={k.tip} tabIndex={0}>
          <span className="kpi-label">{k.label}</span>
          <span className="kpi-value">{k.value}</span>
          <span className="kpi-sub">{k.sub}</span>
        </div>
      ))}
    </div>
  );
}
