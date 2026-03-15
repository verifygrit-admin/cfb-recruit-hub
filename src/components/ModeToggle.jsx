import { useState, useRef, useEffect } from "react";

const MODES = [
  { id: "browse",    label: "Home" },
  { id: "quicklist", label: "My GRIT Fit" },
  { id: "shortlist", label: "My Short List" },
  { id: "settings",  label: "Settings" },
];

export default function ModeToggle({ mode, onChange, auth }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click / focus loss
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const current = MODES.find(m => m.id === mode) || MODES[0];

  function select(id) {
    setOpen(false);
    onChange(id);
  }

  return (
    <div className="nav-dropdown" ref={ref}>
      <button
        className="nav-dropdown-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {current.label}
        <svg width="10" height="6" viewBox="0 0 10 6" style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M0 0l5 6 5-6z" fill="#6ed430" />
        </svg>
      </button>
      {open && (
        <div className="nav-dropdown-menu">
          {MODES.filter(m => m.id !== "settings").map(({ id, label }) => (
            <button
              key={id}
              className={`nav-dropdown-item${mode === id ? " active" : ""}`}
              onClick={() => select(id)}
            >
              {label}
            </button>
          ))}
          <div className="nav-dropdown-divider" />
          {auth && (
            <button className="nav-dropdown-item" onClick={() => select("__settings")}>Settings</button>
          )}
          {auth
            ? <button className="nav-dropdown-item nav-dropdown-item--signout" onClick={() => select("__logout")}>Sign Out</button>
            : <button className="nav-dropdown-item nav-dropdown-item--signin" onClick={() => select("__signin")}>Sign In</button>
          }
        </div>
      )}
    </div>
  );
}
