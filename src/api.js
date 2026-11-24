// All endpoint settings live here. Override them in .env (see .env.example).
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const ALL_PATH = import.meta.env.VITE_ALL_PATH || "/incidents";
const RANGE_PATH = import.meta.env.VITE_RANGE_PATH || "/incidents/last/{range}";

const slugs = [
  ["7-days", "Last 7 days"],
  ["10-days", "Last 10 days"],
  ["15-days", "Last 15 days"],
  ["30-days", "Last 30 days"],
  ["2-months", "Last 2 months"],
  ["3-months", "Last 3 months"],
  ["6-months", "Last 6 months"],
  ["10-months", "Last 10 months"],
  ["12-months", "Last 12 months"],
];

export const RANGES = [
  { value: "all", label: "All data (entire dataset)", path: ALL_PATH },
  ...slugs.map(([slug, label]) => ({
    value: slug,
    label,
    path: RANGE_PATH.replace("{range}", slug),
  })),
];

// Accepts either a bare array or { count, data: [...] }
export async function fetchRange(path, signal) {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} (${path})`);
  const json = await res.json();
  const rows = Array.isArray(json) ? json : json.data ?? [];
  return rows.filter((r) => r && typeof r.date_time === "string");
}