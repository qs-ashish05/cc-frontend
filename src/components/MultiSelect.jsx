import { useEffect, useMemo, useRef, useState } from "react";

// Dropdown with checkboxes. `selected` = [] means "everything".
export default function MultiSelect({ label, options, selected, onChange, allLabel, noun }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options;
  }, [options, q]);

  const toggle = (key) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? options.find((o) => o.key === selected[0])?.label ?? selected[0]
        : `${selected.length} ${noun} selected`;

  return (
    <div className="ms" ref={ref}>
      <span className="ms-label">{label}</span>
      <button
        type="button"
        className="ms-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ms-summary">{summary}</span>
      </button>

      {open && (
        <div className="ms-panel" role="listbox" aria-multiselectable="true" aria-label={label}>
          {options.length > 8 && (
            <input
              className="ms-search"
              type="search"
              placeholder={`Search ${noun}…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          )}
          <div className="ms-actions">
            <button
              type="button"
              onClick={() => onChange([...new Set([...selected, ...visible.map((o) => o.key)])])}
            >
              Select all{q ? " shown" : ""}
            </button>
            <button type="button" onClick={() => onChange([])} disabled={!selected.length}>
              Clear
            </button>
          </div>
          <ul className="ms-list">
            {visible.map((o) => (
              <li key={o.key}>
                <label className="ms-opt">
                  <input type="checkbox" checked={selected.includes(o.key)} onChange={() => toggle(o.key)} />
                  <span className="ms-opt-label">{o.label}</span>
                  <span className="ms-opt-count">{o.count}</span>
                </label>
              </li>
            ))}
            {!visible.length && <li className="ms-none">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
