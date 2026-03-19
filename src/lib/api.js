// ── Apps Script Web App URL ────────────────────────────────────────────────────
// Set this after deploying the Apps Script (see /apps-script/Code.gs)
export const API_BASE = import.meta.env.VITE_API_BASE || "";

// Apps Script Web App URLs issue an HTTP redirect. Browsers convert POST → GET
// on redirect, dropping the body. We put all primitive params in the URL so
// doGet can handle the request if the redirect strips the POST body.
function post(action, body = {}) {
  const params = new URLSearchParams({ action });
  Object.entries(body).forEach(([k, v]) => {
    if (v !== null && v !== undefined && typeof v !== "object") params.append(k, v);
  });
  return fetch(`${API_BASE}?${params}`, {
    method: "POST",
    body: JSON.stringify({ action, ...body }),
  });
}

// ── Supabase → Sheet-style key translation ────────────────────────────────────
// Used when fetchSchools() is rewritten to hit Supabase in Step 6.
// Array values mean "set BOTH keys on the output object" — scoring.js uses
// dual-fallback patterns (e.g. row['School Name'] || row['School_Name']).
export const COLUMN_MAP = {
  unitid:                      'UNITID',
  school_name:                 ['School Name', 'School_Name'],
  state:                       'State',
  city:                        'City/Location',
  control:                     'Control',
  school_type:                 'School Type',
  type:                        'Type',
  ncaa_division:               ['NCAA Division', 'NCAA_Division'],
  conference:                  'Conference',
  latitude:                    ['LATITUDE', 'Lat'],
  longitude:                   ['LONGITUDE', 'Lng'],
  admissions_rate:             'Admissions Rate',
  coa_out_of_state:            ['COA (Out-of-State)', 'COA'],
  est_avg_merit:               'Est_Avg_Merit',
  avg_merit_award:             'Avg Merit Award',
  share_stu_any_aid:           'Share_Stu_Any_Aid',
  share_stu_need_aid:          'Share_Stu_Need_Aid',
  need_blind_school:           'Need-Blind School',
  dltv:                        'DLTV',
  adltv:                       'ADLTV',
  adltv_rank:                  'ADLTV Rank',
  graduation_rate:             ['Graduation Rate', 'Grad_Rate'],
  is_test_optional:            'Is_Test_Optional',
  acad_rigor_senior:           'Acad_Rigor_Senior',
  acad_rigor_junior:           'Acad_Rigor_Junior',
  acad_rigor_soph:             'Acad_Rigor_Soph',
  acad_rigor_freshman:         'Acad_Rigor_Freshman',
  acad_rigor_test_opt_senior:  'Acad_Rigor_Test_Opt_Senior',
  acad_rigor_test_opt_junior:  'Acad_Rigor_Test_Opt_Junior',
  acad_rigor_test_opt_soph:    'Acad_Rigor_Test_Opt_Soph',
  acad_rigor_test_opt_freshman:'Acad_Rigor_Test_Opt_Freshman',
  recruiting_q_link:           ['Recruiting Q Link', 'q_link'],
  coach_link:                  ['Coach Page', 'coach_link'],
  prospect_camp_link:          'Prospect Camp Link',
  field_level_questionnaire:   'Field Level Questionnaire',
  avg_gpa:                     'Avg GPA',
  avg_sat:                     'Avg SAT',
};

// Transforms a raw Supabase schools row (snake_case) into the Sheet-style
// key format the frontend expects. Array-valued entries in COLUMN_MAP produce
// multiple keys on the output object so dual-fallback reads in scoring.js work.
export function transformSchoolRow(row) {
  const out = {};
  for (const [col, target] of Object.entries(COLUMN_MAP)) {
    const value = row[col];
    if (Array.isArray(target)) {
      target.forEach(key => { out[key] = value; });
    } else {
      out[target] = value;
    }
  }
  // Pass through any columns not covered by COLUMN_MAP (e.g. last_updated).
  for (const key of Object.keys(row)) {
    if (!(key in COLUMN_MAP)) out[key] = row[key];
  }
  return out;
}

