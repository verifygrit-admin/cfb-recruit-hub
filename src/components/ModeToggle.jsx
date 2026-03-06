export default function ModeToggle({ mode, onChange }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      background: "#0d0d1a", border: "1px solid #2a2a3e", borderRadius: 6, padding: 3,
    }}>
      {[
        { id: "browse", label: "BROWSE MAP" },
        { id: "quicklist", label: "MY QUICK LIST" },
      ].map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            padding: "6px 16px",
            background: mode === id ? "#6ed430" : "transparent",
            border: "none",
            borderRadius: 4,
            color: mode === id ? "#0a0a14" : "#555",
            cursor: "pointer",
            fontFamily: "'Courier New', monospace",
            fontSize: 10,
            letterSpacing: 1.5,
            fontWeight: mode === id ? "bold" : "normal",
            transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
