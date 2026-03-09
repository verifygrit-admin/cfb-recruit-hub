import { useState } from "react";
import { POSITIONS } from "../lib/constants.js";

const FORM_SECTIONS = [
  { title: "Identity", fields: [
    { label: "Full Name",              key: "name",      type: "text",  ph: "Full Name", required: true },
    { label: "High School",            key: "highSchool",type: "text",  ph: "Anytown High School", required: true,
      info: "Enter the full official name of your high school exactly as it appears — including words like 'High School', 'Academy', or 'Prep'. An accurate name ensures your recruiting reach distance is calculated from your actual location rather than a state estimate." },
    { label: "State (HS)",             key: "state",     type: "text",  ph: "PA", required: true },
    { label: "Expected Grad Year",     key: "gradYear",  type: "gradYear", required: true },
    { label: "Student-Athlete Email",  key: "email",     type: "email", ph: "athlete@email.com", required: true },
    { label: "Primary Phone",          key: "phone",     type: "tel",   ph: "(555) 555-5555", required: false },
    { label: "Twitter/X Handle",       key: "twitter",   type: "text",  ph: "@handle", required: false },
  ]},
  { title: "Athletics", fields: [
    { label: "Primary Position", key: "position", type: "select", options: POSITIONS, required: true },
    { label: "Height (inches)",  key: "height",   type: "number", ph: "72",   required: true },
    { label: "Weight (lbs)",     key: "weight",   type: "number", ph: "185",  required: true },
    { label: "40-Yard Time",     key: "speed40",  type: "number", ph: "4.60", required: true },
  ]},
  { title: "Academics", fields: [
    { label: "Cumulative GPA",  key: "gpa", type: "number", ph: "3.20", required: true },
    { label: "PSAT/SAT Score",  key: "sat", type: "number", ph: "If you have not taken PSAT or SAT, leave blank to default to a score of 1000", required: false,
      info: "If left blank, your score will default to 1000 for matching purposes. Our model currently evaluates PSAT/SAT scores only and does not yet factor in ACT scores. ACT scoring will be added in a future update." },
  ]},
  { title: "Family Financials (Optional)", fields: [
    { label: "Adjusted Gross Income", key: "agi",        type: "currency",   ph: "$85,000", required: false },
    { label: "# of Dependents",       key: "dependents", type: "dependents", required: false,
      info: "Colleges and the U.S. Department of Education use household size (number of dependents) together with Adjusted Gross Income to determine financial aid eligibility and estimate the amount of aid a student's household qualifies for from different types of institutions." },
  ]},
];

const AWARD_OPTIONS = [
  { key: "expectedStarter", label: "Expected Starter" },
  { key: "captain",         label: "Team Captain" },
  { key: "allConference",   label: "All-Conference" },
  { key: "allState",        label: "All-State" },
];

export default function QuickListForm({ athlete, onChange, onAwardChange, onSubmit, onNewProfile, loading, error, geocoding, hasSaid, auth, onSignIn }) {
  const set = (key, val) => onChange(key, val);
  const [activeInfo, setActiveInfo] = useState(null);

  return (
    <div className="form-wrapper">
      <h2 className="form-title">Student-Athlete Profile</h2>
      <p className="form-subtitle">Enter your data to generate a personalized map of matching NCAA programs. Distance is estimated from your high school — enter your full high school name to ensure the most accurate recruiting reach results.</p>

      {!auth && hasSaid && (
        <div className="signin-restore-banner">
          Have a GrittyOS account?{" "}
          <button onClick={onSignIn}>Sign in to restore your session →</button>
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {FORM_SECTIONS.map(sec => (
        <div key={sec.title} style={{ marginBottom: 28 }}>
          <div className="form-section-head">{sec.title}</div>
          <div className="form-grid">
            {sec.fields.map(f => (
              <div key={f.key} className="form-field" style={f.key === "sat" ? { gridColumn: "1 / span 2" } : {}}>
                <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {f.label}{f.required && <span style={{ color: "#ef5350", marginLeft: 1 }}>*</span>}
                  {f.info && (
                    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                      <button
                        className="th-info-icon"
                        onMouseEnter={() => setActiveInfo(f.key)}
                        onMouseLeave={() => setActiveInfo(null)}
                        onClick={e => { e.preventDefault(); setActiveInfo(activeInfo === f.key ? null : f.key); }}
                        aria-label={`About ${f.label}`}
                      >ⓘ</button>
                      {activeInfo === f.key && (
                        <span className="form-field-tooltip">{f.info}</span>
                      )}
                    </span>
                  )}
                </label>
                {f.type === "select"
                  ? <select value={athlete[f.key]} onChange={e => set(f.key, e.target.value)}>
                      <option value="" disabled>Select Primary Recruited Position</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  : f.type === "gradYear"
                  ? <select value={athlete[f.key]} onChange={e => set(f.key, e.target.value)}>
                      <option value="" disabled>Select Graduation Year</option>
                      {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  : f.type === "dependents"
                  ? <select value={athlete[f.key]} onChange={e => set(f.key, e.target.value)}>
                      <option value="" disabled>Select</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="4+">More than 4</option>
                    </select>
                  : f.type === "currency"
                  ? <input
                      type="text"
                      inputMode="numeric"
                      value={athlete[f.key] ? "$" + parseInt(String(athlete[f.key]).replace(/[^0-9]/g, "") || "0").toLocaleString() : ""}
                      placeholder={f.ph}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        set(f.key, raw);
                      }}
                    />
                  : <input type={f.type} value={athlete[f.key]} placeholder={f.ph}
                      onChange={e => set(f.key, e.target.value)} />
                }
              </div>
            ))}
          </div>
          {sec.title === "Identity" && (
            <div className="geo-status">
              {geocoding
                ? <span className="geo-locating">Locating school…</span>
                : athlete.geoLabel
                  ? <span className="geo-found">Located: {athlete.geoLabel.split(",").slice(0, 3).join(",")}</span>
                  : athlete.highSchool && athlete.state
                    ? <span className="geo-miss">Location not found — distance will use state center</span>
                    : null
              }
            </div>
          )}
        </div>
      ))}

      <div style={{ marginBottom: 32 }}>
        <div className="form-section-head" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Athletic Awards &amp; Boosts
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <button
              className="th-info-icon"
              onMouseEnter={() => setActiveInfo("awardsBoosts")}
              onMouseLeave={() => setActiveInfo(null)}
              onClick={e => { e.preventDefault(); setActiveInfo(activeInfo === "awardsBoosts" ? null : "awardsBoosts"); }}
              aria-label="About Athletic Awards & Boosts"
            >ⓘ</button>
            {activeInfo === "awardsBoosts" && (
              <span className="form-field-tooltip">
                Check any boxes for awards, recognition, or outcomes you have <strong>previously achieved</strong> as post-season honors — not results you expect to achieve or have been selected to achieve in pre-season. The only exception is <strong>Expected Starter</strong>, which represents an anticipated role and is applied as a projected boost.
              </span>
            )}
          </span>
        </div>
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

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="form-submit" onClick={() => onSubmit(false)} disabled={loading} style={{ flex: 1 }}>
          {loading ? "Running GRIT FIT Formula…" : hasSaid ? "Update My GRIT Fit →" : "Generate My GRIT Fit →"}
        </button>
        {hasSaid && (
          <button
            className="form-submit"
            onClick={onNewProfile}
            disabled={loading}
            style={{ flex: "0 0 auto", background: "#1a2e1d", borderColor: "#6b8c72", color: "#6b8c72" }}
          >
            Submit New Profile
          </button>
        )}
      </div>
    </div>
  );
}
