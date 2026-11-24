// ---------------------------------------------------------------------------
// Data helpers: categories, streets, KPIs and chart series
// ---------------------------------------------------------------------------

const DAY = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const THEFT_CATEGORIES = ["Shoplifting", "Larceny"];
export const VIOLENT_CATEGORIES = ["Assault / A&B", "Robbery"];

// Group the many raw `subtype` strings into a handful of dashboard categories.
export function categorize(subtype = "", type = "") {
  const s = String(subtype).toUpperCase();
  if (String(type).toUpperCase() === "ARREST" || s.includes("ARREST")) return "Arrest";
  if (s.includes("SHOPLIFT")) return "Shoplifting";
  if (s.includes("LARCENY")) return "Larceny";
  if (s.includes("ROBBERY")) return "Robbery";
  if (s.includes("A&B") || s.includes("ASSAULT") || s.includes("BATTERY")) return "Assault / A&B";
  if (s.includes("BURGLARY") || s.includes("B&E") || s.includes("BREAKING")) return "Burglary";
  if (/VANDAL|DEFACE|DESTRUCTION OF PROPERTY|MALICIOUS DAMAGE|WANTON/.test(s)) return "Vandalism";
  if (/FRAUD|FORGE|COUNTERFEIT/.test(s)) return "Fraud";
  if (/LEAVE SCENE|TRAFFIC|LICENSE|OP MV|MOTOR VEH|HIT AND RUN/.test(s)) return "Traffic / Vehicle";
  if (/DRUG|NARCOTIC|CONTROLLED|LIQUOR|DRUNK|INTOX/.test(s)) return "Drugs / Alcohol";
  if (/THREAT|DISORDERLY|DISTURB|HARASS/.test(s)) return "Threats / Disorder";
  return "Other";
}

// "DANA ST & MASSACHUSETTS AVE" -> ["DANA ST", "MASSACHUSETTS AVE"]
export function streetsOf(location = "") {
  return [...new Set(String(location).split("&").map((s) => s.trim()).filter(Boolean))];
}

// "LARCENY UNDER $1200 C266 S30(1)" -> "LARCENY UNDER $1200"
export function cleanOffence(subtype = "") {
  return String(subtype).replace(/\s+C\d+\s+S[\w()]+\s*$/i, "").trim() || "Unknown";
}

