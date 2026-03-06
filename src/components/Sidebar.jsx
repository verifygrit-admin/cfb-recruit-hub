import { useMemo } from "react";
import { DIV_COLORS, TIER_LABELS } from "../lib/constants.js";

const TIER_BTNS = [
  { value: "Power 4",   label: "Power 4" },
  { value: "G5",        label: "G5" },
  { value: "FBS Ind",   label: "FBS Ind" },
  { value: "1-FCS",     label: "FCS" },
  { value: "2-Div II",  label: "D-II" },
  { value: "3-Div III", label: "D-III" },
];

const SEL_BTNS = [
  "Super Elite", "Elite", "Very Selective", "Selective", "Somewhat Selective", "Standard",
];

const ADLTV_BTNS = [
  { value: "ALL", label: "All" },
  { value: "25",  label: "Top 25" },
  { value: "50",  label: "Top 50" },
  { value: "100", label: "Top 100" },
  { value: "150", label: "Top 150" },
  { value: "200", label: "Top 200" },
];

export default function Sidebar({ schools, filters, onChange, visibleCount }) {
  const conferences = useMemo(() => {
    const s = new Set(schools.map(sc => sc.Conference).filter(Boolean));
    return ["ALL", ...Array.from(s).sort()];
  }, [schools]);

  const allStates = useMemo(() => {
    const s = new Set(schools.map(sc => sc.State).filter(Boolean));
    return Array.from(s).sort();
  }, [schools]);

  function toggleTier(t) {
    const cur = filters.tiers;
    onChange("tiers", cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]);
  }

  function toggleSel(t) {
    const cur = filters.selectivity;
    onChange("selectivity", cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]);
  }

  function toggleState(st) {
    const cur = filters.states;
    onChange("states", cur.includes(st) ? cur.filter(x => x !== st) : [...cur, st]);
  }

  function reset() {
    onChange("reset");
  }

  return (
    <aside className="sidebar">

      <div className="sidebar-section">
        <div className="sidebar-label">Search</div>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            placeholder="School name or state..."
            value={filters.search}
            onChange={e => onChange("search", e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Division Tier</div>
        <div className="filter-group">
          <button
            className={`filter-btn all-btn${filters.tiers.length === 0 ? " active" : ""}`}
            onClick={() => onChange("tiers", [])}
          >All</button>
          {TIER_BTNS.map(t => (
            <button
              key={t.value}
              className={`filter-btn tier-btn${filters.tiers.length === 0 || filters.tiers.includes(t.value) ? " active" : ""}`}
              onClick={() => toggleTier(t.value)}
            >
              <span className="tier-dot" style={{ background: DIV_COLORS[t.value] }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Admissions Selectivity</div>
        <div className="filter-group">
          <button
            className={`filter-btn all-btn${filters.selectivity.length === 0 ? " active" : ""}`}
            onClick={() => onChange("selectivity", [])}
          >All</button>
          {SEL_BTNS.map(s => (
            <button
              key={s}
              className={`filter-btn${filters.selectivity.length === 0 || filters.selectivity.includes(s) ? " active" : ""}`}
              onClick={() => toggleSel(s)}
            >
              {s === "Very Selective" ? "Very Sel." : s === "Somewhat Selective" ? "Somewhat" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Conference</div>
        <select
          value={filters.conf}
          onChange={e => onChange("conf", e.target.value)}
        >
          {conferences.map(c => (
            <option key={c} value={c}>{c === "ALL" ? "All Conferences" : c}</option>
          ))}
        </select>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">ADLTV Rank (Top N)</div>
        <div className="filter-group">
          {ADLTV_BTNS.map(b => (
            <button
              key={b.value}
              className={`filter-btn${(b.value === "ALL" && filters.adltvRank === "ALL") || filters.adltvRank === b.value ? " active" : ""}`}
              onClick={() => onChange("adltvRank", b.value)}
            >{b.label}</button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">State</div>
        {filters.states.length > 0 && (
          <div className="state-chips">
            {filters.states.map(st => (
              <span key={st} className="state-chip">
                {st}
                <button className="state-chip-remove" onClick={() => toggleState(st)}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="state-search-wrap">
          <select
            value=""
            onChange={e => { if (e.target.value) toggleState(e.target.value); }}
            style={{ width: "100%" }}
          >
            <option value="">Add state filter…</option>
            {allStates.filter(st => !filters.states.includes(st)).map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sidebar-section">
        <button className="reset-btn" onClick={reset}>↺ Reset All Filters</button>
      </div>

      <div className="sidebar-section" style={{ marginTop: "auto" }}>
        <div className="sidebar-label">Legend</div>
        <div className="legend">
          {TIER_BTNS.map(t => (
            <div key={t.value} className="legend-item">
              <div className="legend-dot" style={{ background: DIV_COLORS[t.value] }} />
              {t.value === "1-FCS" ? "FCS" : t.value === "2-Div II" ? "Division II" : t.value === "3-Div III" ? "Division III" : t.value}
            </div>
          ))}
        </div>
        {schools.length > 0 && (
          <div style={{ marginTop: 10, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: "#6b8c72", letterSpacing: 1 }}>
            Showing <strong style={{ color: "#6ed430" }}>{visibleCount}</strong> of {schools.length} programs
          </div>
        )}
      </div>
    </aside>
  );
}
