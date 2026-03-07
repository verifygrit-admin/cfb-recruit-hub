import { useState } from "react";
import { createPortal } from "react-dom";

// Fixed-position tooltip rendered at document.body — escapes overflow-x:auto clipping
function TooltipPortal({ text, x, y }) {
  if (!text) return null;
  return createPortal(
    <div className="col-tooltip-fixed" style={{ left: x, top: y }}>{text}</div>,
    document.body
  );
}

const TIER_META = {
  top:        { label: "Top Match",  color: "#6ed430" },
  good:       { label: "Good Match", color: "#f5a623" },
  borderline: { label: "Borderline", color: "#ef5350" },
};

// desc shown on hover (desktop) or tap (mobile)
const COLS = [
  { label: "Target Rank", col: "matchRank",   fmt: v => v,
    desc: "Your personalized rank among eligible programs, sorted by academic rigor fit." },
  { label: "Match",       col: "matchTier",   fmt: v => v ? TIER_META[v]?.label : "—",
    desc: "Top Match = ranks 1–30 · Good Match = 31–40 · Borderline = 41–50." },
  { label: "School",      col: "_schoolName", fmt: v => v,
    desc: "Institution name." },
  { label: "Div",         col: "_divLabel",   fmt: v => v,
    desc: "NCAA Division classification." },
  { label: "Conf",        col: "Conference",  fmt: v => v,
    desc: "Athletic conference affiliation." },
  { label: "Dist (mi)",   col: "dist",        fmt: v => v?.toLocaleString(),
    desc: "Straight-line distance from your high school to campus in miles." },
  { label: "Test Opt",    col: "isTestOpt",   fmt: v => v === true ? "Yes" : "No",
    desc: "Yes = school uses test-optional admissions; your GPA-only score is used for matching." },
  { label: "COA (OOS)",   col: "_coaNum",     fmt: v => v ? `$${Math.round(v).toLocaleString()}` : "—",
    desc: "Annual Cost of Attendance out-of-state: tuition, room, board, and fees." },
  { label: "ADLTV",       col: "adltv",       fmt: v => v ? `$${Math.round(v).toLocaleString()}` : "—",
    desc: "Adjusted Degree Lifetime Value — estimated lifetime earnings premium, adjusted for the school's graduation rate." },
  { label: "Net Cost",    col: "netCost",     fmt: v => v != null ? `$${Math.round(v).toLocaleString()}` : "—",
    desc: "Projected 4-year net cost after Expected Family Contribution and estimated merit aid. Requires AGI + dependents in your profile." },
  { label: "DROI",        col: "droi",        fmt: v => v != null ? `${v.toFixed(1)}×` : "—",
    desc: "Degree ROI — ADLTV divided by projected 4-year net cost. Higher is better." },
  { label: "Break-Even",  col: "breakEven",   fmt: v => v != null ? `${v.toFixed(1)} yr` : "—",
    desc: "Estimated years post-graduation to fully recover your 4-year investment based on DROI." },
];

function TH({ label, col, desc, sort, onSort, tooltip, setTooltip }) {
  const active = sort.col === col;

  function handleMouseEnter(e) {
    if (!desc) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({ text: desc, x: r.left + r.width / 2, y: r.top - 6 });
  }

  function handleInfoTap(e) {
    e.stopPropagation();
    if (!desc) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip(t => t?.text === desc ? null : { text: desc, x: r.left + r.width / 2, y: r.top - 6 });
  }

  return (
    <th
      className="table-th"
      onClick={() => onSort(col)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltip(null)}
      style={{ color: active ? "#6ed430" : "#6b8c72" }}
    >
      {label}{active ? (sort.asc ? " ↑" : " ↓") : ""}
      {desc && (
        <button className="th-info-icon" onClick={handleInfoTap} aria-label={`About ${label}`}>ⓘ</button>
      )}
    </th>
  );
}

function LinkTH({ label, desc, tooltip, setTooltip }) {
  function handleMouseEnter(e) {
    if (!desc) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({ text: desc, x: r.left + r.width / 2, y: r.top - 6 });
  }

  function handleInfoTap(e) {
    e.stopPropagation();
    if (!desc) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip(t => t?.text === desc ? null : { text: desc, x: r.left + r.width / 2, y: r.top - 6 });
  }

  return (
    <th
      className="table-th"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltip(null)}
      style={{ color: "#6b8c72" }}
    >
      {label}
      {desc && (
        <button className="th-info-icon" onClick={handleInfoTap} aria-label={`About ${label}`}>ⓘ</button>
      )}
    </th>
  );
}

