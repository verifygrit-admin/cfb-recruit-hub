import { useState } from "react";
import { POSITIONS } from "../lib/constants.js";
import { updateRecruit, requestEmailChangeMagicLink } from "../lib/api.js";
import teamPhoto from "../assets/bchigh-team.jpg";

const PROFILE_SECTIONS = [
  { title: "Identity", fields: [
    { label: "Full Name",          key: "name",      type: "text",   ph: "Full Name", required: true },
    { label: "High School",        key: "highSchool", type: "text",  ph: "Anytown High School", required: true },
    { label: "State (HS)",         key: "state",     type: "text",   ph: "PA", required: true },
    { label: "Expected Grad Year", key: "gradYear",  type: "gradYear", required: true },
    { label: "Primary Phone",      key: "phone",     type: "tel",    ph: "(555) 555-5555", required: false },
    { label: "Twitter/X Handle",   key: "twitter",   type: "text",   ph: "@handle", required: false },
  ]},
  { title: "Athletics", fields: [
    { label: "Primary Position", key: "position", type: "select", options: POSITIONS, required: true },
    { label: "Height (inches)",  key: "height",   type: "number", ph: "72",   required: true },
    { label: "Weight (lbs)",     key: "weight",   type: "number", ph: "185",  required: true },
    { label: "40-Yard Time",     key: "speed40",  type: "number", ph: "4.60", required: true },
  ]},
  { title: "Academics", fields: [
    { label: "Cumulative GPA",  key: "gpa", type: "number", ph: "3.20", required: true },
    { label: "PSAT/SAT Score",  key: "sat", type: "number", ph: "Leave blank to default to 1000", required: false },
  ]},
  { title: "Family Financials (Optional)", fields: [
    { label: "Adjusted Gross Income", key: "agi",        type: "currency",   ph: "$85,000", required: false },
    { label: "# of Dependents",       key: "dependents", type: "dependents", required: false },
  ]},
];

const AWARD_OPTIONS = [
  { key: "expectedStarter", label: "Expected Starter" },
  { key: "captain",         label: "Team Captain" },
  { key: "allConference",   label: "All-Conference" },
  { key: "allState",        label: "All-State" },
];

