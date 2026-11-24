// items: [{ label, value, sub, tip }]. Hover a figure to read how it is calculated.
export default function Kpis({ items }) {
  return (
    <div className="kpis">
      {items.map((k) => (
        <div key={k.label} className="kpi" data-tip={k.tip} tabIndex={0}>
          <span className="kpi-label">{k.label}</span>
          <span className="kpi-value">{k.value}</span>
          <span className="kpi-sub">{k.sub}</span>
        </div>
      ))}
    </div>
  );
}