export default function ResultsTable({ results, name }) {
  const [sort, setSort]   = useState({ col: "matchRank", asc: true });
  const [tooltip, setTooltip] = useState(null); // { text, x, y }

  const top50 = results?.top50 || results?.top30 || [];
  if (!top50.length) return null;

  function onSort(col) {
    setSort(s => ({ col, asc: s.col === col ? !s.asc : col === "_schoolName" }));
  }

  const rows = [...top50].sort((a, b) => {
    const av = a[sort.col], bv = b[sort.col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return sort.asc ? cmp : -cmp;
  });

  const athFitPct   = results.topTier && results.athFit ? (results.athFit[results.topTier] * 100).toFixed(1) : null;
  const rigorPct    = results.acadRigorScore   != null ? (results.acadRigorScore   * 100).toFixed(1) : null;
  const testOptPct  = results.acadTestOptScore != null ? (results.acadTestOptScore * 100).toFixed(1) : null;

  return (
    <div style={{ padding: "0 24px 32px" }} onClick={() => setTooltip(null)}>
      <TooltipPortal text={tooltip?.text} x={tooltip?.x} y={tooltip?.y} />

      <div className="ql-table-header" style={{ color: "#ffffff" }}>{name ? `${name}'s GRIT FIT Results` : "GRIT FIT Results"}</div>
      <div style={{ fontSize: 12, color: "#c8f5a0", fontFamily: "'Barlow', sans-serif", fontWeight: 400, marginBottom: 16, marginTop: -4, textAlign: "center" }}>
        Your personalized target college football recruiting matches
      </div>

      {/* Athlete Score Dashboard */}
      <div className="ql-dashboard">
        <div className="ql-metric">
          <div className="ql-metric-icon">&#127944;</div>
          <div className="ql-metric-label">My Athletic Score</div>
          <div className="ql-metric-value">{athFitPct != null ? `${athFitPct}%` : "—"}</div>
          <div className="ql-metric-sub">Compared to My Matched Schools</div>
        </div>
        <div className="ql-metric">
          <div className="ql-metric-icon">&#128218;</div>
          <div className="ql-metric-label">My Academic Rigor Score</div>
          <div className="ql-metric-value">{rigorPct != null ? `${rigorPct}%` : "—"}</div>
          <div className="ql-metric-sub">SAT + GPA composite</div>
        </div>
        <div className="ql-metric">
          <div className="ql-metric-icon">&#9999;&#65039;</div>
          <div className="ql-metric-label">My Test Optional Score</div>
          <div className="ql-metric-value">{testOptPct != null ? `${testOptPct}%` : "—"}</div>
          <div className="ql-metric-sub">GPA-only score</div>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #1e2e21", borderRadius: 4 }}>
        <table className="results-table">
          <thead>
            <tr style={{ background: "#0e1510" }}>
              {COLS.map(c => (
                <TH key={c.col} label={c.label} col={c.col} desc={c.desc}
                    sort={sort} onSort={onSort}
                    tooltip={tooltip} setTooltip={setTooltip} />
              ))}
              <LinkTH label="Recruit Quest."
                desc="Submit your recruiting questionnaire directly to this program's coaching staff."
                tooltip={tooltip} setTooltip={setTooltip} />
              <LinkTH label="Coaching Staff"
                desc="View the football staff directory to identify the right coach to contact."
                tooltip={tooltip} setTooltip={setTooltip} />
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const meta = TIER_META[s.matchTier] || {};
              return (
                <tr key={s.UNITID} className={i % 2 === 0 ? "row-even" : "row-odd"}>
                  {COLS.map(c => (
                    <td key={c.col} style={{
                      padding: "7px 10px",
                      color: c.col === "_schoolName" ? "#e8edf0"
                           : c.col === "matchTier"   ? (meta.color || "#6b8c72")
                           : "#6b8c72",
                      whiteSpace: c.col === "_schoolName" ? "normal" : "nowrap",
                      fontWeight: c.col === "_schoolName" ? 500 : c.col === "matchTier" ? 700 : 400,
                    }}>
                      {c.fmt(s[c.col])}
                    </td>
                  ))}
                  <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                    {s._qLink
                      ? <a href={s._qLink} target="_blank" rel="noreferrer" className="table-link">Q &rarr;</a>
                      : <span style={{ color: "#2a3a2e" }}>—</span>}
                  </td>
                  <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                    {s._coachLink
                      ? <a href={s._coachLink} target="_blank" rel="noreferrer" className="table-link">Staff &rarr;</a>
                      : <span style={{ color: "#2a3a2e" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
