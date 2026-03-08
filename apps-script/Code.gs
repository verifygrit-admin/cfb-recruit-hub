// ── GRIT FIT — CFB Recruit Hub — Apps Script Web App ──────────────────────────
// Deploy as: Execute as Me | Anyone (even anonymous) can access
// After deploying, copy the Web App URL into VITE_API_BASE in your .env file.

// ── CONFIGURATION ──────────────────────────────────────────────────────────────
const GRITTY_DB_SHEET_ID  = "1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo";
const DB_TAB_NAME         = "GrittyOS DB";   // sheet tab with school data
const TRACKER_TAB_NAME    = "Tracker";       // optional: recruitment tracker tab
const RECRUITS_TAB_NAME   = "Recruits";      // where recruit profiles are saved

// ── ROUTER ─────────────────────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action || "db";
  try {
    if (action === "db")            return jsonResponse(getDB());
    if (action === "tracker")       return jsonResponse(getTracker());
    if (action === "getShortList")  return jsonResponse(getShortList(e.parameter.said));
    if (action === "validateToken") return jsonResponse(validateToken(e.parameter.said, e.parameter.token));
    return jsonResponse({ error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  const action = e.parameter.action || "";
  try {
    const body = e.postData ? JSON.parse(e.postData.contents) : {};
    if (action === "saveRecruit")   return jsonResponse(saveRecruit(body));
    if (action === "updateRecruit") return jsonResponse(updateRecruit(body));
    if (action === "saveShortList") return jsonResponse(saveShortList(body));
    if (action === "createAccount") return jsonResponse(createAccount(body));
    if (action === "signIn")        return jsonResponse(signIn(body));
    if (action === "signOut")       return jsonResponse(signOut(body));
    if (action === "forgotPassword")return jsonResponse(forgotPassword(body));
    if (action === "resetPassword") return jsonResponse(resetPassword(body));
    return jsonResponse({ error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── HANDLERS ───────────────────────────────────────────────────────────────────

function getDB() {
  const ss     = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  const sheet  = ss.getSheetByName(DB_TAB_NAME);
  if (!sheet) throw new Error(`Tab "${DB_TAB_NAME}" not found`);

  const [headers, ...rows] = sheet.getDataRange().getValues();

  const schools = rows
    .filter(r => r[0]) // skip blank rows
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = r[i]; });
      return obj;
    });

  return { schools };
}

function getTracker() {
  const ss    = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  const sheet = ss.getSheetByName(TRACKER_TAB_NAME);
  if (!sheet) return { tracker: [] };

  const [headers, ...rows] = sheet.getDataRange().getValues();
  const tracker = rows
    .filter(r => r[0])
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = r[i]; });
      return obj;
    });

  return { tracker };
}

function generateSAID(sheet) {
  const year    = new Date().getFullYear();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    // Only header row (or empty) — start at 0005
    return "GRIT-" + year + "-0005";
  }

  // Read last SAID from column A of the last data row
  const lastSAID = String(sheet.getRange(lastRow, 1).getValue() || "");
  if (lastSAID.startsWith("GRIT-")) {
    const parts   = lastSAID.split("-");           // ["GRIT","2026","0099"]
    const lastNum = parseInt(parts[2], 10) || 4;   // parse the 4-digit counter
    const nextNum = lastNum + 1;
    return "GRIT-" + year + "-" + String(nextNum).padStart(4, "0");
  }

  // Fallback if last row has no valid SAID
  return "GRIT-" + year + "-0005";
}

function saveRecruit(profile) {
  const ss    = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  let sheet   = ss.getSheetByName(RECRUITS_TAB_NAME);

  // Create tab if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(RECRUITS_TAB_NAME);
    const headers = [
      "SAID","timestamp","name","highSchool","gradYear","state","email","phone","twitter",
      "position","height","weight","speed40",
      "gpa","sat","hsLat","hsLng","agi","dependents",
      "expectedStarter","captain","allConference","allState",
    ];
    sheet.appendRow(headers);
  }

  const said = generateSAID(sheet);

  sheet.appendRow([
    said,
    new Date().toISOString(),
    profile.name || "",
    profile.highSchool || "",
    profile.gradYear || "",
    profile.state || "",
    profile.email || "",
    profile.phone || "",
    profile.twitter || "",
    profile.position || "",
    profile.height || "",
    profile.weight || "",
    profile.speed40 || "",
    profile.gpa || "",
    profile.sat || "",
    profile.hsLat || "",
    profile.hsLng || "",
    profile.agi || "",
    profile.dependents || "",
    profile.awards?.expectedStarter ? "TRUE" : "",
    profile.awards?.captain         ? "TRUE" : "",
    profile.awards?.allConference   ? "TRUE" : "",
    profile.awards?.allState        ? "TRUE" : "",
  ]);

  return { ok: true, said };
}

