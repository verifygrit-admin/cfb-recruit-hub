import { ATH_STANDARDS, RECRUIT_BUDGETS, TIER_ORDER, SAT_PERCENTILES, STATE_CENTROIDS, EFC_TABLE } from "./constants.js";

/**
 * Determine the DB class-year label for a given gradYear.
 *
 * Rule: find the UPCOMING Sept 1 (the next one that hasn't passed yet).
 * The May 1 that follows that Sept 1 = the graduation date of the current
 * "Senior" class in the DB.  Every year after that is one class back.
 *
 * Example (today = Mar 6 2026):
 *   upcoming Sept 1 → Sept 1 2026
 *   May 1 following → May 1 2027   → DB "Senior" = gradYear 2027
 *   gradYear 2028 → "Junior"
 *   gradYear 2029 → "Sophomore"
 *   gradYear 2030 → "Freshman"
 *
 * After Sept 1 2026 passes the whole ladder shifts forward by one year.
 */
export function getClassLabel(gradYear) {
  const today = new Date();
  const yr = today.getFullYear();
  // Upcoming Sept 1: if we haven't reached it yet this year use this year's,
  // otherwise use next year's.
  const sept1ThisYear = new Date(yr, 8, 1); // months are 0-indexed; 8 = Sept
  const upcomingSept1Year = today < sept1ThisYear ? yr : yr + 1;
  const seniorGradYear = upcomingSept1Year + 1; // May 1 following that Sept 1

  const diff = (+gradYear) - seniorGradYear;
  if (diff <= 0) return "Senior";      // graduating this cycle or past it
  if (diff === 1) return "Junior";
  if (diff === 2) return "Soph";
  if (diff === 3) return "Freshman";
  return "Freshman";                   // clamp anything farther out
}

export function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.pow(Math.sin(dLat/2), 2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.pow(Math.sin(dLng/2), 2);
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Standard normal CDF — matches Google Sheets NORM.DIST(x, mean, σ, TRUE)
// Uses A&S 7.1.26: erfc(x) ≈ poly(t)*exp(-x²), t=1/(1+p·x), x=|z|/√2
function normCDF(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erfc = ((((1.061405429*t - 1.453152027)*t + 1.421413741)*t - 0.284496736)*t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 1 - erfc / 2 : erfc / 2;
}

// Parse "$85,960.00" or "85960" → number
function parseMoney(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/[$,\s]/g, "")) || 0;
}

// Parse "96.08%" or "0.9608" → decimal
function parsePct(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v > 1 ? v / 100 : v;
  const s = String(v).trim();
  if (s.endsWith("%")) return parseFloat(s) / 100;
  return parseFloat(s) || 0;
}

export function calcAthleticFit(position, height, weight, speed40, tier) {
  const std = ATH_STANDARDS[tier]?.[position];
  if (!std) return 0;
  const hScore = normCDF((height   - std.h50) / 1.5);
  const wScore = normCDF((weight   - std.w50) / (std.w50 * 0.05));
  const sScore = 1 - normCDF((speed40 - std.s50) / 0.15);
  return (hScore + wScore + sScore) / 3;
}

export function calcAthleticBoost(awards) {
  let boost = 0;
  if (awards.expectedStarter) boost += 0.05;
  if (awards.captain)         boost += 0.05;
  if (awards.allConference)   boost += 0.10;
  if (awards.allState)        boost += 0.15;
  return boost;
}

export function getSATPercentile(sat) {
  const rounded = Math.round(sat / 10) * 10;
  const keys = Object.keys(SAT_PERCENTILES).map(Number).sort((a,b) => b-a);
  for (const k of keys) { if (rounded >= k) return SAT_PERCENTILES[k]; }
  return 0.01;
}

// GPA → percentile [0..1]. Linear scale: GPA 1.0 → 0, GPA 3.7+ → 1.0
// Matches GrittyOS acad_standards_test: GPA 3.70 → 1.000
export function getGPAPercentile(gpa) {
  return Math.min(1, Math.max(0, (gpa - 1.0) / 2.7));
}

