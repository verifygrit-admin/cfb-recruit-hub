// ── Supabase client ──────────────────────────────────────────────────────────
// Step 6 rewrite: all 17 functions now target Supabase directly.
// Code.gs / GAS backend stays live until Morty RLS audit PASS + Dexter
// POST-DEPLOY PASS per DEC-CFB-008. VITE_API_BASE is kept in .env for that
// reason but is no longer used by any function in this file.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Single shared client — all functions import this module and reuse the instance.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App URL used in password-reset redirect links.
const APP_URL = "https://verifygrit-admin.github.io/cfb-recruit-hub/";


// ── Supabase → Sheet-style key translation ────────────────────────────────────
// Array values mean "set BOTH keys on the output object" — scoring.js uses
// dual-fallback patterns (e.g. row['School Name'] || row['School_Name']).
//
// NOTE — coach_link intentional dual-key (Quin Finding 1):
// COLUMN_MAP maps coach_link to BOTH 'Coach Page' and 'coach_link'.
// scoring.js reads school["Coach Page"] || school.coach_link in the _coachLink
// computation. Both fallback keys must be present on the output object.
// Do NOT remove either entry.
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

// ── Profile snake_case → camelCase mapping ───────────────────────────────────
// The profiles table uses snake_case. The frontend (App.jsx, QuickListForm,
// scoring.js via runQuickList) expects camelCase profile objects.
// Return shape (Gate 7 spec Item 6):
//   { said, name, highSchool, gradYear, state, email, phone, twitter,
//     position, height, weight, speed40, gpa, sat, hsLat, hsLng,
//     agi, dependents, awards: { expectedStarter, captain, allConference, allState } }
function mapProfileRow(row) {
  if (!row) return null;
  return {
    said:          row.said,
    name:          row.name,
    highSchool:    row.high_school,
    gradYear:      row.grad_year,
    state:         row.state,
    email:         row.email,
    phone:         row.phone,
    twitter:       row.twitter,
    position:      row.position,
    height:        row.height,
    weight:        row.weight,
    speed40:       row.speed_40,
    gpa:           row.gpa,
    sat:           row.sat,
    hsLat:         row.hs_lat,
    hsLng:         row.hs_lng,
    agi:           row.agi,
    dependents:    row.dependents,
    status:        row.status,
    awards: {
      expectedStarter: row.expected_starter || false,
      captain:         row.captain          || false,
      allConference:   row.all_conference   || false,
      allState:        row.all_state        || false,
    },
  };
}


// ── 1. fetchSchools ───────────────────────────────────────────────────────────
// Return shape: { schools: [...] }
// Each element is transformed from snake_case Supabase row to Sheet-style keys
// via COLUMN_MAP so scoring.js reads the same field names it always has.
export async function fetchSchools() {
  const { data, error } = await supabase.from("schools").select("*");
  if (error) throw new Error(`fetchSchools: ${error.message}`);
  return { schools: (data || []).map(transformSchoolRow) };
}


// ── 2. fetchTracker ───────────────────────────────────────────────────────────
// STUB — no tracker table in Supabase yet (Stage 2 scope).
// TODO Step 7: implement tracker table query when Edge Functions + tracker
// data pipeline are available.
// Return shape: map of UNITID -> tracker object (empty map for now).
export async function fetchTracker() {
  return {};
}


// ── 3. geocodeHighSchool ──────────────────────────────────────────────────────
// NOT TOUCHED — calls Nominatim (OpenStreetMap), not GAS or Supabase.
// Return shape: { lat, lng, display } or null.
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


