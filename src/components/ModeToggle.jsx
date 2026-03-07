export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="mode-toggle">
      {[
        { id: "browse",    label: "Browse Schools" },
        { id: "quicklist", label: "My GRIT Fit" },
      ].map(({ id, label }) => (
        <button
          key={id}
          className={`mode-btn${mode === id ? " active" : ""}`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