function updateRecruit(profile) {
  const ss    = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  const sheet = ss.getSheetByName(RECRUITS_TAB_NAME);
  if (!sheet) return saveRecruit(profile); // tab doesn't exist yet — fall back to insert

  const said = profile.said;
  if (!said) return { error: "No SAID provided for update" };

  const lastRow = sheet.getLastRow();
  for (let row = 2; row <= lastRow; row++) {
    const cellVal = String(sheet.getRange(row, 1).getValue() || "");
    if (cellVal === said) {
      sheet.getRange(row, 1, 1, 23).setValues([[
        said,
        new Date().toISOString(),
        profile.name || "",
        profile.highSchool || "",
        profile.gradYear || "",
        profile.state || "",
        profile.email || "",
        profile.phone || "",
        profile.twitter || "",
        profile.position || "",
        profile.height || "",
        profile.weight || "",
        profile.speed40 || "",
        profile.gpa || "",
        profile.sat || "",
        profile.hsLat || "",
        profile.hsLng || "",
        profile.agi || "",
        profile.dependents || "",
        profile.awards?.expectedStarter ? "TRUE" : "",
        profile.awards?.captain         ? "TRUE" : "",
        profile.awards?.allConference   ? "TRUE" : "",
        profile.awards?.allState        ? "TRUE" : "",
      ]]);
      return { ok: true, said, updated: true };
    }
  }

  // SAID not found — fall back to insert
  return saveRecruit(profile);
}

function getShortList(said) {
  if (!said) return { schools: [] };
  const ss    = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  const sheet = ss.getSheetByName("SL-" + said);
  if (!sheet) return { schools: [] };
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const schools = rows.filter(r => r[0]).map(r => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = r[i]; });
    return obj;
  });
  return { schools };
}

function saveShortList(payload) {
  const { said, schools } = payload;
  if (!said) return { error: "No SAID provided" };
  const ss      = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  const tabName = "SL-" + said;
  let sheet     = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  } else {
    sheet.clearContents();
  }
  const headers = [
    "unitid","schoolName","div","conference","state","dist",
    "netCost","droi","breakEven","adltv","gradRate","coa",
    "matchRank","matchTier","qLink","coachLink",
    "crm_contacted","crm_applied","crm_offer","crm_committed","addedAt",
  ];
  sheet.appendRow(headers);
  (schools || []).forEach(s => {
    sheet.appendRow([
      s.UNITID        || "",
      s._schoolName   || "",
      s._divLabel     || "",
      s.Conference    || "",
      s.State         || "",
      s.dist          != null ? s.dist      : "",
      s.netCost       != null ? s.netCost   : "",
      s.droi          != null ? s.droi      : "",
      s.breakEven     != null ? s.breakEven : "",
      s.adltv         != null ? s.adltv     : "",
      s.gradRate      != null ? s.gradRate  : "",
      s._coaNum       || "",
      s.matchRank     || "",
      s.matchTier     || "",
      s._qLink        || "",
      s._coachLink    || "",
      s.crm_contacted  ? "TRUE" : "",
      s.crm_applied    ? "TRUE" : "",
      s.crm_offer      ? "TRUE" : "",
      s.crm_committed  ? "TRUE" : "",
      s.addedAt        || new Date().toISOString(),
    ]);
  });
  return { ok: true };
}

// ── AUTH HELPERS ────────────────────────────────────────────────────────────────

function getOrCreateAuthSheet() {
  const ss = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  let sheet = ss.getSheetByName("Auth");
  if (!sheet) {
    sheet = ss.insertSheet("Auth");
    sheet.appendRow([
      "SAID","email","passwordHash","salt","sessionToken","tokenExpiry",
      "resetCode","resetExpiry","createdAt","lastLogin","lastLogout","loginCount"
    ]);
  }
  return sheet;
}

function getOrCreateAuthLogSheet() {
  const ss = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  let sheet = ss.getSheetByName("AuthLog");
  if (!sheet) {
    sheet = ss.insertSheet("AuthLog");
    sheet.appendRow(["logId","SAID","email","event","timestamp","userAgent"]);
  }
  return sheet;
}

// Find row (1-indexed) by value in a given column; returns -1 if not found
function findAuthRow(sheet, col, value) {
  const last = sheet.getLastRow();
  if (last <= 1) return -1;
  const data = sheet.getRange(2, col, last - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(value).trim()) return i + 2;
  }
  return -1;
}

function hashPassword(salt, password) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + password,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
}

function newTokenExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 180); // 180-day rolling session
  return d.toISOString();
}

