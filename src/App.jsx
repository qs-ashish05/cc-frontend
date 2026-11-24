import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RANGES, fetchRange } from "./api.js";
import {
  SERIES_COLORS,
  computeKpis,
  daysSince,
  enrich,
  formatDate,
  hourSeries,
  pct,
  toTitle,
  topCounts,
  trendSeries,
  weekdaySeries,
} from "./utils.js";
import Kpis from "./components/Kpis.jsx";
import { ColumnChart, TrendChart } from "./components/Charts.jsx";
import MultiSelect from "./components/MultiSelect.jsx";
import DataTable from "./components/DataTable.jsx";
import { CompareChart, FilterChips, MultiBarList } from "./components/Compare.jsx";
import "./components.css";

const CACHE_MS = 60_000;
const MAX_COMPARE = SERIES_COLORS.length;
const REFRESH_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 5, label: "Every 5 s" },
  { value: 10, label: "Every 10 s" },
  { value: 30, label: "Every 30 s" },
  { value: 60, label: "Every 60 s" },
];
const GRANULARITY_LABEL = { day: "per day", week: "per week", month: "per month" };

export default function App() {
  const [range, setRange] = useState("all");
  const [locations, setLocations] = useState([]); // [] = all locations
  const [categories, setCategories] = useState([]); // [] = all categories
  const [refreshSec, setRefreshSec] = useState(0);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const cache = useRef(new Map());

  const rangeDef = RANGES.find((r) => r.value === range);

  const load = useCallback(
    async ({ force = false, silent = false, signal } = {}) => {
      const hit = cache.current.get(range);
      if (!force && hit && Date.now() - hit.at < CACHE_MS) {
        setRows(hit.rows);
        setUpdatedAt(new Date(hit.at));
        setError(null);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const data = enrich(await fetchRange(rangeDef.path, signal));
        cache.current.set(range, { rows: data, at: Date.now() });
        setRows(data);
        setUpdatedAt(new Date());
        setError(null);
      } catch (e) {
        if (e.name === "AbortError") return;
        setError(e.message);
      }
      if (!signal?.aborted && !silent) setLoading(false);
    },
    [range, rangeDef]
  );

  // Fetch whenever the range dropdown changes.
  useEffect(() => {
    const controller = new AbortController();
    load({ signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  // Optional polling.
  useEffect(() => {
    if (!refreshSec) return undefined;
    const id = setInterval(() => load({ force: true, silent: true }), refreshSec * 1000);
    return () => clearInterval(id);
  }, [refreshSec, load]);

  // Dropdown options come from the data fetched for the chosen range.
  const categoryOptions = useMemo(() => topCounts(rows, (r) => r.category, 50), [rows]);
  const locationOptions = useMemo(() => topCounts(rows, (r) => r.streets, 150), [rows]);

  // Drop selections that no longer exist in the freshly fetched range.
  const effCategories = useMemo(
    () => categories.filter((c) => categoryOptions.some((o) => o.key === c)),
    [categories, categoryOptions]
  );
  const effLocations = useMemo(
    () => locations.filter((l) => locationOptions.some((o) => o.key === l)),
    [locations, locationOptions]
  );

  const byLocation = useMemo(() => {
    if (!effLocations.length) return rows;
    const set = new Set(effLocations);
    return rows.filter((r) => r.streets.some((s) => set.has(s)));
  }, [rows, effLocations]);
  const byCategory = useMemo(() => {
    if (!effCategories.length) return rows;
    const set = new Set(effCategories);
    return rows.filter((r) => set.has(r.category));
  }, [rows, effCategories]);
  const filtered = useMemo(() => {
    if (!effCategories.length) return byLocation;
    const set = new Set(effCategories);
    return byLocation.filter((r) => set.has(r.category));
  }, [byLocation, effCategories]);

  const kpi = useMemo(() => computeKpis(filtered), [filtered]);
  const trend = useMemo(() => trendSeries(filtered), [filtered]);
  const hours = useMemo(() => hourSeries(filtered), [filtered]);
  const weekdays = useMemo(() => weekdaySeries(filtered), [filtered]);

  // Comparison chart: one line per selected location (or category, if only categories are multi-selected).
  const compareDim = effLocations.length > 1 ? "location" : effCategories.length > 1 ? "category" : null;
  const compareAll = compareDim === "location" ? effLocations : compareDim === "category" ? effCategories : [];
  const compareKeys = compareAll.slice(0, MAX_COMPARE);
  const compareSig = compareKeys.join("|");

  const compareColors = useMemo(
    () => Object.fromEntries(compareKeys.map((k, i) => [k, SERIES_COLORS[i]])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compareSig]
  );
  const compareGroups = useMemo(
    () =>
      compareKeys.map((k) => ({
        key: k,
        label: compareDim === "location" ? toTitle(k) : k,
        match: compareDim === "location" ? (r) => r.streets.includes(k) : (r) => r.category === k,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compareSig, compareDim]
  );
  const compareTrend = useMemo(
    () => (compareDim ? trendSeries(filtered, compareGroups) : null),
    [compareDim, filtered, compareGroups]
  );

  // Cross-filtering: the category chart ignores the category filter (and the
  // location chart ignores the location filter) so you can still compare bars.
  const categoryBars = useMemo(
    () => topCounts(byLocation, (r) => r.category, 10).map((d) => ({ ...d, label: d.key })),
    [byLocation]
  );
  const locationBars = useMemo(
    () => topCounts(byCategory, (r) => r.streets, 10).map((d) => ({ ...d, label: toTitle(d.key) })),
    [byCategory]
  );

  const newest = rows[0]?.date_time;
  const age = daysSince(newest);
  const filtersActive = effLocations.length > 0 || effCategories.length > 0;
  const peakHour = [...hours].sort((a, b) => b.count - a.count)[0];

  const kpiItems = [
    {
      label: "Incidents",
      value: kpi.total.toLocaleString(),
      sub: filtersActive ? `of ${rows.length.toLocaleString()} in range` : "in range",
      tip: "Number of incidents that match the range, location and category you selected.",
    },
    {
      label: "Arrests",
      value: kpi.arrests.toLocaleString(),
      sub: `${pct(kpi.arrests, kpi.total)}% of incidents`,
      tip: "Records whose type is ARREST (for example warrant arrests).",
    },
    {
      label: "Theft share",
      value: `${pct(kpi.theft, kpi.total)}%`,
      sub: `${kpi.theft.toLocaleString()} incidents`,
      tip: "Shoplifting plus larceny, as a share of the selected incidents.",
    },
    {
      label: "Violent share",
      value: `${pct(kpi.violent, kpi.total)}%`,
      sub: `${kpi.violent.toLocaleString()} incidents`,
      tip: "Assault, assault and battery (A&B) and robbery, as a share of the selected incidents.",
    },
    {
      label: "Data freshness",
      value: age === null ? "–" : `${age} ${age === 1 ? "day" : "days"}`,
      sub: newest ? `latest: ${formatDate(newest)}` : "no data",
      tip: "Days between today and the newest record in the fetched range. A high number means the source feed is lagging.",
    },
  ];

  const resetFilters = () => {
    setLocations([]);
    setCategories([]);
  };
  const toggleIn = (setter) => (k) =>
    setter((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const chipItems = [
    ...effLocations.map((k) => ({
      kind: "Location",
      key: k,
      label: toTitle(k),
      color: compareDim === "location" ? compareColors[k] : null,
    })),
    ...effCategories.map((k) => ({
      kind: "Category",
      key: k,
      label: k,
      color: compareDim === "category" ? compareColors[k] : null,
    })),
  ];
  const removeChip = (c) =>
    (c.kind === "Location" ? setLocations : setCategories)((prev) => prev.filter((x) => x !== c.key));

  const filterKey = `${range}|${effLocations.join("~")}|${effCategories.join("~")}`;
  const csvName = `cambridge-incidents_${range}_${new Date().toISOString().slice(0, 10)}.csv`;

  return (
    <div className="page">
      <header className="topnav">
        <span className="brand">Cambridge Incidents</span>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#trends">Trends</a>
          <a href="#breakdown">Breakdown</a>
          <a href="#data">Data</a>
        </nav>
      </header>

      <main>
        <section className="intro">
          <h1>Incident overview</h1>
          <p className="lede">
            {rangeDef.label}
            {updatedAt && <> · updated {updatedAt.toLocaleTimeString()}</>}
          </p>
        </section>

        <section className="filters" aria-label="Filters">
          <label>
            <span>Time range</span>
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <MultiSelect
            label="Location"
            noun="locations"
            allLabel="All locations"
            options={locationOptions.map((o) => ({ ...o, label: toTitle(o.key) }))}
            selected={effLocations}
            onChange={setLocations}
          />
          <MultiSelect
            label="Category"
            noun="categories"
            allLabel="All categories"
            options={categoryOptions.map((o) => ({ ...o, label: o.key }))}
            selected={effCategories}
            onChange={setCategories}
          />
          <label>
            <span>Auto-refresh</span>
            <select value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))}>
              {REFRESH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-actions">
            <button type="button" className="btn" onClick={() => load({ force: true })}>
              Refresh
            </button>
            {filtersActive && (
              <button type="button" className="btn" onClick={resetFilters}>
                Clear
              </button>
            )}
          </div>
        </section>

        <FilterChips items={chipItems} onRemove={removeChip} onClear={resetFilters} />

        {error && (
          <div className="notice error" role="alert">
            <strong>Could not load data.</strong> {error}
            <div className="muted">
              Check that the backend is reachable and that the endpoint paths in <code>src/api.js</code> /{" "}
              <code>.env</code> match it.
            </div>
          </div>
        )}

        {loading && !rows.length && <p className="loading">Loading…</p>}

        {!loading && !error && !rows.length && (
          <div className="notice">
            <strong>No records in this range.</strong> The dataset can lag behind today, so try a longer range
            or “All data”.
          </div>
        )}

        {rows.length > 0 && (
          <div className={loading ? "content is-loading" : "content"}>
            <section id="overview" className="block">
              <Kpis items={kpiItems} />
            </section>

            <section id="trends" className="block">
              <div className="block-head">
                <h2>Incidents over time</h2>
                <span className="muted">{GRANULARITY_LABEL[trend.granularity]}</span>
              </div>
              <TrendChart series={trend} total={filtered.length} />
            </section>

            {compareDim && compareTrend && (
              <section className="block">
                <div className="block-head">
                  <h2>Comparison by {compareDim}</h2>
                  <span className="muted">{GRANULARITY_LABEL[compareTrend.granularity]}</span>
                </div>
                <CompareChart series={compareTrend} groups={compareGroups} colors={compareColors} />
                <p className="caption">
                  {compareDim === "location" &&
                    "An incident at an intersection counts toward each selected street, so lines can add up to more than the total. "}
                  {compareKeys.length < compareAll.length && `Showing the first ${MAX_COMPARE} selections.`}
                </p>
              </section>
            )}

            <section id="breakdown">
              <div className="block pair">
                <div>
                  <div className="block-head">
                    <h2>By category</h2>
                    <span className="muted">Click bars to select several</span>
                  </div>
                  <MultiBarList
                    data={categoryBars}
                    total={byLocation.length}
                    selected={effCategories}
                    colors={compareDim === "category" ? compareColors : {}}
                    onToggle={toggleIn(setCategories)}
                    caption="Bar length = incidents; % = share of the selected locations."
                  />
                </div>
                <div>
                  <div className="block-head">
                    <h2>Top locations</h2>
                    <span className="muted">Click bars to select several</span>
                  </div>
                  <MultiBarList
                    data={locationBars}
                    total={byCategory.length}
                    selected={effLocations}
                    colors={compareDim === "location" ? compareColors : {}}
                    onToggle={toggleIn(setLocations)}
                    caption="Bar length = incidents; % = share of the selected categories. Intersections count toward each street."
                  />
                </div>
              </div>

              <div className="block pair">
                <div>
                  <div className="block-head">
                    <h2>Time of day</h2>
                    {peakHour?.count > 0 && <span className="muted">peak {peakHour.full}</span>}
                  </div>
                  <ColumnChart data={hours} total={filtered.length} xInterval={2} />
                </div>
                <div>
                  <div className="block-head">
                    <h2>Day of week</h2>
                  </div>
                  <ColumnChart data={weekdays} total={filtered.length} />
                </div>
              </div>
            </section>

            <section id="data" className="block">
              <DataTable rows={filtered} resetKey={filterKey} filename={csvName} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