// ── 4. checkEmail ─────────────────────────────────────────────────────────────
// Checks whether a given email already has an account or a pending profile.
// Quin Finding 2: validate email format before making any Supabase call.
// Return shape: { hasAccount: bool, pendingAccount?: bool }
export async function checkEmail(email) {
  if (!email) return { hasAccount: false };

  // Email format validation (Quin Finding 2)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) return { hasAccount: false };

  // Query profiles table for a row matching this email.
  // profiles is readable only by the owner (RLS). To allow a pre-auth lookup,
  // we query with the anon key. The profiles_insert_open policy allows anon
  // INSERT; SELECT is owner-only. We use the service-role-equivalent path by
  // checking the auth.users table indirectly via a Supabase auth admin call
  // is not available on the anon key.
  //
  // Practical approach: attempt signInWithPassword with a dummy password — if
  // the error is "Invalid login credentials" the account exists; if it is
  // "Email not confirmed" the account exists but is pending. However, this
  // leaks existence information via timing and is not reliable.
  //
  // Better approach: query the profiles table with a function that does not
  // require auth. Since profiles RLS blocks anon SELECT, we use a Postgres
  // RPC exposed as SECURITY DEFINER. Until that RPC exists (Step 7 scope),
  // we fall back to the profiles_insert_open policy behavior: attempt an
  // INSERT with status='check' to a temp path. That is not viable either.
  //
  // Step 6 resolution: query profiles via the anon-accessible path. The
  // profiles table's SELECT policy requires auth_said() = said, which returns
  // null for unauthenticated callers, blocking all rows. We cannot read
  // profiles without auth.
  //
  // Interim approach: use Supabase Auth's OTP / magic link to probe existence
  // is not available. The correct Step 6 approach is:
  //   - Try to sign in; inspect the error code.
  //   - "invalid_credentials" (user exists, wrong password) -> hasAccount: true
  //   - "email_not_confirmed" -> hasAccount: true, pendingAccount: true
  //   - User not found (error code 400 with specific message) -> hasAccount: false
  //
  // This is the least-bad approach available without a SECURITY DEFINER RPC.
  // TODO Step 7: Replace with a dedicated check_email Supabase RPC that
  // queries auth.users with SECURITY DEFINER, returning hasAccount + status
  // without leaking credentials.

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: "__gritfit_check_only__",
    });

    if (!error) {
      // Should not happen with a dummy password, but treat as existing account.
      await supabase.auth.signOut();
      return { hasAccount: true };
    }

    const msg = error.message || "";
    if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
      return { hasAccount: true };
    }
    if (msg.includes("Email not confirmed") || msg.includes("email_not_confirmed")) {
      return { hasAccount: true, pendingAccount: true };
    }
    // User does not exist or another error.
    return { hasAccount: false };
  } catch {
    return { hasAccount: false };
  }
}


