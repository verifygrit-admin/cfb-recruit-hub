// Gate diagnostic — Ricky Copeland profile against live DB
// Run: node gate-check.mjs

const API_BASE = "https://script.google.com/macros/s/AKfycbyDtAOmPlVsP2G9dVLUyfgN_Brc8LHnhw3XS5WKT5f2Giw4IkdFdGqxP2F4Zrm6EL8g/exec";

// ── Constants (mirrored from src/lib/constants.js) ───────────────────────────
const ATH_STANDARDS = {
  "Power 4": { CB: { h50:72, w50:190, s50:4.45 } },
  "G5":      { CB: { h50:71, w50:180, s50:4.55 } },
  "1-FCS":   { CB: { h50:70, w50:175, s50:4.60 } },
  "2-Div II":{ CB: { h50:69, w50:170, s50:4.65 } },
  "3-Div III":{ CB:{ h50:68, w50:165, s50:4.70 } },
};
const RECRUIT_BUDGETS = { "Power 4":2500,"G5":1500,"1-FCS":1000,"2-Div II":600,"3-Div III":450 };
const TIER_ORDER = ["Power 4","G5","1-FCS","2-Div II","3-Div III"];
const SAT_PERCENTILES = {
  1600:0.999,1590:0.998,1580:0.997,1570:0.996,1560:0.995,1550:0.994,
  1540:0.993,1530:0.992,1520:0.991,1510:0.990,1500:0.990,1490:0.990,
  1480:0.990,1470:0.990,1460:0.990,1450:0.990,1440:0.980,1430:0.980,
  1420:0.980,1410:0.970,1400:0.970,1390:0.970,1380:0.960,1370:0.960,
  1360:0.950,1350:0.940,1340:0.940,1330:0.930,1320:0.930,1310:0.920,
  1300:0.910,1290:0.900,1280:0.890,1270:0.880,1260:0.870,1250:0.860,
  1240:0.850,1230:0.840,1220:0.830,1210:0.820,1200:0.810,1190:0.800,
  1180:0.780,1170:0.770,1160:0.760,1150:0.740,1140:0.730,1130:0.710,
  1120:0.700,1110:0.690,1100:0.670,1090:0.650,1080:0.630,1070:0.610,
  1060:0.600,1050:0.580,1040:0.560,1030:0.540,1020:0.520,1010:0.500,
  1000:0.480,
};
const STATE_CENTROIDS = { MA:[42.260,-71.808] };

// ── Math helpers ─────────────────────────────────────────────────────────────
function normCDF(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erfc = ((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);
  return z >= 0 ? 1 - erfc/2 : erfc/2;
}
function calcAthleticFit(position, height, weight, speed40, tier) {
  const std = ATH_STANDARDS[tier]?.[position];
  if (!std) return 0;
  const hScore = normCDF((height  - std.h50) / 1.5);
  const wScore = normCDF((weight  - std.w50) / (std.w50 * 0.05));
  const sScore = 1 - normCDF((speed40 - std.s50) / 0.15);
  return (hScore + wScore + sScore) / 3;
}
function getSATPercentile(sat) {
  const rounded = Math.round(sat/10)*10;
  const keys = Object.keys(SAT_PERCENTILES).map(Number).sort((a,b)=>b-a);
  for (const k of keys) { if (rounded >= k) return SAT_PERCENTILES[k]; }
  return 0.01;
}
function haversine(lat1,lng1,lat2,lng2) {
  const R=3959, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.pow(Math.sin(dLat/2),2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.pow(Math.sin(dLng/2),2);
  return R*2*Math.asin(Math.sqrt(a));
}
function parseMoney(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/[$,\s]/g,""))||0;
}
function getClassLabel(gradYear) {
  const today = new Date();
  const yr = today.getFullYear();
  const sept1ThisYear = new Date(yr, 8, 1);
  const upcomingSept1Year = today < sept1ThisYear ? yr : yr + 1;
  const seniorGradYear = upcomingSept1Year + 1;
  const diff = (+gradYear) - seniorGradYear;
  if (diff <= 0) return "Senior";
  if (diff === 1) return "Junior";
  if (diff === 2) return "Soph";
  if (diff === 3) return "Freshman";
  return "Freshman";
}

