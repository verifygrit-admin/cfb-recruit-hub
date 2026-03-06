import { POSITIONS } from "../lib/constants.js";

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
    { label: "Cumulative GPA",  key: "gpa", type: "number", ph: "3.10" },
    { label: "PSAT/SAT Score",  key: "sat", type: "number", ph: "1000" },
  ]},
  { title: "Location (High School)", fields: [
    { label: "State",       key: "state",  type: "text",   ph: "PA" },
    { label: "HS Latitude", key: "hsLat",  type: "number", ph: "40.198" },
    { label: "HS Longitude",key: "hsLng",  type: "number", ph: "-75.509" },
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
    <div className="form-wrapper">
      <h2 className="form-title">Student-Athlete Profile</h2>
      <p className="form-subtitle">Enter your data to generate a personalized map of matching NCAA programs.</p>

      {error && <div className="form-error">{error}</div>}

      {FORM_SECTIONS.map(sec => (
        <div key={sec.title} style={{ marginBottom: 28 }}>
          <div className="form-section-head">{sec.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {sec.fields.map(f => (
              <div key={f.key} className="form-field">
                <label>{f.label}</label>
                {f.type === "select"
                  ? <select value={athlete[f.key]} onChange={e => set(f.key, e.target.value)}>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  : <input type={f.type} value={athlete[f.key]} placeholder={f.ph}
                      onChange={e => set(f.key, e.target.value)} />
                }
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: 32 }}>
        <div className="form-section-head">Athletic Awards &amp; Boosts</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {AWARD_OPTIONS.map(a => (
            <label key={a.key} className="award-label" style={{ color: athlete.awards[a.key] ? "var(--accent)" : "var(--muted)" }}>
              <input type="checkbox" checked={athlete.awards[a.key]}
                onChange={e => onAwardChange(a.key, e.target.checked)} />
              {a.label}
            </label>
          ))}
        </div>
      </div>

      <button className="form-submit" onClick={onSubmit} disabled={loading}>
        {loading ? "Running GRIT FIT Formula…" : "Generate My Quick List →"}
      </button>
    </div>
  );
}
