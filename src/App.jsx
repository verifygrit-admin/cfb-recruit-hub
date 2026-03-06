import { useState, useEffect, useCallback } from "react";
import ModeToggle from "./components/ModeToggle.jsx";
import MapView from "./components/MapView.jsx";
import QuickListForm from "./components/QuickListForm.jsx";
import ResultsTable from "./components/ResultsTable.jsx";
import { fetchSchools, fetchTracker, saveRecruit } from "./lib/api.js";
import { runQuickList } from "./lib/scoring.js";

const BLANK_ATHLETE = {
  name: "", highSchool: "", gradYear: "",
  position: "WR", height: "", weight: "", speed40: "",
  gpa: "", sat: "",
  state: "", hsLat: "", hsLng: "",
  agi: "", dependents: "",
  awards: { expectedStarter: false, captain: false, allConference: false, allState: false },
};

export default function App() {
  const [mode, setMode]         = useState("browse");
  const [athlete, setAthlete]   = useState(BLANK_ATHLETE);
  const [schools, setSchools]   = useState([]);
  const [tracker, setTracker]   = useState({});
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataError, setDataError]   = useState(null);
  const [panel, setPanel]       = useState("map"); // "map" | "table"

  // Load school data once
  useEffect(() => {
    fetchSchools()
      .then(s => { setSchools(s); setDataLoaded(true); })
      .catch(e => setDataError(e.message));
    fetchTracker()
      .then(setTracker)
      .catch(() => {}); // tracker is optional
  }, []);

  const handleChange = useCallback((key, val) => {
    setAthlete(a => ({ ...a, [key]: val }));
  }, []);

  const handleAwardChange = useCallback((key, val) => {
    setAthlete(a => ({ ...a, awards: { ...a.awards, [key]: val } }));
  }, []);

  async function handleSubmit() {
    setError(null);
    const { hsLat, hsLng, position, height, weight, speed40 } = athlete;
    if (!hsLat || !hsLng) { setError("HS Latitude and Longitude are required."); return; }
    if (!position || !height || !weight || !speed40) { setError("Position, Height, Weight, and 40-Yard Time are required."); return; }

    setLoading(true);
    try {
      const parsed = {
        ...athlete,
        height: +athlete.height, weight: +athlete.weight, speed40: +athlete.speed40,
        gpa: athlete.gpa ? +athlete.gpa : null,
        sat: athlete.sat ? +athlete.sat : null,
        hsLat: +athlete.hsLat, hsLng: +athlete.hsLng,
        agi: athlete.agi ? +athlete.agi : null,
        dependents: athlete.dependents ? +athlete.dependents : null,
      };
      const res = runQuickList(parsed, schools, tracker);
      setResults(res);
      setMode("quicklist");
      setPanel("map");

      // Save to Google Sheet (best-effort)
      saveRecruit({ ...parsed, timestamp: new Date().toISOString() }).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", background: "#0d0d1a", borderBottom: "1px solid #2a2a3e",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'Courier New',monospace", fontSize: 13, color: "#6ed430", fontWeight: "bold", letterSpacing: 1 }}>
            GRIT FIT
          </span>
          <span style={{ fontFamily: "'Courier New',monospace", fontSize: 9, color: "#444", letterSpacing: 2 }}>
            CFB RECRUIT HUB
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {mode === "quicklist" && results && (
            <div style={{ display: "flex", background: "#0a0a14", border: "1px solid #2a2a3e", borderRadius: 6, padding: 3, gap: 2 }}>
              {["map", "table"].map(p => (
                <button key={p} onClick={() => setPanel(p)} style={{
                  padding: "5px 12px", background: panel === p ? "#1e1e2e" : "transparent",
                  border: "none", borderRadius: 4, color: panel === p ? "#e8e4dc" : "#555",
                  fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: 1,
                }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <ModeToggle mode={mode} onChange={m => { setMode(m); if (m === "browse") setPanel("map"); }} />
        </div>
      </div>

      {dataError && (
        <div style={{ padding: "12px 20px", background: "#2a0a0a", color: "#ff6b6b", fontFamily: "'Courier New',monospace", fontSize: 11 }}>
          Failed to load school data: {dataError}. Check VITE_API_BASE in your .env file.
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {mode === "browse" ? (
          <div style={{ flex: 1 }}>
            {dataLoaded
              ? <MapView schools={schools} results={null} mode="browse" />
              : <LoadingScreen />}
          </div>
        ) : (
          results ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {panel === "map" ? (
                <div style={{ flex: 1 }}>
                  <MapView schools={schools} results={results} mode="quicklist" />
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <ResultsTable results={results} />
                </div>
              )}
              {/* Summary bar */}
              <div style={{
                flexShrink: 0, padding: "8px 20px", background: "#0d0d1a", borderTop: "1px solid #2a2a3e",
                display: "flex", alignItems: "center", gap: 24, fontFamily: "'Courier New',monospace", fontSize: 10,
              }}>
                <span style={{ color: "#6ed430" }}>{results.top30.length} MATCHES FOUND</span>
                {results.topTier && <span style={{ color: "#888" }}>TOP TIER: {results.topTier}</span>}
                {results.recruitReach && <span style={{ color: "#888" }}>REACH: {results.recruitReach} MI</span>}
                <button
                  onClick={() => setResults(null)}
                  style={{ marginLeft: "auto", padding: "4px 12px", background: "transparent", border: "1px solid #2a2a3e", borderRadius: 4, color: "#555", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: 1 }}
                >
                  EDIT PROFILE
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <QuickListForm
                athlete={athlete}
                onChange={handleChange}
                onAwardChange={handleAwardChange}
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Courier New',monospace", fontSize: 11, color: "#555", letterSpacing: 2 }}>
      LOADING SCHOOL DATA...
    </div>
  );
}
