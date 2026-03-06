import { useState, useEffect, useCallback, useMemo } from "react";
import ModeToggle from "./components/ModeToggle.jsx";
import MapView from "./components/MapView.jsx";
import QuickListForm from "./components/QuickListForm.jsx";
import ResultsTable from "./components/ResultsTable.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Tutorial from "./components/Tutorial.jsx";
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

const BLANK_FILTERS = {
  tiers: [], selectivity: [], conf: "ALL", states: [], adltvRank: "ALL", search: "",
};

export default function App() {
  const [mode, setMode]       = useState("browse");
  const [athlete, setAthlete] = useState(BLANK_ATHLETE);
  const [schools, setSchools] = useState([]);
  const [tracker, setTracker] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [dataLoaded, setDataLoaded]   = useState(false);
  const [dataError, setDataError]     = useState(null);
  const [panel, setPanel]     = useState("map");
  const [filters, setFilters] = useState(BLANK_FILTERS);
  const [showTutorial, setShowTutorial] = useState(false);
  const [drawerOpen, setDrawerOpen]     = useState(false);

  useEffect(() => {
    fetchSchools()
      .then(s => { setSchools(s); setDataLoaded(true); })
      .catch(e => setDataError(e.message));
    fetchTracker().then(setTracker).catch(() => {});
  }, []);

  // Compute visible count for sidebar
  const visibleCount = useMemo(() => {
    if (!schools.length || mode !== "browse") return 0;
    return schools.filter(school => {
      if (filters.tiers.length && !filters.tiers.includes(school.Type)) return false;
      if (filters.selectivity.length && !filters.selectivity.includes(school["School Type"])) return false;
      if (filters.conf !== "ALL" && school.Conference !== filters.conf) return false;
      if (filters.states.length && !filters.states.includes(school.State)) return false;
      if (filters.adltvRank !== "ALL") {
        const rank = parseInt(school["ADLTV Rank"]);
        if (!rank || rank > parseInt(filters.adltvRank)) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const name = (school["School Name"] || "").toLowerCase();
        const state = (school.State || "").toLowerCase();
        if (!name.includes(q) && !state.includes(q)) return false;
      }
      return true;
    }).length;
  }, [schools, filters, mode]);

  function handleFilterChange(key, val) {
    if (key === "reset") { setFilters(BLANK_FILTERS); return; }
    setFilters(f => ({ ...f, [key]: val }));
  }

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
      saveRecruit({ ...parsed, timestamp: new Date().toISOString() }).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const isBrowse = mode === "browse";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <header>
        {isBrowse && (
          <button id="drawerToggle" onClick={() => setDrawerOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        )}
        <div className="logo">Gritty<span>OS</span></div>
        <div className="header-divider" />
        <div className="header-title">CFB Recruit Hub</div>
        <div className="header-right">
          {mode === "quicklist" && results && (
            <div className="panel-toggle">
              {["map","table"].map(p => (
                <button key={p} className={`panel-btn${panel===p?" active":""}`} onClick={() => setPanel(p)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          )}
          <ModeToggle mode={mode} onChange={m => { setMode(m); if (m === "browse") setPanel("map"); }} />
          {isBrowse && (
            <button id="tutHelpBtn" onClick={() => setShowTutorial(true)} aria-label="Help">?</button>
          )}
        </div>
      </header>

      {dataError && <div className="data-error">Failed to load school data: {dataError}. Check VITE_API_BASE in .env</div>}

      {/* Body */}
      <div className="app-body">
        {/* Mobile drawer overlay */}
        {isBrowse && <div id="drawerOverlay" className={drawerOpen ? "visible" : ""} onClick={() => setDrawerOpen(false)} />}

        {/* Sidebar — browse mode only */}
        {isBrowse && dataLoaded && (
          <div className={`sidebar${drawerOpen ? " open" : ""}`}>
            <Sidebar
              schools={schools}
              filters={filters}
              onChange={handleFilterChange}
              visibleCount={visibleCount}
            />
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {isBrowse ? (
            <div style={{ flex: 1 }}>
              {dataLoaded
                ? <MapView schools={schools} results={null} mode="browse" filters={filters} />
                : <div className="loading-screen">Loading School Data…</div>}
            </div>
          ) : (
            results ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {panel === "map" ? (
                  <div style={{ flex: 1 }}>
                    <MapView schools={schools} results={results} mode="quicklist" filters={null} />
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    <ResultsTable results={results} />
                  </div>
                )}
                <div className="summary-bar">
                  <span className="stat">Matches: <strong>{results.top30.length}</strong></span>
                  {results.topTier && <span className="stat">Top Tier: <strong>{results.topTier}</strong></span>}
                  {results.recruitReach && <span className="stat">Reach: <strong>{results.recruitReach} mi</strong></span>}
                  <button
                    onClick={() => setResults(null)}
                    style={{ marginLeft: "auto", padding: "4px 12px", background: "transparent", border: "1px solid var(--border)", borderRadius: 3, color: "var(--muted)", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: 1 }}
                  >Edit Profile</button>
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

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
