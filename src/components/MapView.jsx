import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { DIV_COLORS } from "../lib/constants.js";

// Score → green gradient for quicklist mode
function scoreColor(score) {
  if (score == null) return "#444";
  const r = Math.round(255 * (1 - score));
  const g = Math.round(200 * score + 55);
  return `rgb(${r},${g},50)`;
}

function makeIcon(color, size = 10) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:1.5px solid rgba(255,255,255,0.5);
      box-shadow:0 0 4px ${color}88;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
}

export default function MapView({ schools, results, mode, filters }) {
  const mapRef    = useRef(null);
  const leafletRef = useRef(null);
  const clusterRef = useRef(null);

  // Init map once
  useEffect(() => {
    if (leafletRef.current) return;
    leafletRef.current = L.map(mapRef.current, {
      center: [38.5, -96],
      zoom: 4,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(leafletRef.current);
  }, []);

  // Re-render markers when schools, results, or filters change
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || !schools.length) return;

    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }

    // Build a score lookup if we have quicklist results
    const scoreMap = {};
    if (results?.scored) {
      results.scored.forEach(s => { scoreMap[s.UNITID] = s; });
    }

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        const sz = n < 10 ? 28 : n < 50 ? 34 : 40;
        return L.divIcon({
          html: `<div style="
            width:${sz}px;height:${sz}px;border-radius:50%;
            background:rgba(46,107,24,0.85);border:2px solid #6ed430;
            display:flex;align-items:center;justify-content:center;
            color:#c8f5a0;font-size:${sz < 34 ? 11 : 13}px;font-weight:bold;font-family:'Barlow Condensed',monospace;
          ">${n}</div>`,
          className: "",
          iconSize: [sz, sz],
          iconAnchor: [sz/2, sz/2],
        });
      },
    });

    schools.forEach(school => {
      const lat = parseFloat(school.LATITUDE || school.Lat);
      const lng = parseFloat(school.LONGITUDE || school.Lng);
      if (!lat || !lng) return;

      // Apply browse-mode filters
      if (mode === "browse" && filters) {
        if (filters.tiers.length && !filters.tiers.includes(school.Type)) return;
        if (filters.selectivity.length && !filters.selectivity.includes(school["School Type"])) return;
        if (filters.conf !== "ALL" && school.Conference !== filters.conf) return;
        if (filters.states.length && !filters.states.includes(school.State)) return;
        if (filters.adltvRank !== "ALL") {
          const rank = parseInt(school["ADLTV Rank"]);
          if (!rank || rank > parseInt(filters.adltvRank)) return;
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const name = (school["School Name"] || "").toLowerCase();
          const state = (school.State || "").toLowerCase();
          if (!name.includes(q) && !state.includes(q)) return;
        }
      }

      const scored = scoreMap[school.UNITID];
      let color, size;

      if (mode === "quicklist" && results) {
        if (!scored) { color = "#222"; size = 7; }
        else if (!scored.eligible) { color = "#333"; size = 7; }
        else {
          const norm = results.top30.indexOf(scored) >= 0
            ? 1 - results.top30.indexOf(scored) / 30
            : scored.acadScore;
          color = scoreColor(norm);
          size = 12;
        }
      } else {
        color = DIV_COLORS[school.Type] || "#888";
        size = 9;
      }

      const schoolName = school["School Name"] || school.School_Name || "Unknown";
      const div        = school["NCAA Division"] || school.NCAA_Division || "";
      const conf       = school.Conference || "";
      const tier       = school.Type || "";
      const coaRaw     = school["COA (Out-of-State)"] || school.COA || "";
      const coaNum     = parseFloat(String(coaRaw).replace(/[$,]/g, "")) || 0;
      const qLink      = school["Recruiting Q Link"] || school.q_link || "";
      const coachLink  = school["Coach Page"] || school.coach_link || "";

      let popupContent = `
        <div class="popup-header">
          <div class="popup-school-name">${schoolName}</div>
          <div class="popup-location">${school["City/Location"] || ""}, ${school.State || ""}</div>
          <div class="popup-tier-badge" style="background:${DIV_COLORS[tier] || "#888"}">${tier}</div>
        </div>
        <div class="popup-body">
          <div class="popup-grid">
            <div class="popup-stat">
              <div class="popup-stat-label">Division</div>
              <div class="popup-stat-value">${div}</div>
            </div>
            <div class="popup-stat">
              <div class="popup-stat-label">Conference</div>
              <div class="popup-stat-value">${conf}</div>
            </div>
            <div class="popup-stat">
              <div class="popup-stat-label">COA (OOS)</div>
              <div class="popup-stat-value">$${Math.round(coaNum).toLocaleString()}</div>
            </div>
            <div class="popup-stat">
              <div class="popup-stat-label">Admissions Select.</div>
              <div class="popup-stat-value">${school["School Type"] || ""}</div>
            </div>
          </div>
      `;

      if (scored?.eligible) {
        popupContent += `
          <hr style="border:none;border-top:1px solid var(--border);margin:8px 0;"/>
          <div style="color:#6ed430;font-weight:bold;margin-bottom:6px;font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:1px;">✓ IN YOUR QUICK LIST</div>
          <div class="popup-grid">
            <div class="popup-stat"><div class="popup-stat-label">Acad Fit</div><div class="popup-stat-value">${scored.acadScore?.toFixed(3)}</div></div>
            <div class="popup-stat"><div class="popup-stat-label">Ath Fit</div><div class="popup-stat-value">${scored.athFitScore?.toFixed(3)}</div></div>
            <div class="popup-stat"><div class="popup-stat-label">Distance</div><div class="popup-stat-value">${scored.dist} mi</div></div>
            ${scored.netCost != null ? `<div class="popup-stat"><div class="popup-stat-label">Est Net Cost</div><div class="popup-stat-value">$${Math.round(scored.netCost).toLocaleString()}</div></div>` : ""}
            ${scored.droi != null ? `<div class="popup-stat"><div class="popup-stat-label">DROI</div><div class="popup-stat-value">${scored.droi.toFixed(1)}×</div></div>` : ""}
          </div>
        `;
      }

      if (qLink || coachLink) {
        popupContent += `<div class="popup-unitid">`;
        if (qLink)    popupContent += `<a href="${qLink}"    target="_blank" class="popup-link" style="font-size:11px;padding:4px 8px;">Recruit Q →</a>`;
        if (coachLink) popupContent += `<a href="${coachLink}" target="_blank" class="popup-link" style="font-size:11px;padding:4px 8px;margin-left:6px;">Staff →</a>`;
        popupContent += `</div>`;
      }

      popupContent += `</div>`;

      const marker = L.marker([lat, lng], { icon: makeIcon(color, size) });
      marker.bindPopup(popupContent, { maxWidth: 280 });
      cluster.addLayer(marker);
    });

    cluster.addTo(map);
    clusterRef.current = cluster;
  }, [schools, results, mode, filters]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {mode === "quicklist" && results && (
        <div style={{
          position: "absolute", bottom: 16, left: 16, zIndex: 1000,
          background: "rgba(8,13,10,0.92)", border: "1px solid #1e2e21",
          borderRadius: 6, padding: "10px 14px",
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
        }}>
          <div style={{ color: "#6ed430", marginBottom: 6, letterSpacing: 2, fontWeight: 700 }}>MAP LEGEND</div>
          {[
            { color: scoreColor(0.9), label: "Top match" },
            { color: scoreColor(0.5), label: "Good match" },
            { color: scoreColor(0.1), label: "Borderline" },
            { color: "#333",          label: "Not eligible" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, border: "1px solid rgba(255,255,255,0.3)" }} />
              <span style={{ color: "#6b8c72" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
