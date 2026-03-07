import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CRM_COLS = [
  { key: "crm_contacted", label: "Contacted" },
  { key: "crm_applied",   label: "Applied"   },
  { key: "crm_offer",     label: "Offer"     },
  { key: "crm_committed", label: "Committed" },
];

const TIER_COLORS = { top: "#6ed430", good: "#f5a623", borderline: "#ef5350" };

// ── Money Map ────────────────────────────────────────────────────────────────
function MoneyMap({ shortList }) {
  const panels = [
    {
      id: "cost",
      title: "Lowest Net Cost",
      sub: "4-year projected cost",
      items: [...shortList]
        .filter(s => s.netCost != null && s.netCost > 0)
        .sort((a, b) => a.netCost - b.netCost)
        .slice(0, 8),
      key: "netCost",
      fmt: v => "$" + Math.round(v / 1000) + "K",
      color: "#6ed430",
      inverted: true,
    },
    {
      id: "adltv",
      title: "Highest ADLTV",
      sub: "Adjusted degree lifetime value",
      items: [...shortList]
        .filter(s => s.adltv != null && s.adltv > 0)
        .sort((a, b) => b.adltv - a.adltv)
        .slice(0, 8),
      key: "adltv",
      fmt: v => "$" + Math.round(v / 1000) + "K",
      color: "#4fc3f7",
      inverted: false,
    },
    {
      id: "payback",
      title: "Fastest Payback",
      sub: "Years to break even",
      items: [...shortList]
        .filter(s => s.breakEven != null && s.breakEven > 0 && s.breakEven < 200)
        .sort((a, b) => a.breakEven - b.breakEven)
        .slice(0, 8),
      key: "breakEven",
      fmt: v => v.toFixed(1) + " yr",
      color: "#f5a623",
      inverted: true,
    },
    {
      id: "roi",
      title: "Best ROI",
      sub: "Degree return on investment",
      items: [...shortList]
        .filter(s => s.droi != null && s.droi > 0)
        .sort((a, b) => b.droi - a.droi)
        .slice(0, 8),
      key: "droi",
      fmt: v => v.toFixed(1) + "x",
      color: "#ce93d8",
      inverted: false,
    },
  ];

  return (
    <div className="money-map">
      <div className="money-map-grid">
        {panels.map(panel => {
          if (!panel.items.length) {
            return (
              <div key={panel.id} className="money-map-panel">
                <div className="money-map-panel-title" style={{ color: panel.color }}>{panel.title}</div>
                <div className="money-map-panel-sub">{panel.sub}</div>
                <div style={{ color: "#2a3a2e", fontSize: 11, fontFamily: "'Barlow',sans-serif", paddingTop: 8 }}>
                  Add schools with financial data to see this chart.
                </div>
              </div>
            );
          }
          const values = panel.items.map(s => s[panel.key]);
          const maxVal = Math.max(...values);
          const minVal = Math.min(...values);
          const range  = maxVal - minVal || 1;
          return (
            <div key={panel.id} className="money-map-panel">
              <div className="money-map-panel-title" style={{ color: panel.color }}>{panel.title}</div>
              <div className="money-map-panel-sub">{panel.sub}</div>
              {panel.items.map(s => {
                const v = s[panel.key];
                const pct = panel.inverted
                  ? ((maxVal - v) / range) * 100
                  : ((v - minVal) / range) * 100;
                return (
                  <div key={s.UNITID} className="money-map-bar-row">
                    <div className="money-map-bar-label">{(s._schoolName || "").slice(0, 18)}</div>
                    <div className="money-map-bar-track">
                      <div className="money-map-bar-fill" style={{ width: Math.max(pct, 5) + "%", background: panel.color }} />
                    </div>
                    <div className="money-map-bar-val" style={{ color: panel.color }}>{panel.fmt(v)}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sortable Row ──────────────────────────────────────────────────────────────
function SortableRow({ school, onRemove, onCRMChange, isActive }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: school.UNITID });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isActive ? 0.4 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="sl-row">
      <td className="sl-drag-cell" {...attributes} {...listeners} title="Drag to reorder">
        <span className="sl-drag-handle">⠿</span>
      </td>
      <td style={{ color: "#e8edf0", fontWeight: 500, whiteSpace: "normal", minWidth: 140 }}>{school._schoolName}</td>
      <td style={{ color: "#6b8c72", whiteSpace: "nowrap" }}>{school._divLabel}</td>
      <td style={{ color: "#6b8c72", whiteSpace: "nowrap" }}>{school.Conference}</td>
      <td style={{ color: "#6b8c72", whiteSpace: "nowrap" }}>{school.State}</td>
      <td style={{ color: school.matchTier ? TIER_COLORS[school.matchTier] : "#6b8c72", fontWeight: 700, whiteSpace: "nowrap" }}>
        {school.matchRank ? `#${school.matchRank}` : "—"}
      </td>
      <td style={{ color: "#6b8c72", whiteSpace: "nowrap" }}>
        {school._coaNum ? "$" + Math.round(school._coaNum).toLocaleString() : "—"}
      </td>
      <td style={{ color: "#6b8c72", whiteSpace: "nowrap" }}>
        {school.netCost != null ? "$" + Math.round(school.netCost).toLocaleString() : "—"}
      </td>
      <td style={{ color: "#4fc3f7", whiteSpace: "nowrap" }}>
        {school.adltv ? "$" + Math.round(school.adltv).toLocaleString() : "—"}
      </td>
      <td style={{ color: "#6b8c72", whiteSpace: "nowrap" }}>
        {school.droi != null ? school.droi.toFixed(1) + "x" : "—"}
      </td>
      {CRM_COLS.map(col => (
        <td key={col.key} className="sl-crm-cell">
          <input
            type="checkbox"
            className="sl-crm-check"
            checked={!!school[col.key]}
            onChange={e => onCRMChange(school.UNITID, col.key, e.target.checked)}
          />
        </td>
      ))}
      <td style={{ padding: "4px 8px" }}>
        <button className="sl-remove-btn" onClick={() => onRemove(school.UNITID)} title="Remove from Short List">✕</button>
      </td>
      <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>
        {school._qLink
          ? <a href={school._qLink} target="_blank" rel="noreferrer" className="table-link">Q →</a>
          : <span style={{ color: "#2a3a2e" }}>—</span>}
      </td>
      <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>
        {school._coachLink
          ? <a href={school._coachLink} target="_blank" rel="noreferrer" className="table-link">Staff →</a>
          : <span style={{ color: "#2a3a2e" }}>—</span>}
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ShortList({ shortList, onReorder, onRemove, onCRMChange, said, onGoToGritFit }) {
  const [activeId, setActiveId]         = useState(null);
  const [showMoneyMap, setShowMoneyMap] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  if (!said) {
    return (
      <div className="sl-gate">
        <div className="sl-gate-icon">🏈</div>
        <div className="sl-gate-title">Create Your GRIT Fit Profile First</div>
        <div className="sl-gate-body">
          My Short List is personalized to your athletic profile. Complete your GRIT Fit to unlock this feature.
        </div>
        <button className="sl-gate-btn" onClick={onGoToGritFit}>Go to My GRIT Fit →</button>
      </div>
    );
  }

  if (!shortList.length) {
    return (
      <div className="sl-gate">
        <div className="sl-gate-icon">📋</div>
        <div className="sl-gate-title">Your Short List is Empty</div>
        <div className="sl-gate-body">
          Add schools from your GRIT Fit results using the <strong style={{ color: "#6ed430" }}>+</strong> button in the table or map popups.
        </div>
        <button className="sl-gate-btn" onClick={onGoToGritFit}>View My GRIT Fit Results →</button>
      </div>
    );
  }

  function handleDragStart(e) { setActiveId(e.active.id); }
  function handleDragEnd(e) {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = shortList.findIndex(s => s.UNITID === active.id);
    const newIdx = shortList.findIndex(s => s.UNITID === over.id);
    onReorder(arrayMove(shortList, oldIdx, newIdx));
  }

  const ids = shortList.map(s => s.UNITID);

  return (
    <div className="sl-container">
      <div className="sl-header">
        <div className="sl-title">My Short List</div>
        <div className="sl-subtitle">{shortList.length} / 40 schools</div>
      </div>

      {/* Money Map toggle */}
      <div className="sl-section-toggle" onClick={() => setShowMoneyMap(v => !v)}>
        <span>Short List Money Map</span>
        <span>{showMoneyMap ? "▲" : "▼"}</span>
      </div>
      {showMoneyMap && <MoneyMap shortList={shortList} />}

      {/* Sortable table */}
      <div className="sl-table-wrap">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <table className="sl-table">
            <thead>
              <tr>
                <th className="sl-th" style={{ width: 28 }}></th>
                <th className="sl-th">School</th>
                <th className="sl-th">Div</th>
                <th className="sl-th">Conf</th>
                <th className="sl-th">State</th>
                <th className="sl-th">Rank</th>
                <th className="sl-th">COA</th>
                <th className="sl-th">Net Cost</th>
                <th className="sl-th">ADLTV</th>
                <th className="sl-th">DROI</th>
                {CRM_COLS.map(c => (
                  <th key={c.key} className="sl-th sl-crm-th">{c.label}</th>
                ))}
                <th className="sl-th" style={{ width: 32 }}></th>
                <th className="sl-th">Recruit Q</th>
                <th className="sl-th">Staff</th>
              </tr>
            </thead>
            <tbody>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {shortList.map(school => (
                  <SortableRow
                    key={school.UNITID}
                    school={school}
                    onRemove={onRemove}
                    onCRMChange={onCRMChange}
                    isActive={activeId === school.UNITID}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>

      <div className="app-footer" style={{ marginTop: 24, border: "none", background: "transparent" }}>
        Support: <a href="mailto:verifygrit@gmail.com">verifygrit@gmail.com</a>
      </div>
    </div>
  );
}
