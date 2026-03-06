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
    if (action === "db")      return jsonResponse(getDB());
    if (action === "tracker") return jsonResponse(getTracker());
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

function saveRecruit(profile) {
  const ss    = SpreadsheetApp.openById(GRITTY_DB_SHEET_ID);
  let sheet   = ss.getSheetByName(RECRUITS_TAB_NAME);

  // Create tab if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(RECRUITS_TAB_NAME);
    const headers = [
      "timestamp","name","highSchool","gradYear","state",
      "position","height","weight","speed40",
      "gpa","sat","hsLat","hsLng","agi","dependents",
      "expectedStarter","captain","allConference","allState",
    ];
    sheet.appendRow(headers);
  }

  sheet.appendRow([
    profile.timestamp || new Date().toISOString(),
    profile.name || "",
    profile.highSchool || "",
    profile.gradYear || "",
    profile.state || "",
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

  return { ok: true };
}

// ── HELPERS ────────────────────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