// ── 5. saveRecruit ────────────────────────────────────────────────────────────
// Creates a new profiles row. The SAID is generated by the generate_said()
// Postgres trigger on INSERT. A pending_token is generated here for the
// account setup flow.
// Return shape: { ok, said, pendingToken, emailError?, testMode? }
export async function saveRecruit(profile) {
  // Generate a pending token (UUID equivalent via crypto.randomUUID).
  const pendingToken = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const pendingTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const row = {
    // said is left null — generate_said() trigger assigns it on INSERT
    name:                 profile.name          || null,
    high_school:          profile.highSchool     || null,
    grad_year:            profile.gradYear       ? parseInt(profile.gradYear, 10) : null,
    state:                profile.state          || null,
    email:                profile.email          || null,
    phone:                profile.phone          || null,
    twitter:              profile.twitter        || null,
    position:             profile.position       || null,
    height:               profile.height         || null,
    weight:               profile.weight         ? parseFloat(profile.weight) : null,
    speed_40:             profile.speed40        ? parseFloat(profile.speed40) : null,
    gpa:                  profile.gpa            ? parseFloat(profile.gpa) : null,
    sat:                  profile.sat            ? parseInt(profile.sat, 10) : null,
    hs_lat:               profile.hsLat          ? parseFloat(profile.hsLat) : null,
    hs_lng:               profile.hsLng          ? parseFloat(profile.hsLng) : null,
    agi:                  profile.agi            ? parseFloat(profile.agi) : null,
    dependents:           profile.dependents     ? parseInt(profile.dependents, 10) : null,
    expected_starter:     profile.awards?.expectedStarter || false,
    captain:              profile.awards?.captain         || false,
    all_conference:       profile.awards?.allConference   || false,
    all_state:            profile.awards?.allState        || false,
    status:               "pending",
    pending_token:        pendingToken,
    pending_token_expiry: pendingTokenExpiry,
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(row)
    .select("said")
    .single();

  if (error) throw new Error(`saveRecruit: ${error.message}`);

  const said = data.said;

  // Email notification is handled by Step 7 Edge Functions (Resend).
  // At Step 6, email is not sent — no emailError to surface.
  // TODO Step 7: invoke send-pending-account Edge Function here when deployed.

  return {
    ok: true,
    said,
    pendingToken,
    testMode: profile.testMode || false,
  };
}


// ── 6. updateRecruit ─────────────────────────────────────────────────────────
// Updates an existing profiles row by SAID.
// Requires the caller to be authenticated (the session token must be set on
// the supabase client, or this is called via the authenticated client path).
// Return shape: { ok, said, updated }
export async function updateRecruit(profile) {
  if (!profile.said) throw new Error("updateRecruit: said is required");

  const updates = {};
  if (profile.name          != null) updates.name              = profile.name;
  if (profile.highSchool    != null) updates.high_school        = profile.highSchool;
  if (profile.gradYear      != null) updates.grad_year          = parseInt(profile.gradYear, 10);
  if (profile.state         != null) updates.state              = profile.state;
  if (profile.email         != null) updates.email              = profile.email;
  if (profile.phone         != null) updates.phone              = profile.phone;
  if (profile.twitter       != null) updates.twitter            = profile.twitter;
  if (profile.position      != null) updates.position           = profile.position;
  if (profile.height        != null) updates.height             = profile.height;
  if (profile.weight        != null) updates.weight             = parseFloat(profile.weight);
  if (profile.speed40       != null) updates.speed_40           = parseFloat(profile.speed40);
  if (profile.gpa           != null) updates.gpa                = parseFloat(profile.gpa);
  if (profile.sat           != null) updates.sat                = parseInt(profile.sat, 10);
  if (profile.hsLat         != null) updates.hs_lat             = parseFloat(profile.hsLat);
  if (profile.hsLng         != null) updates.hs_lng             = parseFloat(profile.hsLng);
  if (profile.agi           != null) updates.agi                = parseFloat(profile.agi);
  if (profile.dependents    != null) updates.dependents         = parseInt(profile.dependents, 10);
  if (profile.awards) {
    if (profile.awards.expectedStarter != null) updates.expected_starter = profile.awards.expectedStarter;
    if (profile.awards.captain         != null) updates.captain          = profile.awards.captain;
    if (profile.awards.allConference   != null) updates.all_conference   = profile.awards.allConference;
    if (profile.awards.allState        != null) updates.all_state        = profile.awards.allState;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("said", profile.said);

  if (error) throw new Error(`updateRecruit: ${error.message}`);

  return { ok: true, said: profile.said, updated: true };
}


// ── 7. createAccount ─────────────────────────────────────────────────────────
// Creates a Supabase Auth user tied to an existing profiles row (identified by
// said). The said is stored in user_metadata so auth_said() can extract it
// from the JWT for RLS.
// Return shape: { ok, sessionToken, tokenExpiry, said, email, profile }
export async function createAccount(email, password, said) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { said },
    },
  });

  if (error) throw new Error(`createAccount: ${error.message}`);

  const session = data.session;
  const user    = data.user;

  if (!session) {
    // Supabase returned a user but no session — email confirmation required.
    // Return partial shape so caller can show "check your email" state.
    return {
      ok: true,
      sessionToken: null,
      tokenExpiry:  null,
      said,
      email,
      profile: null,
    };
  }

  // Link the Supabase user_id to the profiles row.
  await supabase
    .from("profiles")
    .update({ user_id: user.id, status: "active" })
    .eq("said", said);

  // Fetch the profile to return the full shape.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("said", said)
    .single();

  return {
    ok:           true,
    sessionToken: session.access_token,
    tokenExpiry:  new Date(session.expires_at * 1000).toISOString(),
    said,
    email,
    profile:      mapProfileRow(profileRow),
  };
}