function logAuth(said, email, event, userAgent) {
  try {
    const sheet = getOrCreateAuthLogSheet();
    sheet.appendRow([Utilities.getUuid(), said, email, event, new Date().toISOString(), userAgent || ""]);
  } catch(e) {} // non-fatal
}

function updateRecruitAuthFields(said, eventType) {
  const ss    = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  const sheet = ss.getSheetByName(RECRUITS_TAB_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  let targetRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(said)) { targetRow = i + 2; break; }
  }
  if (targetRow < 0) return;
  // Ensure header cols 24/25/26 exist
  if (!sheet.getRange(1, 24).getValue()) sheet.getRange(1, 24).setValue("lastLogin");
  if (!sheet.getRange(1, 25).getValue()) sheet.getRange(1, 25).setValue("lastLogout");
  if (!sheet.getRange(1, 26).getValue()) sheet.getRange(1, 26).setValue("loginCount");
  const now = new Date().toISOString();
  const count = parseInt(sheet.getRange(targetRow, 26).getValue() || 0);
  if (eventType === "login") {
    sheet.getRange(targetRow, 24).setValue(now);
    sheet.getRange(targetRow, 26).setValue(count + 1);
  } else {
    sheet.getRange(targetRow, 25).setValue(now);
  }
}

function getProfileBySAID(said) {
  const ss    = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  const sheet = ss.getSheetByName(RECRUITS_TAB_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 23).getValues();
  for (const r of data) {
    if (String(r[0]) === String(said)) {
      return {
        said: r[0], name: r[2], highSchool: r[3], gradYear: String(r[4]),
        state: r[5], email: r[6], phone: r[7], twitter: r[8],
        position: r[9], height: String(r[10]), weight: String(r[11]),
        speed40: String(r[12]), gpa: String(r[13]), sat: String(r[14]),
        hsLat: r[15] || null, hsLng: r[16] || null,
        agi: r[17] ? String(r[17]) : "", dependents: r[18] ? String(r[18]) : "",
        awards: {
          expectedStarter: r[19] === "TRUE",
          captain:         r[20] === "TRUE",
          allConference:   r[21] === "TRUE",
          allState:        r[22] === "TRUE",
        },
      };
    }
  }
  return null;
}

// ── AUTH HANDLERS ────────────────────────────────────────────────────────────

function createAccount(payload) {
  const { email, password, said, userAgent } = payload;
  if (!email || !password || !said) return { error: "Missing required fields." };
  const sheet = getOrCreateAuthSheet();
  if (findAuthRow(sheet, 2, email) > 0) return { error: "An account with this email already exists. Sign in instead." };
  if (findAuthRow(sheet, 1, said)  > 0) return { error: "An account already exists for this profile." };
  const salt          = Utilities.getUuid();
  const passwordHash  = hashPassword(salt, password);
  const sessionToken  = Utilities.getUuid();
  const tokenExpiry   = newTokenExpiry();
  const now           = new Date().toISOString();
  sheet.appendRow([said, email, passwordHash, salt, sessionToken, tokenExpiry, "", "", now, now, "", 1]);
  logAuth(said, email, "account_created", userAgent);
  updateRecruitAuthFields(said, "login");
  return { ok: true, sessionToken, tokenExpiry, said, email };
}

function signIn(payload) {
  const { email, password, userAgent } = payload;
  if (!email || !password) return { error: "Email and password are required." };
  const sheet = getOrCreateAuthSheet();
  const row   = findAuthRow(sheet, 2, email);
  if (row < 0) return { error: "No account found for this email." };
  const vals        = sheet.getRange(row, 1, 1, 12).getValues()[0];
  const storedSAID  = String(vals[0]);
  const storedHash  = String(vals[2]);
  const storedSalt  = String(vals[3]);
  if (hashPassword(storedSalt, password) !== storedHash) return { error: "Incorrect password." };
  const sessionToken = Utilities.getUuid();
  const tokenExpiry  = newTokenExpiry();
  const now          = new Date().toISOString();
  const loginCount   = (parseInt(vals[11]) || 0) + 1;
  sheet.getRange(row, 5).setValue(sessionToken);
  sheet.getRange(row, 6).setValue(tokenExpiry);
  sheet.getRange(row, 10).setValue(now);
  sheet.getRange(row, 12).setValue(loginCount);
  logAuth(storedSAID, email, "login", userAgent);
  updateRecruitAuthFields(storedSAID, "login");
  const profile = getProfileBySAID(storedSAID);
  return { ok: true, sessionToken, tokenExpiry, said: storedSAID, email, profile };
}

