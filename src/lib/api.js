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

export async function saveRecruit(profile) {
  if (!API_BASE) throw new Error("VITE_API_BASE not set. See README.");
  const res = await fetch(`${API_BASE}?action=saveRecruit`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