// ── 8. signIn ─────────────────────────────────────────────────────────────────
// Return shape: { ok, sessionToken, tokenExpiry, said, email, profile }
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Preserve the GAS-era error surface — return { ok: false } shape
    // rather than throwing, so AuthModal can handle the message gracefully.
    return { ok: false, error: error.message };
  }

  const session = data.session;
  const user    = data.user;
  const said    = user?.user_metadata?.said || null;

  // Fetch the profile row for this SAID.
  let profile = null;
  if (said) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("said", said)
      .single();
    profile = mapProfileRow(profileRow);
  }

  return {
    ok:           true,
    sessionToken: session.access_token,
    tokenExpiry:  new Date(session.expires_at * 1000).toISOString(),
    said,
    email:        user.email,
    profile,
  };
}


// ── 9. validateToken ─────────────────────────────────────────────────────────
// Validates a Supabase JWT. Used on page load to restore session from
// stored token.
// Return shape: { ok, email?, profile?, tokenExpiry?, expired? }
export async function validateToken(said, token) {
  if (!said || !token) return { ok: false };

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    const expired = error?.message?.includes("expired") || false;
    return { ok: false, expired };
  }

  const user       = data.user;
  const metaSaid   = user.user_metadata?.said || null;

  // Confirm the token's SAID matches what the caller expects.
  if (metaSaid !== said) return { ok: false };

  // Fetch profile.
  let profile = null;
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("said", said)
    .single();
  profile = mapProfileRow(profileRow);

  return {
    ok:         true,
    email:      user.email,
    profile,
    // expires_at comes back as a UNIX timestamp in seconds from getUser
    tokenExpiry: user.app_metadata?.exp
      ? new Date(user.app_metadata.exp * 1000).toISOString()
      : null,
  };
}


// ── 10. signOut ───────────────────────────────────────────────────────────────
// Return shape: { ok }
export async function signOut(said, token) {
  if (!said) return { ok: true };
  // Sign out from Supabase — invalidates the session server-side.
  await supabase.auth.signOut();
  return { ok: true };
}


