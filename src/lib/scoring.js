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
    athFit[tier] = Math.min(1, calcAthleticFit(position, height, weight, speed40, tier) + boost);
  });

  const topTier = TIER_ORDER.find(t => athFit[t] > 0.5) || null;
  const recruitReach = topTier ? RECRUIT_BUDGETS[topTier] : 400;

  const satPct = sat ? getSATPercentile(sat) : null;
  const acadRigorScore   = satPct !== null ? (satPct * 0.5 + 0.3) : 0.3;
  const acadTestOptScore = gpa ? Math.min(1, gpa / 4.0 * 0.9 + 0.1) : 0.3;

  const scored = schools.map(school => {
    const dist = (school.Lat && school.Lng && hsLat && hsLng)
      ? haversine(hsLat, hsLng, school.Lat, school.Lng) : 9999;

    const tierMatch = topTier !== null && school.Type === topTier;

    let acadScore = 0;
    if (school.Test_Optional) {
      acadScore = school.Acad_Test_Opt != null && school.Acad_Test_Opt <= acadTestOptScore
        ? school.Acad_Test_Opt : 0;
    } else {
      acadScore = school.Acad_Rigor_Score != null && school.Acad_Rigor_Score <= acadRigorScore
        ? school.Acad_Rigor_Score : 0;
    }

    const eligible = tierMatch && dist <= recruitReach && acadScore > 0;
    const coa = school["COA (Out-of-State)"] || school.COA || 0;
    const efcResult = (agi && dependents)
      ? calcEFC(agi, dependents, school.Control, school.School_Type)
      : { eligible: false, efc: null };

    const avgMerit = school.Avg_Merit || 0;
    const shareFA  = school.Share_Stu_Any_Aid || 0;
    const meritLikelihood = shareFA && school.Share_Pure_Need
      ? Math.min(1, shareFA / (school.Share_Pure_Need * 0.55)) : 0;

    const conf = school.Conference || "";
    const div  = school.NCAA_Division || "";
    let athSchol = 0;
    if (!["Ivy League","Pioneer"].includes(conf)) {
      if (div==="1-FBS") athSchol = coa;
      else if (div==="1-FCS") athSchol = coa * 0.6;
      else if (div==="2-Div II") athSchol = coa * 0.3;
    }

    const efc = efcResult.efc || 0;
    const netCost = efcResult.eligible
      ? Math.max(0, ((efc*4)*1.18) - Math.min(coa-efc, avgMerit*meritLikelihood))
      : null;

    const dltv     = school.DLTV || 0;
    const gradRate = school.Grad_Rate || 0;
    const adltv    = dltv * gradRate;
    const droi     = netCost > 0 ? Math.min(100, adltv/netCost) : (netCost===0 ? 100 : null);
    const breakEven = droi ? 40/droi : null;
    const tracker  = trackerMap[school.UNITID] || {};

    return {
      ...school, dist: Math.round(dist), eligible, acadScore,
      athFitScore: athFit[school.Type] || 0,
      efcEligible: efcResult.eligible, efc, athSchol, avgMerit,
      meritLikelihood: Math.round(meritLikelihood*100),
      netCost, dltv, gradRate, adltv, droi, breakEven, tracker,
    };
  });

  const top30 = scored
    .filter(s => s.eligible)
    .sort((a,b) => b.acadScore - a.acadScore)
    .slice(0, 30);

  return { top30, scored, athFit, topTier, recruitReach, acadRigorScore, acadTestOptScore };
}
