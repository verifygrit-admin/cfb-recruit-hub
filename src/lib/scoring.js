import { ATH_STANDARDS, RECRUIT_BUDGETS, TIER_ORDER, SAT_PERCENTILES } from "./constants.js";

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
function normCDF(z) {
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(z));
  const y = 1 - (((((a[4]*t + a[3])*t + a[2])*t + a[1])*t + a[0])*t) * Math.exp(-z*z);
  return 0.5 * (1 + sign * y);
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
  const brackets = [
    { max:30000,    sai:0,     pubElig:true,  privElig:true,  eliteElig:true  },
    { max:40000,    sai:3000,  pubElig:true,  privElig:true,  eliteElig:true  },
    { max:50000,    sai:6000,  pubElig:true,  privElig:true,  eliteElig:true  },
    { max:60000,    sai:9000,  pubElig:true,  privElig:true,  eliteElig:true  },
    { max:75000,    sai:12000, pubElig:true,  privElig:true,  eliteElig:true  },
    { max:90000,    sai:16000, pubElig:false, privElig:true,  eliteElig:true  },
    { max:110000,   sai:22000, pubElig:false, privElig:false, eliteElig:true  },
    { max:130000,   sai:28000, pubElig:false, privElig:false, eliteElig:true  },
    { max:150000,   sai:35000, pubElig:false, privElig:false, eliteElig:true  },
    { max:175000,   sai:44000, pubElig:false, privElig:false, eliteElig:false },
    { max:Infinity, sai:55000, pubElig:false, privElig:false, eliteElig:false },
  ];
  const depMult = 1 + (deps - 1) * 0.08;
  const adjAGI = agi / depMult;
  const b = brackets.find(x => adjAGI <= x.max) || brackets[brackets.length-1];
  const eligible = isElite ? b.eliteElig : control==="Public" ? b.pubElig : b.privElig;
  return { eligible, efc: eligible ? b.sai : null };
}

export function runQuickList(athlete, schools, trackerMap = {}) {
  const { position, height, weight, speed40, awards, gpa, sat,
          hsLat, hsLng, agi, dependents } = athlete;

  const boost = calcAthleticBoost(awards);
  const athFit = {};
  TIER_ORDER.forEach(tier => {
    athFit[tier] = Math.min(1, calcAthleticFit(position, +height, +weight, +speed40, tier) + boost);
  });

  const topTier = TIER_ORDER.find(t => athFit[t] > 0.5) || null;
  const recruitReach = topTier ? RECRUIT_BUDGETS[topTier] : 450;

  // Athlete academic scores — matching GrittyOS acad_standards_test logic
  const satAchieve = sat ? getSATPercentile(+sat) : 0;
  const gpaPct     = gpa ? getGPAPercentile(+gpa) : 0;
  const acadRigorScore   = sat ? (satAchieve + gpaPct) / 2 : gpaPct * 0.85;
  const acadTestOptScore = gpaPct;

  const scored = schools.map(school => {
    const lat = parseFloat(school.LATITUDE || school.Lat);
    const lng = parseFloat(school.LONGITUDE || school.Lng);
    const dist = (lat && lng && hsLat && hsLng)
      ? haversine(+hsLat, +hsLng, lat, lng) : 9999;

    // Athletic tier match: school.Type = "Power 4", "G5", "1-FCS", "2-Div II", "3-Div III"
    const tierMatch = topTier !== null && school.Type === topTier;

    // Academic fit — compare school threshold to athlete score
    const isTestOpt  = school.Is_Test_Optional === "TRUE" || school.Is_Test_Optional === true;
    const schoolRigor = isTestOpt
      ? parseFloat(school.Acad_Rigor_Test_Opt_Senior) || 0
      : parseFloat(school.Acad_Rigor_Senior) || 0;
    const athleteAcad = isTestOpt ? acadTestOptScore : acadRigorScore;
    const acadScore = schoolRigor > 0 && schoolRigor <= athleteAcad ? schoolRigor : 0;

    const eligible = tierMatch && dist <= recruitReach && acadScore > 0;

    // Financial calculations
    const coa  = parseMoney(school["COA (Out-of-State)"] || school.COA);
    const efcResult = (agi && dependents)
      ? calcEFC(+agi, +dependents, school.Control, school["School Type"])
      : { eligible: false, efc: null };

    const avgMerit    = parseMoney(school.Est_Avg_Merit || school["Avg Merit Award"]);
    const shareFA     = parsePct(school.Share_Stu_Any_Aid);
    const sharePureNeed = parsePct(school.Share_Stu_Need_Aid);
    const meritLikelihood = shareFA && sharePureNeed
      ? Math.min(1, shareFA / (sharePureNeed * 0.55)) : 0;

    // Athletic scholarship estimate
    const div  = school["NCAA Division"] || school.NCAA_Division || "";
    const conf = school.Conference || "";
    let athSchol = 0;
    if (!["Ivy League","Pioneer"].includes(conf)) {
      if (div === "1-FBS")    athSchol = coa;
      else if (div === "1-FCS") athSchol = coa * 0.6;
      else if (div === "2-Div II") athSchol = coa * 0.3;
    }

    const efc    = efcResult.efc || 0;
    const netCost = efcResult.eligible
      ? Math.max(0, ((efc*4)*1.18) - Math.min(coa-efc, avgMerit*meritLikelihood))
      : null;

    const adltv    = parseMoney(school.ADLTV);
    const gradRate = parsePct(school["Graduation Rate"] || school.Grad_Rate);
    const dltv     = parseMoney(school.DLTV);
    const adltvCalc = adltv || dltv * gradRate;
    const droi     = netCost > 0 ? Math.min(100, adltvCalc/netCost) : (netCost===0 ? 100 : null);
    const breakEven = droi ? 40/droi : null;
    const tracker  = trackerMap[school.UNITID] || {};

    return {
      ...school,
      dist: Math.round(dist), eligible, acadScore,
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

  const top30 = scored
    .filter(s => s.eligible)
    .sort((a,b) => b.acadScore - a.acadScore)
    .slice(0, 30);

  return { top30, scored, athFit, topTier, recruitReach, acadRigorScore, acadTestOptScore };
}