const KEEP_UPPER = new Set(["JFK", "MIT", "MBTA", "US", "MA", "II", "III"]);
export function toTitle(s = "") {
  return String(s)
    .toLowerCase()
    .split(" ")
    .map((w) => (KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// Add derived fields once, newest first.
export function enrich(rows) {
  return rows
    .map((r) => ({
      ...r,
      category: categorize(r.subtype, r.type),
      streets: streetsOf(r.location),
      offence: cleanOffence(r.subtype),
    }))
    .sort((a, b) => b.date_time.localeCompare(a.date_time));
}

// ---- dates (date_time is local wall-clock text: 2026-11-02T22:08:00.000) ----
const dayKey = (dt) => dt.slice(0, 10);
const hourOf = (dt) => parseInt(dt.slice(11, 13), 10) || 0;
const utcMs = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fmtDay = (ms) => {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

export function formatDateTime(dt) {
  if (!dt) return "";
  const [y, m, d] = dayKey(dt).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}, ${dt.slice(11, 16)}`;
}

export function formatDate(dt) {
  if (!dt) return "";
  const [y, m, d] = dayKey(dt).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function daysSince(dt) {
  if (!dt) return null;
  const [y, m, d] = dayKey(dt).split("-").map(Number);
  return Math.max(0, Math.floor((Date.now() - new Date(y, m - 1, d).getTime()) / DAY));
}

// ---- counting ----
export const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

// keyFn may return one key or an array of keys per row.
export function topCounts(rows, keyFn, limit = 10) {
  const map = new Map();
  for (const r of rows) {
    for (const k of [].concat(keyFn(r))) map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function computeKpis(rows) {
  const total = rows.length;
  const count = (set) => rows.filter((r) => set.includes(r.category)).length;
  return {
    total,
    arrests: rows.filter((r) => r.category === "Arrest").length,
    theft: count(THEFT_CATEGORIES),
    violent: count(VIOLENT_CATEGORIES),
  };
}

// Incidents per day / week / month, picked by how long the window is.
// Optional `groups` ([{ match: (row) => boolean }]) adds per-group counts as
// s0, s1, ... on every data point (used by the comparison chart).
export function trendSeries(rows, groups = []) {
  if (!rows.length) return { granularity: "day", data: [] };

  const perDay = new Map();
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    const k = dayKey(r.date_time);
    let e = perDay.get(k);
    if (!e) {
      e = { n: 0, g: Array(groups.length).fill(0) };
      perDay.set(k, e);
    }
    e.n++;
    groups.forEach((g, i) => {
      if (g.match(r)) e.g[i]++;
    });
    const t = utcMs(k);
    if (t < min) min = t;
    if (t > max) max = t;
  }

  const span = (max - min) / DAY;
  const granularity = span <= 45 ? "day" : span <= 240 ? "week" : "month";

  const startOf = (t) => {
    if (granularity === "day") return t;
    if (granularity === "week") return t - ((new Date(t).getUTCDay() + 6) % 7) * DAY;
    const d = new Date(t);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  };
  const next = (b) => {
    if (granularity === "day") return b + DAY;
    if (granularity === "week") return b + 7 * DAY;
    const d = new Date(b);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  };

  const buckets = new Map();
  for (const [k, e] of perDay) {
    const b = startOf(utcMs(k));
    let cur = buckets.get(b);
    if (!cur) {
      cur = { n: 0, g: Array(groups.length).fill(0) };
      buckets.set(b, cur);
    }
    cur.n += e.n;
    e.g.forEach((c, i) => (cur.g[i] += c));
  }

  const data = [];
  for (let b = startOf(min); b <= max; b = next(b)) {
    const d = new Date(b);
    const yr = d.getUTCFullYear();
    const cur = buckets.get(b);
    const point = {
      label: granularity === "month" ? `${MONTHS[d.getUTCMonth()]} '${String(yr).slice(2)}` : fmtDay(b),
      full:
        granularity === "day"
          ? `${fmtDay(b)}, ${yr}`
          : granularity === "week"
            ? `Week of ${fmtDay(b)}, ${yr}`
            : `${MONTHS[d.getUTCMonth()]} ${yr}`,
      count: cur?.n || 0,
    };
    groups.forEach((_, i) => (point[`s${i}`] = cur?.g[i] || 0));
    data.push(point);
  }
  return { granularity, data };
}

const hour12 = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;

export function hourSeries(rows) {
  const counts = Array(24).fill(0);
  for (const r of rows) counts[hourOf(r.date_time)]++;
  return counts.map((count, h) => ({
    label: String(h).padStart(2, "0"),
    full: `${hour12(h)} – ${hour12((h + 1) % 24)}`,
    count,
  }));
}

export function weekdaySeries(rows) {
  const counts = Array(7).fill(0);
  for (const r of rows) counts[(new Date(utcMs(dayKey(r.date_time))).getUTCDay() + 6) % 7]++;
  return counts.map((count, i) => ({ label: DAY_NAMES[i], full: DAY_NAMES[i], count }));
}

// ---- colours shared by the legend, comparison chart and bar lists ----
export const SERIES_COLORS = [
  "#15803d", "#2563eb", "#d97706", "#7c3aed",
  "#dc2626", "#0891b2", "#db2777", "#65a30d",
];

// ---- CSV export ----
export function toCsv(rows) {
  const derived = new Set(["streets", "offence"]);
  const cols = ["date_time", "type", "subtype", "category", "location"];
  for (const r of rows) {
    for (const k of Object.keys(r)) if (!derived.has(k) && !cols.includes(k)) cols.push(k);
  }
  const cell = (v) => {
    const t = v == null ? "" : String(v);
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => cell(r[c])).join(","));
  return "\uFEFF" + lines.join("\r\n"); // BOM so Excel reads UTF-8 correctly
}

export function downloadCsv(rows, filename) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
