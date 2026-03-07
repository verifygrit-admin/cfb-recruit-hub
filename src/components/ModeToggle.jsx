const MODES = [
  { id: "browse",    label: "Browse Schools" },
  { id: "quicklist", label: "My GRIT Fit"    },
  { id: "shortlist", label: "My Short List"  },
];

export default function ModeToggle({ mode, onChange }) {
  return (
    <>
      {/* Desktop: pill button group */}
      <div className="mode-toggle mode-toggle--btns">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            className={`mode-btn${mode === id ? " active" : ""}`}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mobile: native select */}
      <select
        className="mode-toggle--select"
        value={mode}
        onChange={e => onChange(e.target.value)}
        aria-label="Navigation"
      >
        {MODES.map(({ id, label }) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
    </>
  );
}