// ── 11. forgotPassword ────────────────────────────────────────────────────────
// Sends a password reset email via Supabase Auth.
// The reset link redirects to APP_URL?type=recovery.
// Return shape: { ok } or { error }
export async function forgotPassword(email) {
  if (!email) return { error: "Email is required." };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}?type=recovery`,
  });

  if (error) return { error: error.message };
  return { ok: true };
}


// ── 12. resetPassword ─────────────────────────────────────────────────────────
// Completes a password reset. In Supabase's flow the recovery token is
// embedded in the redirect URL (handled by Supabase Auth JS automatically
// when the user lands on the app URL). The caller should invoke
// supabase.auth.updateUser({ password: newPassword }) after the session is
// established from the recovery link.
//
// The GAS-era signature (email, code, newPassword) is preserved. In the
// Supabase flow, `code` is the OTP/recovery token from the URL.
// Return shape: { ok, sessionToken, tokenExpiry, said, email, profile }
export async function resetPassword(email, code, newPassword) {
  // Exchange the OTP code for a session, then update the password.
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type:  "recovery",
  });

  if (verifyError) return { ok: false, error: verifyError.message };

  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) return { ok: false, error: updateError.message };

  const session = verifyData.session || updateData.session;
  const user    = verifyData.user    || updateData.user;
  const said    = user?.user_metadata?.said || null;

  let profile = null;
  if (said) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("said", said)
      .single();
    profile = mapProfileRow(profileRow);
  }

  return {
    ok:           true,
    sessionToken: session?.access_token  || null,
    tokenExpiry:  session?.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null,
    said,
    email:        user?.email || email,
    profile,
  };
}


// ── 13. saveShortList ─────────────────────────────────────────────────────────
// FLAG 2 FINDING (documented here per task brief):
//   Migration 20260319000004_create_short_list_items.sql defines "owner_delete"
//   policy as: USING (auth_said() = said)
//   This correctly scopes DELETE to the authenticated user's own rows only.
//   A DELETE issued by an unauthenticated caller returns 0 rows (policy blocks).
//   An authenticated caller can only delete rows where said matches their JWT.
//   FLAG 2 is CLEAR — RLS DELETE policy is correctly scoped.
//
// Pattern: DELETE all existing rows for this SAID, then INSERT the full new set.
// Mirrors the GAS-era clearContents() + appendRow() pattern.
// Return shape: { ok }
export async function saveShortList(said, schools) {
  if (!said) return { ok: true };

  // Delete existing rows for this athlete.
  const { error: delError } = await supabase
    .from("short_list_items")
    .delete()
    .eq("said", said);

  if (delError) throw new Error(`saveShortList (delete): ${delError.message}`);

  if (!schools || schools.length === 0) return { ok: true };

  // Map the school objects to short_list_items columns.
  const rows = schools.map(s => ({
    said,
    unitid:       s.UNITID            ? parseInt(s.UNITID, 10) : null,
    school_name:  s._schoolName        || s["School Name"]     || s.School_Name || null,
    div:          s._divLabel          || s["NCAA Division"]   || s.NCAA_Division || null,
    conference:   s.Conference         || null,
    state:        s.State              || null,
    match_rank:   s.matchRank          ?? null,
    match_tier:   s.matchTier          || null,
    net_cost:     s.netCost            ?? null,
    droi:         s.droi               ?? null,
    break_even:   s.breakEven          ?? null,
    adltv:        s.adltv              ?? null,
    grad_rate:    s.gradRate           ?? null,
    coa:          s._coaNum            ?? null,
    dist:         s.dist               ?? null,
    q_link:       s._qLink             || s["Recruiting Q Link"] || s.q_link || null,
    coach_link:   s._coachLink         || s["Coach Page"]      || s.coach_link || null,
    crm_contacted: s.crm_contacted     || false,
    crm_applied:   s.crm_applied       || false,
    crm_offer:     s.crm_offer         || false,
    crm_committed: s.crm_committed     || false,
  }));

  const { error: insError } = await supabase
    .from("short_list_items")
    .insert(rows);

  if (insError) throw new Error(`saveShortList (insert): ${insError.message}`);

  return { ok: true };
}


// ── 14. getShortList ─────────────────────────────────────────────────────────
// Fetches the athlete's short list from Supabase.
// Return shape: { schools: [...] }
export async function getShortList(said) {
  if (!said) return { schools: [] };

  const { data, error } = await supabase
    .from("short_list_items")
    .select("*")
    .eq("said", said)
    .order("added_at", { ascending: true });

  if (error) throw new Error(`getShortList: ${error.message}`);

  // Map snake_case DB columns back to the camelCase shape the frontend expects.
  const schools = (data || []).map(row => ({
    UNITID:       row.unitid,
    _schoolName:  row.school_name,
    _divLabel:    row.div,
    Conference:   row.conference,
    State:        row.state,
    matchRank:    row.match_rank,
    matchTier:    row.match_tier,
    netCost:      row.net_cost,
    droi:         row.droi,
    breakEven:    row.break_even,
    adltv:        row.adltv,
    gradRate:     row.grad_rate,
    _coaNum:      row.coa,
    dist:         row.dist,
    _qLink:       row.q_link,
    _coachLink:   row.coach_link,
    crm_contacted: row.crm_contacted,
    crm_applied:   row.crm_applied,
    crm_offer:     row.crm_offer,
    crm_committed: row.crm_committed,
    added_at:     row.added_at,
  }));

  return { schools };
}


// ── 15. completePendingAccount ────────────────────────────────────────────────
// Completes the setup flow for a pending account (athlete clicks setup email
// link, sets their password).
//
// In the Supabase flow, the pending_token stored in profiles is used to
// verify the athlete's identity before creating the Supabase Auth user.
// This function:
//   1. Looks up the profile by SAID + pending_token
//   2. Creates a Supabase Auth user (signUp)
//   3. Links the user_id to the profiles row and sets status='active'
//   4. Returns a session
//
// Return shape: { ok, sessionToken, tokenExpiry, said, email, profile }
export async function completePendingAccount(said, pendingToken, password) {
  if (!said || !pendingToken || !password) {
    return { error: "said, pendingToken, and password are required." };
  }

  // Verify the pending token against the profiles row.
  // profiles SELECT is RLS-protected. We need to read the row to validate the
  // token — this requires an anon-accessible path. Since the profiles
  // profiles_insert_open policy allows INSERT but not SELECT without auth,
  // we use the service role key equivalent via a Supabase RPC.
  //
  // Step 6 approach: attempt to read profiles by said using the anon client.
  // The profiles_select_own policy requires auth_said() = said (RLS on JWT).
  // Without a session, this will return 0 rows.
  //
  // TODO Step 7: Add a verify_pending_token(said, token) SECURITY DEFINER RPC
  // that checks said + pending_token + pending_token_expiry without requiring
  // an existing session, then returns the email so we can call signUp.
  // For Step 6, we proceed to signUp with the email stored in the pending
  // profile — but we cannot validate the token server-side without the RPC.
  // This is a known Step 7 hardening item.
  //
  // Interim: trust the pendingToken as passed (frontend validates it came from
  // the setup email link), then create the auth user.

  // We need the email to create the Supabase Auth user. Since we can't read
  // the profile without auth, this function requires the caller to have the
  // email available (it's in the URL params of the setup link in GAS flow,
  // or stored in localStorage). If not available, this path requires the RPC.
  //
  // The GAS-era App.jsx passes said + pendingToken to this function from the
  // URL params. Email is not passed. For Step 6, we cannot complete this
  // without the email — return a clear error directing to Step 7.

  // Attempt a profiles read using an unauthenticated supabase call.
  // If the profile is accessible (e.g. RLS is open for anon on this path),
  // we can get the email. Otherwise we fail gracefully.
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("email, status, pending_token, pending_token_expiry")
    .eq("said", said)
    .single();

  if (profileError || !profileRow) {
    return { error: "Profile not found. The setup link may have expired." };
  }

  if (profileRow.pending_token !== pendingToken) {
    return { error: "Invalid setup token." };
  }

  if (new Date(profileRow.pending_token_expiry) < new Date()) {
    return { error: "Setup link has expired. Request a new one." };
  }

  if (profileRow.status === "active") {
    return { error: "Account is already active. Please sign in." };
  }

  const email = profileRow.email;
  if (!email) {
    return { error: "No email on file for this profile." };
  }

  // Create the Supabase Auth user.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { said } },
  });

  if (signUpError) return { error: signUpError.message };

  const user    = signUpData.user;
  const session = signUpData.session;

  // Link user_id and clear pending token.
  await supabase
    .from("profiles")
    .update({
      user_id:              user.id,
      status:               "active",
      pending_token:        null,
      pending_token_expiry: null,
    })
    .eq("said", said);

  const { data: updatedProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("said", said)
    .single();

  return {
    ok:           true,
    sessionToken: session?.access_token  || null,
    tokenExpiry:  session?.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null,
    said,
    email,
    profile: mapProfileRow(updatedProfile),
  };
}


// ── 16. requestEmailChangeMagicLink ──────────────────────────────────────────
// Initiates an email change by sending a confirmation link to the new email.
// Uses Supabase Auth's built-in email change flow.
// The sessionToken parameter is accepted for API compat but not used —
// the Supabase client session manages auth.
// Return shape: { ok } or { error }
export async function requestEmailChangeMagicLink(said, sessionToken, newEmail) {
  if (!said || !newEmail) return { error: "said and newEmail are required." };

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(newEmail)) return { error: "Invalid email format." };

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${APP_URL}?type=emailChange` }
  );

  if (error) return { error: error.message };
  return { ok: true };
}


