import { useEffect, useState } from "react";
import { downloadCsv, formatDateTime } from "../utils.js";

const PAGE_SIZE = 50;

// Owns its own page state, so clicking Next / Prev re-renders only this table.
// `resetKey` changes when the filters change, which sends the table back to page 1.
export default function DataTable({ rows, resetKey, filename }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);

  useEffect(() => setPage(1), [resetKey]);

  const start = (current - 1) * PAGE_SIZE;
  const slice = rows.slice(start, start + PAGE_SIZE);

  return (
    <div className="dt">
      <div className="block-head">
        <h2>Incident records</h2>
        <button
          type="button"
          className="btn"
          disabled={!rows.length}
          onClick={() => downloadCsv(rows, filename)}
          title="Downloads every record matching the current filters, not just this page"
        >
          Export CSV ({rows.length.toLocaleString()})
        </button>
      </div>

      <div className="dt-scroll">
        <table className="dt-table">
          <thead>
            <tr>
              <th>Date &amp; time</th>
              <th>Category</th>
              <th>Offence</th>
              <th>Location</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={`${r.date_time}-${start + i}`}>
                <td className="nowrap">{formatDateTime(r.date_time)}</td>
                <td>{r.category}</td>
                <td>{r.subtype || r.offence}</td>
                <td>{r.location}</td>
                <td>{r.type}</td>
              </tr>
            ))}
            {!slice.length && (
              <tr>
                <td colSpan={5} className="empty">
                  No records match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="dt-pager">
        <span className="muted">
          {rows.length
            ? `Showing ${(start + 1).toLocaleString()}–${Math.min(start + PAGE_SIZE, rows.length).toLocaleString()} of ${rows.length.toLocaleString()}`
            : "0 records"}
        </span>
        {pages > 1 && (
          <div className="dt-pages">
            <button type="button" className="btn" onClick={() => setPage(1)} disabled={current === 1}>
              First
            </button>
            <button type="button" className="btn" onClick={() => setPage(current - 1)} disabled={current === 1}>
              Previous
            </button>
            <span className="dt-page">
              Page {current} of {pages}
            </span>
            <button type="button" className="btn" onClick={() => setPage(current + 1)} disabled={current === pages}>
              Next
            </button>
            <button type="button" className="btn" onClick={() => setPage(pages)} disabled={current === pages}>
              Last
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
