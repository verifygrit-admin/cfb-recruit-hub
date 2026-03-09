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
import AuthModal from "./components/AuthModal.jsx";
import { fetchSchools, fetchTracker, saveRecruit, updateRecruit, geocodeHighSchool, saveShortList, getShortList, validateToken, signOut, completePendingAccount, requestEmailChange, confirmEmailChange } from "./lib/api.js";
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
  const [auth, setAuth]                     = useState(null);   // { said, email, sessionToken } or null
  const [pendingAuth, setPendingAuth]       = useState(null);   // { res } waiting for auth
  const [showAuthModal, setShowAuthModal]   = useState(false);  // sign-in-only modal
  const [authModalView, setAuthModalView]   = useState("signIn");
  const [newProfileMode, setNewProfileMode]       = useState(false);
  const [pendingNewProfile, setPendingNewProfile] = useState(null);
  const [showSwitchModal, setShowSwitchModal]     = useState(null);
  const [showEmailVerify, setShowEmailVerify]     = useState(false);
  const [emailVerifyState, setEmailVerifyState]   = useState({ newEmail: "", code: "", loading: false, error: null, success: false });
  const [pendingComplete, setPendingComplete]     = useState(null);
  const [gritFitPrompt, setGritFitPrompt]   = useState(null);   // contextual redirect message
  const browseAnimShown   = useRef(false);
  const qlAnimShown       = useRef(false);
  const restoreSessionRef  = useRef(null);   // profile to re-run after schools load
  const restoreSlRef       = useRef(null);   // SAID to fetch short list from server after schools load
  const savedResultsRef = useRef(null);
  const savedAthleteRef = useRef(null);

  useEffect(() => {
    fetchSchools()
      .then(s => { setSchools(s); setDataLoaded(true); })
      .catch(e => setDataError(e.message));
    fetchTracker().then(setTracker).catch(() => {});

    // Restore session + short list from localStorage on mount
    const savedSaid  = localStorage.getItem("cfb_said");
    const savedToken = localStorage.getItem("cfb_session_token");

    // Restore SAID for sign-in banner — but NOT shortList until auth is confirmed
    if (savedSaid) {
      setSaid(savedSaid);
    }

    // Validate session token if both present; only then restore shortList
    if (savedSaid && savedToken) {
      validateToken(savedSaid, savedToken).then(r => {
        if (r.ok) {
          setAuth({ said: savedSaid, email: r.email, sessionToken: savedToken });
          // Restore short list — localStorage first, server fallback if empty
          try {
            const sl = localStorage.getItem(`cfb_sl_${savedSaid}`);
            const parsed = sl ? JSON.parse(sl) : [];
            if (parsed.length) {
              setShortList(parsed);
            } else {
              restoreSlRef.current = savedSaid; // fetch from server when schools load
            }
          } catch {
            restoreSlRef.current = savedSaid;
          }
          if (r.profile) {
            const p = r.profile;
            const restored = {
              name: p.name || "", highSchool: p.highSchool || "",
              gradYear: p.gradYear || "", email: p.email || "",
              phone: p.phone || "", twitter: p.twitter || "",
              position: p.position || "", height: p.height || "",
              weight: p.weight || "", speed40: p.speed40 || "",
              gpa: p.gpa || "", sat: p.sat || "",
              state: p.state || "",
              hsLat: p.hsLat || null, hsLng: p.hsLng || null, geoLabel: null,
              agi: p.agi || "", dependents: p.dependents || "",
              awards: p.awards || { expectedStarter: false, captain: false, allConference: false, allState: false },
            };
            setAthlete(restored);
            setSavedIdentity({ name: p.name, email: p.email });
            restoreSessionRef.current = p;  // signal restore when schools load
          }
        } else {
          localStorage.removeItem("cfb_session_token");
        }
      }).catch(() => {});
    }

    // Show browse helmet animation on first load
    if (!browseAnimShown.current) {
      browseAnimShown.current = true;
      setShowBrowseAnim(true);
    }
    // Check for magic link completion (?completeSAID=...&token=...)
    const params = new URLSearchParams(window.location.search);
    const completeSAID = params.get("completeSAID");
    const completeToken = params.get("token");
    if (completeSAID && completeToken) {
      setPendingComplete({ said: completeSAID, token: completeToken });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Show QL helmet animation when results first appear
  useEffect(() => {
    if (results && !qlAnimShown.current) {
      qlAnimShown.current = true;
      setShowQLAnim(true);
    }
  }, [results]);

  // Auto-restore GRIT Fit results when schools load after a valid session restore
  useEffect(() => {
    if (!dataLoaded || !schools.length || !restoreSessionRef.current) return;
    const p = restoreSessionRef.current;
    restoreSessionRef.current = null;
    if (!p.name || !p.position || !p.height) return;
    const parsed = {
      name: p.name, highSchool: p.highSchool || "", gradYear: p.gradYear || "",
      email: p.email || "", state: p.state || "",
      position: p.position, height: +p.height || 0, weight: +p.weight || 0,
      speed40: +p.speed40 || 0,
      gpa: p.gpa ? +p.gpa : null, sat: p.sat ? +p.sat : null,
      hsLat: p.hsLat || null, hsLng: p.hsLng || null,
      agi: p.agi ? +p.agi : null,
      dependents: p.dependents ? (p.dependents === "4+" ? 4 : +p.dependents) : null,
      awards: p.awards || { expectedStarter: false, captain: false, allConference: false, allState: false },
    };
    const res = runQuickList(parsed, schools, tracker);
    if (res.topTier && res.top50.length > 0) {
      setResults(res);
      setMode("quicklist");
      setPanel("map");
      // Don't show the results intro modal on session restore
    }
  }, [dataLoaded, schools, tracker]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore short list from server when localStorage is empty (cross-device or post-overwrite-bug)
  useEffect(() => {
    if (!dataLoaded || !schools.length || !restoreSlRef.current) return;
    const saidToRestore = restoreSlRef.current;
    restoreSlRef.current = null;
    getShortList(saidToRestore).then(r => {
      if (!r.schools?.length) return;
      const schoolMap = new Map(schools.map(s => [String(s.UNITID), s]));
      const restored = r.schools.map(item => {
        const base = schoolMap.get(String(item.unitid));
        if (!base) return null;
        return {
          ...base,
          matchRank:     item.matchRank  || null,
          matchTier:     item.matchTier  || null,
          netCost:       item.netCost   != null ? Number(item.netCost)   : null,
          droi:          item.droi      != null ? Number(item.droi)      : null,
          adltv:         item.adltv     != null ? Number(item.adltv)     : base.adltv,
          dist:          item.dist      != null ? Number(item.dist)      : null,
          crm_contacted: item.crm_contacted === true || item.crm_contacted === "TRUE",
          crm_applied:   item.crm_applied   === true || item.crm_applied   === "TRUE",
          crm_offer:     item.crm_offer     === true || item.crm_offer     === "TRUE",
          crm_committed: item.crm_committed === true || item.crm_committed === "TRUE",
        };
      }).filter(Boolean);
      if (restored.length) setShortList(restored);
    }).catch(() => {});
  }, [dataLoaded, schools]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist SAID + short list to localStorage; debounce Sheet sync
  // Only write when authenticated — prevents logout clearing the saved list
  useEffect(() => {
    if (!said) return;
    localStorage.setItem("cfb_said", said);
    if (auth) {
      localStorage.setItem(`cfb_sl_${said}`, JSON.stringify(shortList));
      const timer = setTimeout(() => {
        saveShortList(said, shortList).catch(() => {});
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [shortList, said, auth]);

  // Register window handlers so Leaflet popup buttons can call React state
  useEffect(() => {
    window.__shortListIds = shortList.map(s => String(s.UNITID));
    window.__toggleShortList = (unitid) => {
      if (!auth) {
        if (!said) {
          // New user — redirect to My GRIT Fit to build profile first
          setMode("quicklist");
          setGritFitPrompt("Complete your Student-Athlete Profile to save schools to your Short List and generate your personalized GRIT Fit results.");
        } else {
          // Returning user with profile — prompt sign in
          setAuthModalView("signIn");
          setShowAuthModal(true);
        }
        return;
      }
      const uid = String(unitid);
      setShortList(sl => {
        if (sl.some(s => String(s.UNITID) === uid)) {
          return sl.filter(s => String(s.UNITID) !== uid);
        }
        if (sl.length >= 40) {
          alert("Your Short List is full (max 40 schools). Remove a school to add another.");
          return sl;
        }
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
  }, [shortList, results, schools, auth, said]);

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

  function revealResults(res) {
    setResults(res);
    setMode("quicklist");
    setPanel("map");
    setShowResultsModal(true);
  }

  function handleAuthComplete({ said: authSaid, email: authEmail, sessionToken, profile }) {
    setAuth({ said: authSaid, email: authEmail, sessionToken });
    localStorage.setItem("cfb_session_token", sessionToken);
    setSaid(authSaid);
    setShowAuthModal(false);

    // Restore short list — localStorage first, server fallback if empty
    try {
      const sl = localStorage.getItem(`cfb_sl_${authSaid}`);
      const parsed = sl ? JSON.parse(sl) : [];
      if (parsed.length) {
        setShortList(parsed);
      } else {
        restoreSlRef.current = authSaid; // fetch from server when schools load (or immediately if loaded)
        if (dataLoaded && schools.length) {
          // Schools already loaded — trigger the effect by setting and immediately clearing via a timeout
          // (the effect watches restoreSlRef, not state — manually invoke inline instead)
          getShortList(authSaid).then(r => {
            if (!r.schools?.length) return;
            const schoolMap = new Map(schools.map(s => [String(s.UNITID), s]));
            const restored = r.schools.map(item => {
              const base = schoolMap.get(String(item.unitid));
              if (!base) return null;
              return {
                ...base,
                matchRank:     item.matchRank  || null,
                matchTier:     item.matchTier  || null,
                netCost:       item.netCost   != null ? Number(item.netCost)   : null,
                droi:          item.droi      != null ? Number(item.droi)      : null,
                adltv:         item.adltv     != null ? Number(item.adltv)     : base.adltv,
                dist:          item.dist      != null ? Number(item.dist)      : null,
                crm_contacted: item.crm_contacted === true || item.crm_contacted === "TRUE",
                crm_applied:   item.crm_applied   === true || item.crm_applied   === "TRUE",
                crm_offer:     item.crm_offer     === true || item.crm_offer     === "TRUE",
                crm_committed: item.crm_committed === true || item.crm_committed === "TRUE",
              };
            }).filter(Boolean);
            if (restored.length) { restoreSlRef.current = null; setShortList(restored); }
          }).catch(() => {});
        }
      }
    } catch {
      restoreSlRef.current = authSaid;
    }

    if (pendingAuth?.res) {
      // Coming from a submit gate — show already-computed results
      setSavedIdentity(prev => prev ? { ...prev, email: authEmail } : { name: athlete.name, email: authEmail });
      revealResults(pendingAuth.res);
      setPendingAuth(null);
    } else {
      // Sign-in only — restore GRIT Fit from returned profile if possible
      setPendingAuth(null);
      const p = profile;
      if (p?.name && p?.position && schools.length) {
        const restored = {
          name: p.name || "", highSchool: p.highSchool || "",
          gradYear: p.gradYear || "", email: p.email || "",
          phone: p.phone || "", twitter: p.twitter || "",
          position: p.position || "", height: p.height || "",
          weight: p.weight || "", speed40: p.speed40 || "",
          gpa: p.gpa || "", sat: p.sat || "",
          state: p.state || "",
          hsLat: p.hsLat || null, hsLng: p.hsLng || null, geoLabel: null,
          agi: p.agi || "", dependents: p.dependents || "",
          awards: p.awards || { expectedStarter: false, captain: false, allConference: false, allState: false },
        };
        setAthlete(restored);
        setSavedIdentity({ name: p.name, email: p.email });
        const parsed = {
          ...restored,
          height: +restored.height || 0, weight: +restored.weight || 0,
          speed40: +restored.speed40 || 0,
          gpa: restored.gpa ? +restored.gpa : null,
          sat: restored.sat ? +restored.sat : null,
          agi: restored.agi ? +restored.agi : null,
          dependents: restored.dependents ? (restored.dependents === "4+" ? 4 : +restored.dependents) : null,
        };
        if (parsed.name && parsed.position && parsed.height) {
          const res = runQuickList(parsed, schools, tracker);
          if (res.topTier && res.top50.length > 0) revealResults(res);
        }
      }
    }
  }

  function handleLogout() {
    if (!auth) return;
    signOut(auth.said, auth.sessionToken).catch(() => {});
    setAuth(null);
    setResults(null);
    setShortList([]);
    localStorage.removeItem("cfb_session_token");
    // Keep cfb_said + cfb_sl_${said} in localStorage for sign-back-in restore
  }

  async function handleSubmit(forceNew = false) {
    setError(null);
    setGritFitPrompt(null);
    const { name, highSchool, gradYear, email, position, height, weight, speed40, state, gpa } = athlete;
    if (!name)       { setError("Full Name is required."); return; }
    if (!highSchool) { setError("High School is required."); return; }
    if (!state)      { setError("State (HS) is required — used to calculate recruit reach distance."); return; }
    if (!gradYear)   { setError("Expected Grad Year is required."); return; }
    if (!email)      { setError("Student-Athlete Email is required."); return; }
    if (!position || !height || !weight || !speed40) { setError("Position, Height, Weight, and 40-Yard Time are required."); return; }
    if (!gpa)        { setError("Cumulative GPA is required."); return; }

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

      // GPA eligibility check
      const GPA_MIN = { Senior: 2.5, Junior: 2.4, Soph: 2.3, Freshman: 2.2 };
      const classLabel   = getClassLabel(parsed.gradYear);
      const requiredGpa  = GPA_MIN[classLabel] ?? 2.2;
      if (parsed.gpa !== null && parsed.gpa < requiredGpa) {
        setStayGrittyData({ reason: "academic", requiredGpa, classLabel });
        if (auth && said) {
          updateRecruit({ ...parsed, said, timestamp: new Date().toISOString() }).catch(() => {});
        } else {
          saveRecruit({ ...parsed, timestamp: new Date().toISOString() }).catch(() => {});
        }
        return;
      }

      const res = runQuickList(parsed, schools, tracker);

      if (!res.topTier || res.top50.length === 0) {
        setStayGrittyData(res);
        if (auth && said) {
          updateRecruit({ ...parsed, said, timestamp: new Date().toISOString() }).catch(() => {});
        } else {
          saveRecruit({ ...parsed, timestamp: new Date().toISOString() }).catch(() => {});
        }
        return;
      }

      if (auth) {
        const isNewPerson = newProfileMode && athlete.email !== auth.email;

        if (isNewPerson) {
          // New profile for a different person — create new SAID, preserve current session
          savedResultsRef.current = results;
          savedAthleteRef.current = { ...athlete };
          const r = await saveRecruit({ ...parsed, timestamp: new Date().toISOString() });
          const newSaid = r?.said || null;
          if (newSaid) {
            setPendingNewProfile({ res, said: newSaid, email: athlete.email });
          }
          setNewProfileMode(false);
        } else {
          // Editing current profile
          revealResults(res);
          const emailChanged = athlete.email !== auth.email;
          if (emailChanged) {
            // Save with current auth email, then trigger email change verification
            updateRecruit({ ...parsed, email: auth.email, said, timestamp: new Date().toISOString() }).catch(() => {});
            requestEmailChange(said, auth.sessionToken, athlete.email).then(r => {
              if (r.error) { setError(r.error); return; }
              setEmailVerifyState({ newEmail: athlete.email, code: "", loading: false, error: null, success: false });
              setShowEmailVerify(true);
            }).catch(() => setError("Failed to send verification email."));
          } else {
            updateRecruit({ ...parsed, said, timestamp: new Date().toISOString() }).catch(() => {});
          }
          setSavedIdentity({ name: athlete.name, email: auth.email });
          setNewProfileMode(false);
        }
      } else {
        // Unauthenticated — save to get SAID, then gate on account creation
        const r = await saveRecruit({ ...parsed, timestamp: new Date().toISOString() });
        const newSaid = r?.said || null;
        if (newSaid) {
          setSaid(newSaid);
          setSavedIdentity({ name: athlete.name, email: athlete.email });
        }
        setPendingAuth({ res });
        setNewProfileMode(false);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleNewProfile() {
    setResults(null);
    setAthlete(BLANK_ATHLETE);
    setSavedIdentity(null);
    setNewProfileMode(true);
    if (!auth) {
      setSaid(null);
      setShortList([]);
      localStorage.removeItem("cfb_said");
    }
    setMode("quicklist");
  }

  function handleEditProfile() {
    setResults(null);
    setNewProfileMode(false);
  }

  function handleNewProfileAuth({ said: newSaid, email: newEmail, sessionToken: newToken, profile: newProfile }) {
    const capturePending = pendingNewProfile;
    setPendingNewProfile(null);
    setShowSwitchModal({
      res: capturePending?.res,
      newAuth: { said: newSaid, email: newEmail, sessionToken: newToken, profile: newProfile },
    });
    if (savedAthleteRef.current) { setAthlete(savedAthleteRef.current); savedAthleteRef.current = null; }
    const sr = savedResultsRef.current;
    savedResultsRef.current = null;
    setResults(sr !== undefined ? sr : null);
  }

  function handleSwitchChoice(switchToNew) {
    const { res, newAuth } = showSwitchModal;
    setShowSwitchModal(null);
    if (switchToNew) {
      if (auth) signOut(auth.said, auth.sessionToken).catch(() => {});
      localStorage.removeItem("cfb_session_token");
      setAuth({ said: newAuth.said, email: newAuth.email, sessionToken: newAuth.sessionToken });
      localStorage.setItem("cfb_session_token", newAuth.sessionToken);
      setSaid(newAuth.said);
      setShortList([]);
      if (newAuth.profile) {
        const p = newAuth.profile;
        const restored = {
          name: p.name || "", highSchool: p.highSchool || "", gradYear: p.gradYear || "",
          email: p.email || "", phone: p.phone || "", twitter: p.twitter || "",
          position: p.position || "", height: p.height || "", weight: p.weight || "",
          speed40: p.speed40 || "", gpa: p.gpa || "", sat: p.sat || "",
          state: p.state || "", hsLat: p.hsLat || null, hsLng: p.hsLng || null, geoLabel: null,
          agi: p.agi || "", dependents: p.dependents || "",
          awards: p.awards || { expectedStarter: false, captain: false, allConference: false, allState: false },
        };
        setAthlete(restored);
        setSavedIdentity({ name: p.name, email: p.email });
      }
      if (res) revealResults(res);
    }
  }

  async function handleEmailVerifySubmit() {
    setEmailVerifyState(s => ({ ...s, loading: true, error: null }));
    try {
      const r = await confirmEmailChange(said, emailVerifyState.code);
      if (r.error) { setEmailVerifyState(s => ({ ...s, loading: false, error: r.error })); return; }
      setAuth(a => a ? { ...a, email: r.email } : a);
      setSavedIdentity(s => s ? { ...s, email: r.email } : s);
      setEmailVerifyState(s => ({ ...s, loading: false, success: true }));
      setTimeout(() => setShowEmailVerify(false), 1500);
    } catch {
      setEmailVerifyState(s => ({ ...s, loading: false, error: "Something went wrong. Please try again." }));
    }
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
          <ModeToggle
            mode={mode}
            auth={auth}
            onChange={m => {
              if (m === "__logout") { handleLogout(); return; }
              if (m === "__signin") { setAuthModalView("signIn"); setShowAuthModal(true); return; }
              setMode(m);
              if (m === "browse") setPanel("map");
            }}
          />
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
                      onClick={handleEditProfile}
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
                  auth={auth}
                  onSignIn={() => { setAuthModalView("signIn"); setShowAuthModal(true); }}
                  prompt={gritFitPrompt}
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

      {pendingAuth && (
        <AuthModal
          initialView="createAccount"
          prefillEmail={athlete.email}
          said={said}
          onAuth={handleAuthComplete}
          onReturn={() => { setPendingAuth(null); setMode("browse"); }}
        />
      )}
      {showAuthModal && !pendingAuth && (
        <AuthModal
          initialView={authModalView}
          prefillEmail={athlete.email || ""}
          said={said}
          onAuth={handleAuthComplete}
          onDismiss={() => setShowAuthModal(false)}
          onReturn={() => setShowAuthModal(false)}
          onCreateNew={() => {
            setShowAuthModal(false);
            // Clear any existing session — fresh start
            setSaid(null);
            setSavedIdentity(null);
            setAthlete(BLANK_ATHLETE);
            setShortList([]);
            localStorage.removeItem("cfb_said");
            // Send to My GRIT Fit with context
            setMode("quicklist");
            setGritFitPrompt("Complete your Student-Athlete Profile to save schools to your Short List and generate your personalized GRIT Fit results.");
          }}
        />
      )}

      {pendingNewProfile && (
        <AuthModal
          initialView="createAccount"
          prefillEmail={pendingNewProfile.email}
          said={pendingNewProfile.said}
          onAuth={handleNewProfileAuth}
          onDismiss={() => {
            setPendingNewProfile(null);
            if (savedAthleteRef.current) { setAthlete(savedAthleteRef.current); savedAthleteRef.current = null; }
            const sr = savedResultsRef.current; savedResultsRef.current = null; setResults(sr !== undefined ? sr : null);
          }}
          onReturn={() => {
            setPendingNewProfile(null);
            if (savedAthleteRef.current) { setAthlete(savedAthleteRef.current); savedAthleteRef.current = null; }
            const sr = savedResultsRef.current; savedResultsRef.current = null; setResults(sr !== undefined ? sr : null);
          }}
        />
      )}
      {showSwitchModal && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <div className="auth-logo">Gritty<span style={{ color: "var(--accent)" }}>OS</span></div>
            <div className="auth-title">Account Created</div>
            <div className="auth-sub">New account created for <strong>{showSwitchModal.newAuth?.email}</strong>. Would you like to switch to this account now?</div>
            <button className="auth-submit" onClick={() => handleSwitchChoice(true)}>Switch to {showSwitchModal.newAuth?.email} →</button>
            <div className="auth-switch" style={{ marginTop: 12 }}>
              <button onClick={() => handleSwitchChoice(false)}>Stay logged in as {auth?.email}</button>
            </div>
            <div className="auth-footer">Support: <a href="mailto:verifygrit@gmail.com">verifygrit@gmail.com</a></div>
          </div>
        </div>
      )}
      {showEmailVerify && (
        <div className="auth-overlay">
          <div className="auth-modal" style={{ position: "relative" }}>
            <button onClick={() => setShowEmailVerify(false)} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            <div className="auth-logo">Gritty<span style={{ color: "var(--accent)" }}>OS</span></div>
            <div className="auth-title">Verify New Email</div>
            <div className="auth-sub">We sent a 6-digit code to <strong>{emailVerifyState.newEmail}</strong>. Enter it below to confirm your new email address.</div>
            {emailVerifyState.error && <div className="auth-error">{emailVerifyState.error}</div>}
            {emailVerifyState.success && <div className="auth-success">Email updated successfully!</div>}
            <div className="auth-field">
              <label>Verification Code</label>
              <input type="text" value={emailVerifyState.code}
                onChange={e => setEmailVerifyState(s => ({ ...s, code: e.target.value }))}
                placeholder="123456" maxLength={6} autoFocus
                style={{ letterSpacing: 4, fontSize: 20 }}
                onKeyDown={e => e.key === "Enter" && handleEmailVerifySubmit()} />
            </div>
            <button className="auth-submit" onClick={handleEmailVerifySubmit} disabled={emailVerifyState.loading}>
              {emailVerifyState.loading ? "Verifying…" : "Confirm New Email →"}
            </button>
            <div className="auth-switch">
              <button onClick={() => requestEmailChange(said, auth.sessionToken, emailVerifyState.newEmail).then(r => { if (!r.error) setEmailVerifyState(s => ({ ...s, error: null })); }).catch(() => {})}>Resend code</button>
            </div>
            <div className="auth-footer">Support: <a href="mailto:verifygrit@gmail.com">verifygrit@gmail.com</a></div>
          </div>
        </div>
      )}
      {pendingComplete && (
        <AuthModal
          initialView="createAccount"
          prefillEmail=""
          said={pendingComplete.said}
          onAuth={handleAuthComplete}
          onDismiss={() => setPendingComplete(null)}
          onReturn={() => setPendingComplete(null)}
          pendingToken={pendingComplete.token}
        />
      )}
      {showTutorial && (
        <Tutorial
          type={tutorialType}
          onClose={() => setShowTutorial(false)}
          onGritFit={tutorialType === "browse" ? () => {
            setShowTutorial(false);
            setMode("quicklist");
            setGritFitPrompt(true);
          } : undefined}
        />
      )}
      {showBrowseAnim && (
        <HelmetAnim targetId="tutHelpBtn" onDone={() => {
          setShowBrowseAnim(false);
          if (!localStorage.getItem("cfb_browse_tutSeen")) {
            localStorage.setItem("cfb_browse_tutSeen", "1");
            setTutorialType("browse");
            setShowTutorial(true);
          } else if (!auth) {
            setAuthModalView("signIn");
            setShowAuthModal(true);
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
