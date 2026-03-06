import { useState } from "react";

const TH = ({ label, col, sort, onSort }) => {
  const active = sort.col === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding: "8px 10px", textAlign: "left", cursor: "pointer", userSelect: "none",
        fontFamily: "'Courier New',monospace", fontSize: 10, letterSpacing: 1,
        color: active ? "#6ed430" : "#555", borderBottom: "1px solid #2a2a3e",
        whiteSpace: "nowrap",
      }}
    >
      {label}{active ? (sort.asc ? " ↑" : " ↓") : ""}
    </th>
  );
};

const COLS = [
  { label: "#",          col: "_rank",        fmt: (_, i) => i + 1 },
  { label: "SCHOOL",     col: "School_Name",  fmt: v => v },
  { label: "DIV",        col: "NCAA_Division", fmt: v => v },
  { label: "CONF",       col: "Conference",   fmt: v => v },
  { label: "DIST (MI)",  col: "dist",         fmt: v => v?.toLocaleString() },
  { label: "ACAD FIT",   col: "acadScore",    fmt: v => v?.toFixed(3) },
  { label: "ATH FIT",    col: "athFitScore",  fmt: v => v?.toFixed(3) },
  { label: "COA (OOS)",  col: "COA",          fmt: v => v ? `$${Math.round(v).toLocaleString()}` : "—" },
  { label: "NET COST",   col: "netCost",      fmt: v => v != null ? `$${Math.round(v).toLocaleString()}` : "—" },
  { label: "DROI",       col: "droi",         fmt: v => v != null ? `${v.toFixed(1)}×` : "—" },
  { label: "BREAK-EVEN", col: "breakEven",    fmt: v => v != null ? `${v.toFixed(1)} yr` : "—" },
];

export default function ResultsTable({ results }) {
  const [sort, setSort] = useState({ col: "acadScore", asc: false });

  if (!results?.top30?.length) return null;

  function onSort(col) {
    setSort(s => ({ col, asc: s.col === col ? !s.asc : col === "School_Name" }));
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
      <div style={{ fontFamily: "'Courier New',monospace", fontSize: 10, letterSpacing: 2, color: "#6ed430", marginBottom: 12, paddingTop: 24 }}>
        TOP {results.top30.length} MATCHES
      </div>
      <div style={{ overflowX: "auto", border: "1px solid #2a2a3e", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'Courier New',monospace" }}>
          <thead>
            <tr style={{ background: "#0d0d1a" }}>
              {COLS.map(c => (
                <TH key={c.col} label={c.label} col={c.col} sort={sort} onSort={onSort} />
              ))}
              <th style={{ padding: "8px 10px", borderBottom: "1px solid #2a2a3e", color: "#555", fontSize: 10, letterSpacing: 1 }}>LINKS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr
                key={s.UNITID}
                style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)", borderBottom: "1px solid #1a1a2e" }}
              >
                {COLS.map(c => (
                  <td key={c.col} style={{ padding: "7px 10px", color: c.col === "School_Name" ? "#f5f0e8" : "#aaa", whiteSpace: c.col === "School_Name" ? "normal" : "nowrap" }}>
                    {c.fmt(s[c.col === "_rank" ? "acadScore" : c.col], i)}
                  </td>
                ))}
                <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                  {s.q_link && <a href={s.q_link} target="_blank" rel="noreferrer" style={{ color: "#4fc3f7", marginRight: 8 }}>Q →</a>}
                  {s.coach_link && <a href={s.coach_link} target="_blank" rel="noreferrer" style={{ color: "#4fc3f7" }}>Staff →</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