export function calcEFC(agi, deps, control, schoolType) {
  const isElite = ["Super Elite","Elite","Very Selective"].includes(schoolType);
  const depNum  = deps === "4+" ? 4 : (+deps || 1);
  const depIdx  = Math.min(Math.max(depNum - 1, 0), 3); // clamp deps 1–4, convert to 0-index
  // Approximate MATCH type=1: largest row where row.agi <= agi
  let row = EFC_TABLE[0];
  for (const r of EFC_TABLE) {
    if (r.agi <= agi) row = r; else break;
  }
  const eligible = isElite
    ? row.elite[depIdx] === 1
    : control === "Public"
      ? row.pub[depIdx] === 1
      : row.priv[depIdx] === 1;
  return { eligible, efc: eligible ? row.sai[depIdx] : null };
}

export function runQuickList(athlete, schools, trackerMap = {}) {
  const { position, height, weight, speed40, awards, gpa, sat,
          hsLat, hsLng, state, agi, dependents, gradYear } = athlete;

  const classLabel = getClassLabel(gradYear);  // e.g. "Junior", "Senior"

  // Step 1 — base athletic fit per tier (position standards only, no boosts yet)
  const athFitBase = {};
  TIER_ORDER.forEach(tier => {
    athFitBase[tier] = calcAthleticFit(position, +height, +weight, +speed40, tier);
  });

  // Step 2 — apply award boosts after base scoring is complete
  const boost = calcAthleticBoost(awards);
  const athFit = {};
  TIER_ORDER.forEach(tier => {
    athFit[tier] = Math.min(1, athFitBase[tier] + boost);
  });

  const topTier = TIER_ORDER.find(t => athFit[t] > 0.5) || null;
  const recruitReach = topTier ? RECRUIT_BUDGETS[topTier] : 450;


  // Athlete academic scores — matching GrittyOS acad_standards_test logic
  const satScore   = sat ? +sat : 1000; // default to 1000 if not provided
  const satAchieve = getSATPercentile(satScore);
  const gpaPct     = gpa ? getGPAPercentile(+gpa) : 0.3;
  const acadRigorScore   = (satAchieve + gpaPct) / 2;
  const acadTestOptScore = gpaPct;

  // Resolve athlete lat/lng: explicit entry first, then state centroid fallback
  let refLat = hsLat ? +hsLat : 0;
  let refLng = hsLng ? +hsLng : 0;
  if ((!refLat || !refLng) && state) {
    const centroid = STATE_CENTROIDS[state.toUpperCase().trim()];
    if (centroid) { refLat = centroid[0]; refLng = centroid[1]; }
  }

  const scored = schools.map(school => {
    const lat = parseFloat(school.LATITUDE || school.Lat);
    const lng = parseFloat(school.LONGITUDE || school.Lng);
    const dist = (lat && lng && refLat && refLng)
      ? haversine(refLat, refLng, lat, lng) : 9999;

    // Athletic tier match — keyed on school.Type ("Power 4","G6","1-FCS","2-Div II","3-Div III")
    const tierMatch = topTier !== null && school.Type === topTier;

    // Academic fit — compare school threshold to athlete score
    // Column names are class-year-specific: Acad_Rigor_Senior / Junior / Sophomore / Freshman
    const isTestOpt  = school.Is_Test_Optional === "TRUE" || school.Is_Test_Optional === true;
    const rigorKey    = `Acad_Rigor_${classLabel}`;
    const rigorOptKey = `Acad_Rigor_Test_Opt_${classLabel}`;
    const schoolRigor = isTestOpt
      ? parseFloat(school[rigorOptKey]) || 0
      : parseFloat(school[rigorKey]) || 0;
    const athleteAcad = isTestOpt ? acadTestOptScore : acadRigorScore;
    const acadScore = schoolRigor > 0 && schoolRigor <= athleteAcad ? schoolRigor : 0;

    const gateAthletic = tierMatch;
    const gateDist     = dist <= recruitReach;
    const gateAcad     = acadScore > 0;
    const eligible     = gateAthletic && gateDist && gateAcad;

    // Financial calculations
    const coa  = parseMoney(school["COA (Out-of-State)"] || school.COA);
    const efcResult = (agi && dependents)
      ? calcEFC(+agi, +dependents, school.Control, school["School Type"])
      : { eligible: false, efc: null };

    const avgMerit      = parseMoney(school.Est_Avg_Merit || school["Avg Merit Award"]);
    const shareFA       = parsePct(school.Share_Stu_Any_Aid);
    const sharePureNeed = parsePct(school.Share_Stu_Need_Aid);
    const isNeedBlind   = school["Need-Blind School"] === "TRUE" || school["Need-Blind School"] === true;

    // Column Q — Share of Merit: need-blind schools give no merit; low-need schools get 2× multiplier
    const shareOfMerit = isNeedBlind ? 0
      : shareFA * sharePureNeed * (sharePureNeed < 0.2 ? 2 : 1);

    // Column S — Merit Likelihood
    const meritLikelihood = shareFA > 0 ? Math.min(1, shareOfMerit / (shareFA * 0.55)) : 0;

    // Column O — Athletic scholarship
    const div  = school["NCAA Division"] || school.NCAA_Division || "";
    const conf = school.Conference || "";
    let athSchol = 0;
    if (!["Ivy League","Pioneer"].includes(conf)) {
      if (div === "1-FBS")     athSchol = coa;
      else if (div === "1-FCS")    athSchol = coa * 0.6;
      else if (div === "2-Div II") athSchol = coa * 0.3;
    }

    // Column T — Projected Net EFC w/ Merit (athletic schol shown separately as Column O)
    const efc          = efcResult.efc || 0;
    const meritDeduct  = (coa - efc) > (avgMerit * shareFA) ? avgMerit * shareFA : 0;
    const netCost      = efcResult.eligible
      ? (efc * 4 * 1.18) - meritDeduct
      : null;

    // Columns U/V/W — DLTV, Grad Rate, ADLTV
    const dltv     = parseMoney(school.DLTV);
    const gradRate = parsePct(school["Graduation Rate"] || school.Grad_Rate);
    const adltvCalc = dltv * gradRate;

    // Column X — DROI: if not a number (T=0 or null) default to 100
    const droi = (netCost != null && netCost > 0)
      ? adltvCalc / netCost
      : (netCost === 0 ? 100 : null);

    // Column Y — Break-Even: if T>0 use 40/DROI, else near-zero
    const breakEven = netCost != null && netCost > 0 ? 40 / droi : (netCost === 0 ? 0.01 : null);
    const tracker  = trackerMap[school.UNITID] || {};

    return {
      ...school,
      dist: Math.round(dist), eligible, acadScore,
      isTestOpt,
      athFitScore: athFit[school.Type] || 0,
      efcEligible: efcResult.eligible, efc, athSchol, avgMerit,
      meritLikelihood: Math.round(meritLikelihood*100),
      netCost, dltv, gradRate, adltv: adltvCalc, droi, breakEven, tracker,
      // Normalize for display
      _schoolName: school["School Name"] || school.School_Name || "Unknown",
      _divLabel: school["NCAA Division"] || school.NCAA_Division || "",
      _coaNum: coa,
      _qLink: school["Recruiting Q Link"] || school.q_link || "",
      _coachLink: school["Coach Page"] || school.coach_link || "",
    };
  });

  // Rank eligible schools by acadScore, assign match tiers, cap at 50
  const eligibleRanked = scored
    .filter(s => s.eligible)
    .sort((a,b) => b.acadScore - a.acadScore);

  eligibleRanked.forEach((s, i) => {
    s.matchRank = i + 1;
    if      (i < 30) s.matchTier = "top";
    else if (i < 40) s.matchTier = "good";
    else if (i < 50) s.matchTier = "borderline";
    else             { s.matchTier = null; s.eligible = false; } // beyond top 50 — not shown
  });

  const top50 = eligibleRanked.slice(0, 50);
  const top30 = top50.slice(0, 30); // kept for backward compat

  // Gate diagnostics
  const passAthletic = scored.filter(s => s.Type === topTier).length;
  const passDist     = scored.filter(s => s.Type === topTier && s.dist <= recruitReach).length;
  const passAcad     = scored.filter(s => s.Type === topTier && s.acadScore > 0).length;
  const passAll      = top50.length;


  return { top30, top50, scored, athFit, athFitBase, boost, topTier, recruitReach,
           acadRigorScore, acadTestOptScore,
           gates: { passAthletic, passDist, passAcad, passAll } };
}