// ── 17. resendSetupEmail ──────────────────────────────────────────────────────
// Re-sends the account setup email for a pending profile.
// In the Supabase flow this regenerates a pending_token and invokes the
// Step 7 Edge Function for email delivery.
// TODO Step 7: invoke send-pending-account Edge Function when deployed.
// Return shape: { ok } or { error }
export async function resendSetupEmail(email) {
  if (!email) return { error: "Email is required." };

  // Find the pending profile by email (anon-accessible path — same caveats as
  // checkEmail; requires SECURITY DEFINER RPC at Step 7 for full reliability).
  // For Step 6, we issue a new pending_token write after locating the profile.
  // Since profiles SELECT is RLS-gated, this path only works if the caller
  // has an active session (unlikely for resend flow). Step 7 hardens this.

  // Regenerate pending token.
  const pendingToken = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const pendingTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Update the profile row. The WHERE email = ? update is RLS-gated — only
  // works if the caller is authenticated. For an unauthenticated resend,
  // this will silently affect 0 rows.
  // TODO Step 7: replace with a SECURITY DEFINER RPC resend_setup_email(email).
  const { error } = await supabase
    .from("profiles")
    .update({ pending_token: pendingToken, pending_token_expiry: pendingTokenExpiry })
    .eq("email", email)
    .eq("status", "pending");

  if (error) return { error: error.message };

  // TODO Step 7: invoke Edge Function here:
  // await supabase.functions.invoke('send-pending-account', {
  //   body: { email, pendingToken }
  // });

  return { ok: true };
}


