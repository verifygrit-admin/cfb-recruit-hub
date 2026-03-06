import { POSITIONS } from "../lib/constants.js";

const S = {
  label: { fontFamily: "'Courier New',monospace", fontSize: 10, color: "#666", letterSpacing: 1, display: "block", marginBottom: 5 },
  input: { width: "100%", padding: "8px 10px", background: "#161625", border: "1px solid #2a2a3e", color: "#e8e4dc", borderRadius: 4, fontFamily: "'Courier New',monospace", fontSize: 12, boxSizing: "border-box" },
  sectionHead: { fontFamily: "'Courier New',monospace", fontSize: 10, letterSpacing: 2, color: "#6ed430", marginBottom: 12, borderBottom: "1px solid #1e1e2e", paddingBottom: 8 },
};

const FORM_SECTIONS = [
  { title: "Identity", fields: [
    { label: "Full Name",   key: "name",      type: "text",   ph: "Eric Green" },
    { label: "High School", key: "highSchool", type: "text",   ph: "Pope John Paul II" },
    { label: "Grad Year",   key: "gradYear",   type: "number", ph: "2027" },
  ]},
  { title: "Athletics", fields: [
    { label: "Primary Position", key: "position", type: "select", options: POSITIONS },
    { label: "Height (inches)",  key: "height",   type: "number", ph: "74" },
    { label: "Weight (lbs)",     key: "weight",   type: "number", ph: "170" },
    { label: "40-Yard Time",     key: "speed40",  type: "number", ph: "4.50" },
  ]},
  { title: "Academics", fields: [
    { label: "Cumulative GPA",   key: "gpa", type: "number", ph: "3.10" },
    { label: "PSAT/SAT Score",   key: "sat", type: "number", ph: "1000" },
  ]},
  { title: "Location (High School)", fields: [
    { label: "State",          key: "state",  type: "text",   ph: "PA" },
    { label: "HS Latitude",    key: "hsLat",  type: "number", ph: "40.198" },
    { label: "HS Longitude",   key: "hsLng",  type: "number", ph: "-75.509" },
  ]},
  { title: "Family Financials (Optional)", fields: [
    { label: "Adjusted Gross Income", key: "agi",        type: "number", ph: "85000" },
    { label: "# of Dependents",       key: "dependents", type: "number", ph: "3" },
  ]},
];

const AWARD_OPTIONS = [
  { key: "expectedStarter", label: "Expected Starter" },
  { key: "captain",         label: "Team Captain" },
  { key: "allConference",   label: "All-Conference" },
  { key: "allState",        label: "All-State" },
];

export default function QuickListForm({ athlete, onChange, onAwardChange, onSubmit, loading, error }) {
  const set = (key, val) => onChange(key, val);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 22, fontWeight: "normal", margin: "0 0 6px", color: "#f5f0e8", letterSpacing: -0.5 }}>
        Student-Athlete Profile
      </h2>
      <p style={{ fontFamily: "'Courier New',monospace", fontSize: 11, color: "#555", letterSpacing: 1, margin: "0 0 28px" }}>
        Enter your data to generate a personalized map of matching NCAA programs.
      </p>

      {error && (
        <div style={{ padding: "12px 16px", background: "#2a0a0a", border: "1px solid #ff4444", borderRadius: 6, color: "#ff6b6b", fontSize: 12, marginBottom: 24, fontFamily: "'Courier New',monospace" }}>
          {error}
        </div>
      )}

      {FORM_SECTIONS.map(sec => (
        <div key={sec.title} style={{ marginBottom: 28 }}>
          <div style={S.sectionHead}>{sec.title.toUpperCase()}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {sec.fields.map(f => (
              <div key={f.key}>
                <label style={S.label}>{f.label.toUpperCase()}</label>
                {f.type === "select"
                  ? <select value={athlete[f.key]} onChange={e => set(f.key, e.target.value)} style={S.input}>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  : <input type={f.type} value={athlete[f.key]} placeholder={f.ph}
                      onChange={e => set(f.key, e.target.value)} style={S.input} />
                }
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: 32 }}>
        <div style={S.sectionHead}>ATHLETIC AWARDS & BOOSTS</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {AWARD_OPTIONS.map(a => (
            <label key={a.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'Courier New',monospace", fontSize: 11, color: athlete.awards[a.key] ? "#6ed430" : "#555" }}>
              <input type="checkbox" checked={athlete.awards[a.key]}
                onChange={e => onAwardChange(a.key, e.target.checked)}
                style={{ accentColor: "#6ed430" }} />
              {a.label}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={loading}
        style={{ padding: "13px 36px", background: loading ? "#333" : "#6ed430", border: "none", borderRadius: 6, color: loading ? "#666" : "#0a0a14", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Courier New',monospace", fontSize: 12, letterSpacing: 2, fontWeight: "bold" }}
      >
        {loading ? "RUNNING GRIT FIT FORMULA..." : "GENERATE MY QUICK LIST →"}
      </button>
    </div>
  );
}