export default function SettingsPage({ auth, athlete, onChange, onAwardChange, onBack, onSubmit }) {
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Email change state
  const [showEmailForm, setShowEmailForm]   = useState(false);
  const [newEmail, setNewEmail]             = useState("");
  const [emailSending, setEmailSending]     = useState(false);
  const [emailError, setEmailError]         = useState(null);
  const [emailSent, setEmailSent]           = useState(false);

  async function handleSaveProfile() {
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const r = await updateRecruit({
        ...athlete,
        email: auth.email,   // email is managed separately via Settings
        said: auth.said,
        timestamp: new Date().toISOString(),
      });
      if (r.error) { setSaveError(r.error); return; }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch(e) {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendEmailLink() {
    if (!newEmail.trim()) { setEmailError("Enter your new email address."); return; }
    if (newEmail.trim() === auth.email) { setEmailError("That is already your current email address."); return; }
    setEmailSending(true); setEmailError(null);
    try {
      const r = await requestEmailChangeMagicLink(auth.said, auth.sessionToken, newEmail.trim());
      if (r.error) { setEmailError(r.error); return; }
      setEmailSent(true);
    } catch(e) {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setEmailSending(false);
    }
  }

  function renderField(f) {
    const val = athlete[f.key] ?? "";
    if (f.type === "select") {
      return (
        <select value={val} onChange={e => onChange(f.key, e.target.value)}>
          <option value="" disabled>Select Primary Recruited Position</option>
          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === "gradYear") {
      return (
        <select value={val} onChange={e => onChange(f.key, e.target.value)}>
          <option value="" disabled>Select Graduation Year</option>
          {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      );
    }
    if (f.type === "dependents") {
      return (
        <select value={val} onChange={e => onChange(f.key, e.target.value)}>
          <option value="" disabled>Select</option>
          {["1","2","3","4","4+"].map(v => <option key={v} value={v}>{v === "4+" ? "More than 4" : v}</option>)}
        </select>
      );
    }
    if (f.type === "currency") {
      return (
        <input
          type="text" inputMode="numeric"
          value={val ? "$" + parseInt(String(val).replace(/[^0-9]/g, "") || "0").toLocaleString() : ""}
          placeholder={f.ph}
          onChange={e => onChange(f.key, e.target.value.replace(/[^0-9]/g, ""))}
        />
      );
    }
    return (
      <input type={f.type} value={val} placeholder={f.ph}
        onChange={e => onChange(f.key, e.target.value)} />
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-bg-img" style={{ backgroundImage: `url(${teamPhoto})` }} />
    <div className="form-wrapper">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, padding: 0 }}
        >
          ← Back
        </button>
      </div>
      <h2 className="form-title">Settings</h2>

      {/* ── Account Section ─────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div className="form-section-head">Account</div>
        <div style={{ background: "#0e1510", border: "1px solid #2a3d2d", borderRadius: 4, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Email Address</div>
              <div style={{ fontSize: 14, color: "#c8f5a0", fontFamily: "'Barlow', sans-serif" }}>{auth.email}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>SAID: {auth.said}</div>
            </div>
            {!showEmailForm && !emailSent && (
              <button
                onClick={() => { setShowEmailForm(true); setEmailError(null); setNewEmail(""); }}
                style={{ padding: "6px 14px", background: "#1a2e1d", border: "1px solid #6b8c72", borderRadius: 3, color: "#6b8c72", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Change Email
              </button>
            )}
          </div>

          {emailSent && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#0a1f0d", border: "1px solid #2e6b18", borderRadius: 3 }}>
              <div style={{ color: "#6ed430", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Confirmation link sent!</div>
              <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
                Check <strong style={{ color: "#c8f5a0" }}>{newEmail}</strong> for a confirmation link. Your email will update after you click it.
              </div>
              <button
                onClick={() => { setEmailSent(false); setShowEmailForm(false); setNewEmail(""); }}
                style={{ marginTop: 10, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, padding: 0, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5 }}
              >
                ← Cancel / use different address
              </button>
            </div>
          )}

          {showEmailForm && !emailSent && (
            <div style={{ marginTop: 14 }}>
              {emailError && <div className="auth-error" style={{ marginBottom: 8 }}>{emailError}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  onKeyDown={e => e.key === "Enter" && handleSendEmailLink()}
                  autoFocus
                  style={{ flex: 1, minWidth: 200, padding: "8px 10px", background: "#060a07", border: "1px solid #2a3d2d", borderRadius: 3, color: "#c8f5a0", fontFamily: "'Barlow', sans-serif", fontSize: 13 }}
                />
                <button
                  onClick={handleSendEmailLink}
                  disabled={emailSending}
                  style={{ padding: "8px 16px", background: "#2e6b18", border: "1px solid #6ed430", borderRadius: 3, color: "#c8f5a0", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {emailSending ? "Sending…" : "Send Confirmation Link →"}
                </button>
              </div>
              <button
                onClick={() => { setShowEmailForm(false); setEmailError(null); setNewEmail(""); }}
                style={{ marginTop: 8, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, padding: 0, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5 }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Profile Sections ─────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div className="form-section-head" style={{ marginBottom: 4 }}>Profile</div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px", fontFamily: "'Barlow', sans-serif", lineHeight: 1.5 }}>
          Update your athletic and academic data below, then click <strong style={{ color: "#c8f5a0" }}>Save &amp; Re-Run GRIT Fit</strong> to save and instantly update your results.
        </p>
      </div>

      {PROFILE_SECTIONS.map(sec => (
        <div key={sec.title} style={{ marginBottom: 28 }}>
          <div className="form-section-head">{sec.title}</div>
          <div className="form-grid">
            {sec.fields.map(f => (
              <div key={f.key} className="form-field">
                <label>
                  {f.label}{f.required && <span style={{ color: "#ef5350", marginLeft: 1 }}>*</span>}
                </label>
                {renderField(f)}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: 32 }}>
        <div className="form-section-head">Athletic Awards &amp; Boosts</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {AWARD_OPTIONS.map(a => (
            <label key={a.key} className="award-label" style={{ color: athlete.awards?.[a.key] ? "var(--accent)" : "var(--muted)" }}>
              <input type="checkbox" checked={!!athlete.awards?.[a.key]}
                onChange={e => onAwardChange(a.key, e.target.checked)} />
              {a.label}
            </label>
          ))}
        </div>
      </div>

      {saveError && <div className="form-error" style={{ marginBottom: 12 }}>{saveError}</div>}
      {saveSuccess && (
        <div style={{ marginBottom: 12, padding: "10px 14px", background: "#0a1f0d", border: "1px solid #2e6b18", borderRadius: 3, color: "#6ed430", fontSize: 13, fontWeight: 700 }}>
          Profile saved successfully.
        </div>
      )}

      <button className="form-submit" onClick={onSubmit || handleSaveProfile} disabled={saving}>
        {saving ? "Saving…" : "Save & Re-Run GRIT Fit →"}
      </button>
    </div>
    </div>
  );
}