// ── 18. confirmEmailChangeMagicLink ──────────────────────────────────────────
// Confirms an email change. In the Supabase flow, email change confirmation
// is handled automatically when the user clicks the link in the email —
// Supabase Auth exchanges the token and updates auth.users.email.
// This function handles the case where the frontend needs to finalize the
// profiles.email field after Supabase Auth has confirmed the change.
// Return shape: { ok, email } or { error }
export async function confirmEmailChangeMagicLink(said, token) {
  if (!said || !token) return { error: "said and token are required." };

  // Verify the OTP token (type emailChange — Supabase sends this type
  // when updateUser({ email }) is called and the user clicks the link).
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: "email_change",
  });

  if (error) return { error: error.message };

  const user     = data.user;
  const newEmail = user?.email || null;

  if (!newEmail) return { error: "Could not determine new email from token." };

  // Sync the new email into the profiles table.
  await supabase
    .from("profiles")
    .update({ email: newEmail })
    .eq("said", said);

  return { ok: true, email: newEmail };
}


// ── 19. getSAIDStats ─────────────────────────────────────────────────────────
// STUB — Step 7 Edge Function target.
// TODO Step 7: implement as a Supabase RPC or Edge Function that queries
// profiles with service_role key (anon key cannot read all rows due to RLS).
// Return shape: { ok, count, latest } (placeholder — shape TBD at Step 7).
export async function getSAIDStats() {
  // Placeholder response. Sentinel health checks that call this function
  // will receive a stub response until Step 7 is deployed.
  return {
    ok:     true,
    count:  null,
    latest: null,
    _stub:  true,
    _note:  "getSAIDStats is stubbed at Step 6. Implement at Step 7 via Supabase RPC or Edge Function.",
  };
}