// ── Ricky's profile ───────────────────────────────────────────────────────────
const athlete = {
  position:"CB", height:70, weight:160, speed40:4.75,
  gpa:3.70, sat:1250, state:"MA", gradYear:2027,
  awards:{ expectedStarter:true, captain:false, allConference:false, allState:false },
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Fetching school data from Apps Script...");
  const res = await fetch(`${API_BASE}?action=db`);
  const json = await res.json();
  const schools = json.schools || [];
  console.log(`Loaded ${schools.length} schools.\n`);

  // Print all column names from first row
  if (schools.length) {
    console.log("=== DB COLUMN NAMES ===");
    console.log(Object.keys(schools[0]).join(" | "));
    console.log();
  }

  // Athletic fit
  const boost = athlete.awards.expectedStarter ? 0.05 : 0;
  const athFit = {};
  TIER_ORDER.forEach(tier => {
    athFit[tier] = Math.min(1, calcAthleticFit(athlete.position, athlete.height, athlete.weight, athlete.speed40, tier) + boost);
  });
  console.log("=== GATE 1 — ATHLETIC FIT ===");
  TIER_ORDER.forEach(t => console.log(`  ${t}: ${athFit[t].toFixed(4)} ${athFit[t] > 0.5 ? "✓ PASS" : "✗"}`));
  const topTier = TIER_ORDER.find(t => athFit[t] > 0.5) || null;
  const recruitReach = topTier ? RECRUIT_BUDGETS[topTier] : 450;
  console.log(`  => topTier: ${topTier}  recruitReach: ${recruitReach} mi\n`);

  // Academic scores
  const satAchieve = getSATPercentile(athlete.sat);
  const gpaPct = Math.min(1, Math.max(0, (athlete.gpa - 1.0) / 2.7));
  const acadRigorScore = (satAchieve + gpaPct) / 2;
  const acadTestOptScore = gpaPct;
  const classLabel = getClassLabel(athlete.gradYear);
  const rigorKey    = `Acad_Rigor_${classLabel}`;
  const rigorOptKey = `Acad_Rigor_Test_Opt_${classLabel}`;
  console.log("=== ACADEMIC SCORES ===");
  console.log(`  gradYear ${athlete.gradYear} => classLabel: ${classLabel}`);
  console.log(`  rigorKey: "${rigorKey}"  rigorOptKey: "${rigorOptKey}"`);
  console.log(`  satAchieve: ${satAchieve.toFixed(3)}  gpaPct: ${gpaPct.toFixed(3)}`);
  console.log(`  acadRigorScore: ${acadRigorScore.toFixed(3)}  acadTestOptScore: ${acadTestOptScore.toFixed(3)}\n`);

  // Athlete coordinates
  const centroid = STATE_CENTROIDS[athlete.state.toUpperCase()];
  const refLat = centroid ? centroid[0] : 0;
  const refLng = centroid ? centroid[1] : 0;
  console.log(`=== COORDINATES: refLat=${refLat}  refLng=${refLng} ===\n`);

  // Check unique NCAA Division values in DB
  const divValues = [...new Set(schools.map(s => s["NCAA Division"]))].sort();
  console.log("=== UNIQUE 'NCAA Division' VALUES IN DB ===");
  console.log(" ", divValues.join(", "));
  console.log();

  // Gate counts
  let g1=0, g2=0, g3=0, gAll=0;
  const rigorSample = [];

  for (const s of schools) {
    const div = s["NCAA Division"] || "";
    const lat = parseFloat(s.LATITUDE || s.Lat);
    const lng = parseFloat(s.LONGITUDE || s.Lng);
    const dist = (lat && lng && refLat && refLng) ? haversine(refLat,refLng,lat,lng) : 9999;

    const gate1 = div === topTier;
    const gate2 = dist <= recruitReach;

    const isTestOpt = s.Is_Test_Optional === "TRUE" || s.Is_Test_Optional === true;
    const rawRigor  = isTestOpt ? s[rigorOptKey] : s[rigorKey];
    const schoolRigor = parseFloat(rawRigor) || 0;
    const athleteAcad = isTestOpt ? acadTestOptScore : acadRigorScore;
    const acadScore = schoolRigor > 0 && schoolRigor <= athleteAcad ? schoolRigor : 0;
    const gate3 = acadScore > 0;

    if (gate1) g1++;
    if (gate1 && gate2) g2++;
    if (gate1 && gate3) g3++;
    if (gate1 && gate2 && gate3) gAll++;

    // Collect a sample of tier-matching schools for inspection
    if (gate1 && rigorSample.length < 10) {
      rigorSample.push({
        name: s["School Name"] || "?",
        dist: Math.round(dist),
        isTestOpt,
        rawRigor,
        schoolRigor: schoolRigor.toFixed(3),
        athleteAcad: athleteAcad.toFixed(3),
        gate2, gate3,
      });
    }
  }

  console.log("=== GATE COUNTS ===");
  console.log(`  Total schools in DB:                  ${schools.length}`);
  console.log(`  Pass Gate 1 (NCAA Division = ${topTier}): ${g1}`);
  console.log(`  Pass Gate 1+2 (within ${recruitReach} mi):       ${g2}`);
  console.log(`  Pass Gate 1+3 (acad rigor match):     ${g3}`);
  console.log(`  Pass ALL THREE gates:                  ${gAll}`);
  console.log();

  console.log(`=== SAMPLE OF "${topTier}" SCHOOLS (first 10) ===`);
  for (const r of rigorSample) {
    console.log(`  ${r.name.padEnd(35)} dist:${String(r.dist).padStart(5)} mi | testOpt:${r.isTestOpt} | raw:"${r.rawRigor}" | rigor:${r.schoolRigor} | athleteAcad:${r.athleteAcad} | g2:${r.gate2} g3:${r.gate3}`);
  }
}

main().catch(err => { console.error("ERROR:", err.message); process.exit(1); });