function validateToken(said, token) {
  if (!said || !token) return { ok: false };
  const sheet = getOrCreateAuthSheet();
  const row   = findAuthRow(sheet, 1, said);
  if (row < 0) return { ok: false };
  const vals         = sheet.getRange(row, 1, 1, 12).getValues()[0];
  const storedToken  = String(vals[4]);
  const storedExpiry = vals[5];
  const email        = String(vals[1]);
  if (storedToken !== String(token)) return { ok: false };
  if (!storedExpiry || new Date() > new Date(storedExpiry)) return { ok: false, expired: true };
  // Refresh expiry on each valid check
  const newExpiry  = newTokenExpiry();
  const now        = new Date().toISOString();
  const loginCount = (parseInt(vals[11]) || 0) + 1;
  sheet.getRange(row, 6).setValue(newExpiry);
  sheet.getRange(row, 10).setValue(now);
  sheet.getRange(row, 12).setValue(loginCount);
  logAuth(said, email, "token_validated", "");
  updateRecruitAuthFields(said, "login");
  const profile = getProfileBySAID(said);
  return { ok: true, email, profile, tokenExpiry: newExpiry };
}

function signOut(payload) {
  const { said, token, userAgent } = payload;
  if (!said) return { ok: true };
  const sheet = getOrCreateAuthSheet();
  const row   = findAuthRow(sheet, 1, said);
  if (row < 0) return { ok: true };
  const email = String(sheet.getRange(row, 2).getValue());
  sheet.getRange(row, 5).setValue("");  // clear token
  sheet.getRange(row, 6).setValue("");  // clear expiry
  sheet.getRange(row, 11).setValue(new Date().toISOString()); // lastLogout
  logAuth(said, email, "logout", userAgent);
  updateRecruitAuthFields(said, "logout");
  return { ok: true };
}

function forgotPassword(payload) {
  const { email } = payload;
  if (!email) return { error: "Email is required." };
  const sheet = getOrCreateAuthSheet();
  const row   = findAuthRow(sheet, 2, email);
  if (row < 0) return { error: "No account found for this email." };
  const said   = String(sheet.getRange(row, 1).getValue());
  const code   = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);
  sheet.getRange(row, 7).setValue(code);
  sheet.getRange(row, 8).setValue(expiry.toISOString());
  try {
    MailApp.sendEmail({
      to: email,
      subject: "GrittyOS — Password Reset Code",
      name: "GrittyOS",
      body:
        "Your GrittyOS password reset code is: " + code + "\n\n" +
        "This code expires in 15 minutes.\n\n" +
        "If you did not request this, you can safely ignore this email.\n\n" +
        "Stay Gritty,\nThe GrittyOS Team\nverifygrit@gmail.com",
    });
  } catch(e) {
    return { error: "Failed to send reset email. Please contact verifygrit@gmail.com." };
  }
  logAuth(said, email, "password_reset_requested", "");
  return { ok: true };
}

function resetPassword(payload) {
  const { email, code, newPassword, userAgent } = payload;
  if (!email || !code || !newPassword) return { error: "Missing required fields." };
  const sheet = getOrCreateAuthSheet();
  const row   = findAuthRow(sheet, 2, email);
  if (row < 0) return { error: "No account found for this email." };
  const vals        = sheet.getRange(row, 1, 1, 12).getValues()[0];
  const storedCode  = String(vals[6]).trim();
  const resetExpiry = vals[7];
  const said        = String(vals[0]);
  if (!storedCode || storedCode !== String(code).trim()) return { error: "Invalid reset code." };
  if (!resetExpiry || new Date() > new Date(resetExpiry)) return { error: "Reset code has expired. Please request a new one." };
  const salt         = Utilities.getUuid();
  const passwordHash = hashPassword(salt, newPassword);
  const sessionToken = Utilities.getUuid();
  const tokenExpiry  = newTokenExpiry();
  const now          = new Date().toISOString();
  const loginCount   = (parseInt(vals[11]) || 0) + 1;
  sheet.getRange(row, 3).setValue(passwordHash);
  sheet.getRange(row, 4).setValue(salt);
  sheet.getRange(row, 5).setValue(sessionToken);
  sheet.getRange(row, 6).setValue(tokenExpiry);
  sheet.getRange(row, 7).setValue("");  // clear reset code
  sheet.getRange(row, 8).setValue("");  // clear reset expiry
  sheet.getRange(row, 10).setValue(now);
  sheet.getRange(row, 12).setValue(loginCount);
  logAuth(said, email, "password_reset", userAgent);
  updateRecruitAuthFields(said, "login");
  const profile = getProfileBySAID(said);
  return { ok: true, sessionToken, tokenExpiry, said, email, profile };
}

// ── HELPERS ────────────────────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