export async function fetchSchools() {
  if (!API_BASE) throw new Error("VITE_API_BASE not set. See README.");
  const res = await fetch(`${API_BASE}?action=db`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.schools || [];
}

export async function fetchTracker() {
  if (!API_BASE) throw new Error("VITE_API_BASE not set. See README.");
  const res = await fetch(`${API_BASE}?action=tracker`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const map = {};
  (data.tracker || []).forEach(t => { map[t.UNITID] = t; });
  return map;
}

// Geocode a high school using Nominatim (OpenStreetMap). Returns { lat, lng, display } or null.
// Strategy: try queries in order of specificity, return first hit.
export async function geocodeHighSchool(name, state) {
  const nameLC = name.toLowerCase();
  const alreadyHasSchool = nameLC.includes("school") || nameLC.includes("academy")
    || nameLC.includes("prep") || nameLC.includes("institute");

  const queries = [];
  if (!alreadyHasSchool) {
    queries.push(`${name} high school, ${state}, USA`);
    queries.push(`${name} School, ${state}, USA`);
  }
  queries.push(`${name}, ${state}, USA`);

  try {
    for (const q of queries) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=us&format=json&limit=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "GritFit-CFBRecruitHub/1.0" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.length) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function checkEmail(email) {
  if (!API_BASE || !email) return { hasAccount: false };
  const res = await fetch(`${API_BASE}?action=checkEmail&email=${encodeURIComponent(email)}`);
  if (!res.ok) return { hasAccount: false };
  return res.json();
}

export async function saveRecruit(profile) {
  if (!API_BASE) throw new Error("VITE_API_BASE not set. See README.");
  const res = await post("saveRecruit", profile);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateRecruit(profile) {
  if (!API_BASE) throw new Error("VITE_API_BASE not set. See README.");
  const res = await post("updateRecruit", profile);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createAccount(email, password, said) {
  if (!API_BASE) throw new Error("VITE_API_BASE not set.");
  const res = await post("createAccount", { email, password, said, userAgent: navigator.userAgent });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function signIn(email, password) {
  if (!API_BASE) throw new Error("VITE_API_BASE not set.");
  const res = await post("signIn", { email, password, userAgent: navigator.userAgent });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function validateToken(said, token) {
  if (!API_BASE || !said || !token) return { ok: false };
  const res = await fetch(`${API_BASE}?action=validateToken&said=${encodeURIComponent(said)}&token=${encodeURIComponent(token)}`);
  if (!res.ok) return { ok: false };
  return res.json();
}

export async function signOut(said, token) {
  if (!API_BASE || !said) return;
  const res = await post("signOut", { said, token, userAgent: navigator.userAgent });
  if (!res.ok) return;
  return res.json();
}

export async function forgotPassword(email) {
  if (!API_BASE) throw new Error("VITE_API_BASE not set.");
  const res = await post("forgotPassword", { email });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function resetPassword(email, code, newPassword) {
  if (!API_BASE) throw new Error("VITE_API_BASE not set.");
  const res = await post("resetPassword", { email, code, newPassword, userAgent: navigator.userAgent });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function saveShortList(said, schools) {
  if (!API_BASE || !said) return;
  const res = await post("saveShortList", { said, schools });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getShortList(said) {
  if (!API_BASE || !said) return { schools: [] };
  const res = await fetch(`${API_BASE}?action=getShortList&said=${encodeURIComponent(said)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function completePendingAccount(said, pendingToken, password) {
  if (!API_BASE) return { error: "No API configured." };
  const res = await post("completePendingAccount", { said, pendingToken, password });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function requestEmailChangeMagicLink(said, sessionToken, newEmail) {
  if (!API_BASE) return { error: "No API configured." };
  const res = await post("requestEmailChangeMagicLink", { said, sessionToken, newEmail });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function resendSetupEmail(email) {
  if (!API_BASE) return { error: "No API configured." };
  const res = await post("resendSetupEmail", { email });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function confirmEmailChangeMagicLink(said, token) {
  if (!API_BASE) return { error: "No API configured." };
  const res = await post("confirmEmailChangeMagicLink", { said, token });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
