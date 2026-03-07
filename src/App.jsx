import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ModeToggle from "./components/ModeToggle.jsx";
import MapView from "./components/MapView.jsx";
import QuickListForm from "./components/QuickListForm.jsx";
import ResultsTable from "./components/ResultsTable.jsx";
import ShortList from "./components/ShortList.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Tutorial from "./components/Tutorial.jsx";
import HelmetAnim from "./components/HelmetAnim.jsx";
import StayGrittyModal from "./components/StayGrittyModal.jsx";
import { fetchSchools, fetchTracker, saveRecruit, updateRecruit, geocodeHighSchool, saveShortList } from "./lib/api.js";
import { runQuickList, getClassLabel } from "./lib/scoring.js";

const BLANK_ATHLETE = {
  name: "", highSchool: "", gradYear: "", email: "", phone: "", twitter: "",
  position: "", height: "", weight: "", speed40: "",
  gpa: "", sat: "",
  state: "",
  hsLat: null, hsLng: null, geoLabel: null,
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
  const [showTutorial, setShowTutorial]   = useState(false);
  const [tutorialType, setTutorialType]   = useState("browse");
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [geocoding, setGeocoding]         = useState(false);
  const [showBrowseAnim, setShowBrowseAnim] = useState(false);
  const [showQLAnim, setShowQLAnim]         = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [said, setSaid]                     = useState(null);   // SAID of last saved profile
  const [savedIdentity, setSavedIdentity]   = useState(null);   // { name, email } at save time
  const [stayGrittyData, setStayGrittyData] = useState(null);   // results when topTier === null
  const [shortList, setShortList]           = useState([]);     // My Short List schools
  const browseAnimShown = useRef(false);
  const qlAnimShown     = useRef(false);

  useEffect(() => {
    fetchSchools()
      .then(s => { setSchools(s); setDataLoaded(true); })
      .catch(e => setDataError(e.message));
    fetchTracker().then(setTracker).catch(() => {});
    // Restore SAID + short list from localStorage on mount
    const savedSaid = localStorage.getItem("cfb_said");
    if (savedSaid) {
      setSaid(savedSaid);
      try {
        const sl = localStorage.getItem(`cfb_sl_${savedSaid}`);
        if (sl) setShortList(JSON.parse(sl));
      } catch {}
    }
    // Show browse helmet animation on first load
    if (!browseAnimShown.current) {
      browseAnimShown.current = true;
      setShowBrowseAnim(true);
    }
  }, []);

  // Show QL helmet animation when results first appear
  useEffect(() => {
    if (results && !qlAnimShown.current) {
      qlAnimShown.current = true;
      setShowQLAnim(true);
    }
  }, [results]);

  // Persist SAID + short list to localStorage; debounce Sheet sync
  useEffect(() => {
    if (!said) return;
    localStorage.setItem("cfb_said", said);
    localStorage.setItem(`cfb_sl_${said}`, JSON.stringify(shortList));
    const timer = setTimeout(() => {
      saveShortList(said, shortList).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [shortList, said]);

  // Register window handlers so Leaflet popup buttons can call React state
  useEffect(() => {
    window.__shortListIds = shortList.map(s => String(s.UNITID));
    window.__toggleShortList = (unitid) => {
      const uid = String(unitid);
      setShortList(sl => {
        if (sl.some(s => String(s.UNITID) === uid)) {
          return sl.filter(s => String(s.UNITID) !== uid);
        }
        if (sl.length >= 40) {
          alert("Your Short List is full (max 40 schools). Remove a school to add another.");
          return sl;
        }
        // Find school from results.scored first, then raw schools list
        const scored  = results?.scored?.find(s => String(s.UNITID) === uid);
        const rawSch  = schools.find(s => String(s.UNITID) === uid);
        const base    = scored || rawSch;
        if (!base) return sl;
        return [...sl, {
          ...base,
          crm_contacted: false, crm_applied: false,
          crm_offer: false,     crm_committed: false,
          addedAt: new Date().toISOString(),
        }];
      });
    };
  }, [shortList, results, schools]);

  // Auto-geocode when highSchool + state both have values
  useEffect(() => {
    const { highSchool, state } = athlete;
    if (!highSchool.trim() || !state.trim()) return;
    const timer = setTimeout(async () => {
      setGeocoding(true);
      const result = await geocodeHighSchool(highSchool.trim(), state.trim());
      setGeocoding(false);
      if (result) {
        setAthlete(a => ({ ...a, hsLat: result.lat, hsLng: result.lng, geoLabel: result.display }));
      } else {
        setAthlete(a => ({ ...a, hsLat: null, hsLng: null, geoLabel: null }));
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [athlete.highSchool, athlete.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable array of short-listed UNITIDs — memoized so MapView doesn't re-render markers on every App render
  const shortListIds = useMemo(() => shortList.map(s => String(s.UNITID)), [shortList]);

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

  async function handleSubmit(forceNew = false) {
    setError(null);
    const { name, highSchool, gradYear, email, position, height, weight, speed40, state, gpa } = athlete;
    if (!name) { setError("Full Name is required."); return; }
    if (!highSchool) { setError("High School is required."); return; }
    if (!state) { setError("State (HS) is required — used to calculate recruit reach distance."); return; }
    if (!gradYear) { setError("Expected Grad Year is required."); return; }
    if (!email) { setError("Student-Athlete Email is required."); return; }
    if (!position || !height || !weight || !speed40) { setError("Position, Height, Weight, and 40-Yard Time are required."); return; }
    if (!gpa) { setError("Cumulative GPA is required."); return; }

    setLoading(true);
    try {
      const parsed = {
        ...athlete,
        height: +athlete.height, weight: +athlete.weight, speed40: +athlete.speed40,
        gpa: athlete.gpa ? +athlete.gpa : null,
        sat: athlete.sat ? +athlete.sat : null,
        agi: athlete.agi ? +athlete.agi : null,
        dependents: athlete.dependents ? (athlete.dependents === "4+" ? 4 : +athlete.dependents) : null,
      };
      // GPA eligibility check — minimum thresholds by class year
      const GPA_MIN = { Senior: 2.5, Junior: 2.4, Soph: 2.3, Freshman: 2.2 };
      const classLabel = getClassLabel(parsed.gradYear);
      const requiredGpa = GPA_MIN[classLabel] ?? 2.2;
      if (parsed.gpa !== null && parsed.gpa < requiredGpa) {
        setStayGrittyData({ reason: "academic", requiredGpa, classLabel });
        saveRecruit({ ...parsed, timestamp: new Date().toISOString() }).catch(() => {});
        return;
      }

      const res = runQuickList(parsed, schools, tracker);

      if (!res.topTier || res.top50.length === 0) {
        // No qualifying tier OR no schools passed all gates — show Stay Gritty modal
        setStayGrittyData(res);
        saveRecruit({ ...parsed, timestamp: new Date().toISOString() }).catch(() => {});
        return;
      }

      setResults(res);
      setMode("quicklist");
      setPanel("map");
      setShowResultsModal(true);

      // Determine whether to update existing record or insert new one
      const identityChanged = savedIdentity &&
        (athlete.name !== savedIdentity.name || athlete.email !== savedIdentity.email);

      if (!forceNew && said && !identityChanged) {
        // Update existing record
        updateRecruit({ ...parsed, said, timestamp: new Date().toISOString() })
          .catch(() => {});
      } else {
        // New insert
        setSaid(null); // clear optimistically; will be set from response
        saveRecruit({ ...parsed, timestamp: new Date().toISOString() })
          .then(r => { if (r?.said) { setSaid(r.said); setSavedIdentity({ name: athlete.name, email: athlete.email }); } })
          .catch(() => {});
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleNewProfile() {
    setSaid(null);
    setSavedIdentity(null);
    setResults(null);
    setAthlete(BLANK_ATHLETE);
    setShortList([]);
    localStorage.removeItem("cfb_said");
    setMode("quicklist");
  }

  function handleToggleShortList(unitid) {
    const uid = String(unitid);
    setShortList(sl => {
      if (sl.some(s => String(s.UNITID) === uid)) {
        return sl.filter(s => String(s.UNITID) !== uid);
      }
      if (sl.length >= 40) return sl;
      const scored = results?.scored?.find(s => String(s.UNITID) === uid);
      const raw    = schools.find(s => String(s.UNITID) === uid);
      const base   = scored || raw;
      if (!base) return sl;
      return [...sl, {
        ...base,
        crm_contacted: false, crm_applied: false,
        crm_offer: false,     crm_committed: false,
        addedAt: new Date().toISOString(),
      }];
    });
  }

  function handleRemoveFromShortList(unitid) {
    setShortList(sl => sl.filter(s => String(s.UNITID) !== String(unitid)));
  }

  function handleCRMChange(unitid, field, value) {
    setShortList(sl => sl.map(s => String(s.UNITID) === String(unitid) ? { ...s, [field]: value } : s));
  }

  function handleReorderShortList(newOrder) {
    setShortList(newOrder);
  }

  const isBrowse    = mode === "browse";
  const isShortList = mode === "shortlist";

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
            <button id="tutHelpBtn" className="help-btn" onClick={() => { setTutorialType("browse"); setShowTutorial(true); }} aria-label="Help">?</button>
          )}
          {mode === "quicklist" && (
            <button id="qlHelpBtn" className="help-btn" onClick={() => { setTutorialType("quicklist"); setShowTutorial(true); }} aria-label="My GRIT Fit Help">?</button>
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
          {isShortList ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <ShortList
                shortList={shortList}
                said={said}
                onReorder={handleReorderShortList}
                onRemove={handleRemoveFromShortList}
                onCRMChange={handleCRMChange}
                onGoToGritFit={() => setMode("quicklist")}
              />
            </div>
          ) : isBrowse ? (
            <div style={{ flex: 1 }}>
              {dataLoaded
                ? <MapView schools={schools} results={null} mode="browse" filters={filters} shortListIds={shortListIds} />
                : <div className="loading-screen">Loading School Data…</div>}
            </div>
          ) : (
            results ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {panel === "map" ? (
                  <div style={{ flex: 1, position: "relative" }}>
                    <MapView schools={schools} results={results} mode="quicklist" filters={null} shortListIds={shortListIds} />
                    {showResultsModal && (
                      <div style={{
                        position: "absolute", inset: 0, zIndex: 1000,
                        background: "rgba(6,10,7,0.82)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "24px",
                      }}>
                        <div style={{
                          background: "#0e1510", border: "1px solid #2e6b18",
                          borderRadius: 6, padding: "32px 28px", maxWidth: 400, width: "100%",
                          textAlign: "center", fontFamily: "'Barlow Condensed', sans-serif",
                        }}>
                          <div style={{ fontSize: 32, marginBottom: 12 }}>🏈</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: "#6ed430", letterSpacing: 1, marginBottom: 6 }}>
                            Your GRIT FIT Results are ready.
                          </div>
                          <div style={{ fontSize: 12, color: "#c8f5a0", letterSpacing: 0.5, marginBottom: 16, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, textTransform: "uppercase" }}>
                            Your personalized target college football recruiting matches
                          </div>
                          <div style={{ fontSize: 13, color: "#6b8c72", lineHeight: 1.6, marginBottom: 24, fontFamily: "'Barlow', sans-serif", fontWeight: 400 }}>
                            The map below shows your matched programs, color-coded by fit tier.
                            Green markers are your Top Matches, gold are Good Matches, and red are Borderline.
                            Click any marker to view school details and access recruiting links.
                            Switch to <strong style={{ color: "#c8f5a0" }}>Table</strong> view for full financial and ROI data.
                          </div>
                          <button
                            onClick={() => setShowResultsModal(false)}
                            style={{
                              padding: "10px 32px", background: "#2e6b18", border: "1px solid #6ed430",
                              borderRadius: 3, color: "#c8f5a0", fontFamily: "'Barlow Condensed', sans-serif",
                              fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
                            }}
                          >
                            View My Matches →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    <ResultsTable
                      results={results}
                      name={athlete.name}
                      shortList={shortList}
                      onToggleShortList={handleToggleShortList}
                    />
                  </div>
                )}
                <div className="summary-bar">
                  {results.topTier && <span className="stat">Tier: <strong>{results.topTier}</strong></span>}
                  {results.recruitReach && <span className="stat">Reach: <strong>{results.recruitReach} mi</strong></span>}
                  <span className="stat" style={{ color: "#6ed430" }}>Top: <strong>{results.top30?.length ?? 0}</strong></span>
                  <span className="stat" style={{ color: "#f5a623" }}>Good: <strong>{(results.top50?.length ?? 0) - (results.top30?.length ?? 0) > 0 ? Math.min((results.top50?.length ?? 0) - (results.top30?.length ?? 0), 10) : 0}</strong></span>
                  <span className="stat" style={{ color: "#ef5350" }}>Border: <strong>{Math.max(0, (results.top50?.length ?? 0) - 40)}</strong></span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    {said && (
                      <button
                        onClick={handleNewProfile}
                        style={{ padding: "5px 14px", background: "#1a2e1d", border: "1px solid #6b8c72", borderRadius: 3, color: "#6b8c72", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700, cursor: "pointer" }}
                      >New Profile</button>
                    )}
                    <button
                      onClick={() => setResults(null)}
                      style={{ padding: "5px 14px", background: "#2e6b18", border: "1px solid #6ed430", borderRadius: 3, color: "#c8f5a0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700, cursor: "pointer" }}
                    >Edit My Profile</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <QuickListForm
                  athlete={athlete}
                  onChange={handleChange}
                  onAwardChange={handleAwardChange}
                  onSubmit={handleSubmit}
                  onNewProfile={handleNewProfile}
                  loading={loading}
                  error={error}
                  geocoding={geocoding}
                  hasSaid={!!said}
                />
              </div>
            )
          )}
        </div>
      </div>

      <footer className="app-footer">
        Support: <a href="mailto:verifygrit@gmail.com">verifygrit@gmail.com</a>
      </footer>

      {stayGrittyData && (
        <StayGrittyModal
          results={stayGrittyData}
          athlete={athlete}
          onEditProfile={() => setStayGrittyData(null)}
          onBrowse={() => { setStayGrittyData(null); setMode("browse"); }}
        />
      )}

      {showTutorial && <Tutorial type={tutorialType} onClose={() => setShowTutorial(false)} />}
      {showBrowseAnim && (
        <HelmetAnim targetId="tutHelpBtn" onDone={() => {
          setShowBrowseAnim(false);
          if (!localStorage.getItem("cfb_browse_tutSeen")) {
            localStorage.setItem("cfb_browse_tutSeen", "1");
            setTutorialType("browse");
            setShowTutorial(true);
          }
        }} />
      )}
      {showQLAnim && (
        <HelmetAnim targetId="qlHelpBtn" onDone={() => {
          setShowQLAnim(false);
          if (!localStorage.getItem("cfb_ql_tutSeen")) {
            localStorage.setItem("cfb_ql_tutSeen", "1");
            setTutorialType("quicklist");
            setShowTutorial(true);
          }
        }} />
      )}
    </div>
  );
}
