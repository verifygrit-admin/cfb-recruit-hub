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
    if (action === "db")           return jsonResponse(getDB());
    if (action === "tracker")      return jsonResponse(getTracker());
    if (action === "getShortList") return jsonResponse(getShortList(e.parameter.said));
    return jsonResponse({ error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  const action = e.parameter.action || "";
  try {
    if (action === "saveRecruit") {
      const profile = JSON.parse(e.postData.contents);
      return jsonResponse(saveRecruit(profile));
    }
    if (action === "updateRecruit") {
      const profile = JSON.parse(e.postData.contents);
      return jsonResponse(updateRecruit(profile));
    }
    if (action === "saveShortList") {
      const payload = JSON.parse(e.postData.contents);
      return jsonResponse(saveShortList(payload));
    }
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

// ── HELPERS ────────────────────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
