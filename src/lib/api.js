// ── Apps Script Web App URL ────────────────────────────────────────────────────
// Set this after deploying the Apps Script (see /apps-script/Code.gs)
export const API_BASE = import.meta.env.VITE_API_BASE || "";

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

  // Build ordered list of query strings to try
  const queries = [];
  if (!alreadyHasSchool) {
    queries.push(`${name} high school, ${state}, USA`); // most specific — bias toward schools
    queries.push(`${name} School, ${state}, USA`);       // handles "Belmont Hill School"-style names
  }
  queries.push(`${name}, ${state}, USA`);                // original fallback

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

export async function saveRecruit(profile) {
  if (!API_BASE) throw new Error("VITE_API_BASE not set. See README.");
  const res = await fetch(`${API_BASE}?action=saveRecruit`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateRecruit(profile) {
  if (!API_BASE) throw new Error("VITE_API_BASE not set. See README.");
  const res = await fetch(`${API_BASE}?action=updateRecruit`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function saveShortList(said, schools) {
  if (!API_BASE || !said) return;
  const res = await fetch(`${API_BASE}?action=saveShortList`, {
    method: "POST",
    body: JSON.stringify({ said, schools }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getShortList(said) {
  if (!API_BASE || !said) return { schools: [] };
  const res = await fetch(`${API_BASE}?action=getShortList&said=${encodeURIComponent(said)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
