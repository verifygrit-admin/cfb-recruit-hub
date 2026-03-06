import { useState } from "react";

const TH = ({ label, col, sort, onSort }) => {
  const active = sort.col === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding: "8px 10px", textAlign: "left", cursor: "pointer", userSelect: "none",
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 1.5,
        color: active ? "#6ed430" : "#6b8c72", borderBottom: "1px solid #1e2e21",
        whiteSpace: "nowrap", fontWeight: 600, textTransform: "uppercase",
      }}
    >
      {label}{active ? (sort.asc ? " ↑" : " ↓") : ""}
    </th>
  );
};

const COLS = [
  { label: "#",          col: "_rank",       fmt: (_, i) => i + 1 },
  { label: "School",     col: "_schoolName", fmt: v => v },
  { label: "Div",        col: "_divLabel",   fmt: v => v },
  { label: "Conf",       col: "Conference",  fmt: v => v },
  { label: "Dist (mi)",  col: "dist",        fmt: v => v?.toLocaleString() },
  { label: "Acad Fit",   col: "acadScore",   fmt: v => v?.toFixed(3) },
  { label: "Ath Fit",    col: "athFitScore", fmt: v => v?.toFixed(3) },
  { label: "COA (OOS)",  col: "_coaNum",     fmt: v => v ? `$${Math.round(v).toLocaleString()}` : "—" },
  { label: "Net Cost",   col: "netCost",     fmt: v => v != null ? `$${Math.round(v).toLocaleString()}` : "—" },
  { label: "DROI",       col: "droi",        fmt: v => v != null ? `${v.toFixed(1)}×` : "—" },
  { label: "Break-Even", col: "breakEven",   fmt: v => v != null ? `${v.toFixed(1)} yr` : "—" },
];

export default function ResultsTable({ results }) {
  const [sort, setSort] = useState({ col: "acadScore", asc: false });

  if (!results?.top30?.length) return null;

  function onSort(col) {
    setSort(s => ({ col, asc: s.col === col ? !s.asc : col === "_schoolName" }));
  }

  const rows = [...results.top30].sort((a, b) => {
    const av = a[sort.col], bv = b[sort.col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return sort.asc ? cmp : -cmp;
  });

  return (
    <div style={{ padding: "0 24px 32px" }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
        letterSpacing: 2, color: "#6ed430", marginBottom: 12, paddingTop: 24,
        fontWeight: 700, textTransform: "uppercase",
      }}>
        Top {results.top30.length} Matches
      </div>
      <div style={{ overflowX: "auto", border: "1px solid #1e2e21", borderRadius: 4 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Barlow', sans-serif" }}>
          <thead>
            <tr style={{ background: "#0e1510" }}>
              {COLS.map(c => (
                <TH key={c.col} label={c.label} col={c.col} sort={sort} onSort={onSort} />
              ))}
              <th style={{ padding: "8px 10px", borderBottom: "1px solid #1e2e21", color: "#6b8c72", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: 1.5, fontWeight: 600 }}>Links</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr
                key={s.UNITID}
                style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", borderBottom: "1px solid #141e16" }}
              >
                {COLS.map(c => (
                  <td key={c.col} style={{
                    padding: "7px 10px",
                    color: c.col === "_schoolName" ? "#e8edf0" : "#6b8c72",
                    whiteSpace: c.col === "_schoolName" ? "normal" : "nowrap",
                    fontWeight: c.col === "_schoolName" ? 500 : 400,
                  }}>
                    {c.fmt(s[c.col === "_rank" ? "acadScore" : c.col], i)}
                  </td>
                ))}
                <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                  {s._qLink && <a href={s._qLink} target="_blank" rel="noreferrer" style={{ color: "#4fc3f7", marginRight: 8, textDecoration: "none", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>Q →</a>}
                  {s._coachLink && <a href={s._coachLink} target="_blank" rel="noreferrer" style={{ color: "#4fc3f7", textDecoration: "none", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>Staff →</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
