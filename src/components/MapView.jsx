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

export default function MapView({ schools, results, mode }) {
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

  // Re-render markers when schools or results change
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
            color:#c8f5a0;font-size:${sz < 34 ? 11 : 13}px;font-weight:bold;font-family:monospace;
          ">${n}</div>`,
          className: "",
          iconSize: [sz, sz],
          iconAnchor: [sz/2, sz/2],
        });
      },
    });

    schools.forEach(school => {
      const lat = school.LATITUDE || school.Lat;
      const lng = school.LONGITUDE || school.Lng;
      if (!lat || !lng) return;

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
          size = scored.eligible ? 12 : 7;
        }
      } else {
        color = DIV_COLORS[school.Type] || DIV_COLORS[school["NCAA Division"]] || "#888";
        size = 9;
      }

      const schoolName = school.School_Name || school["School Name"] || "Unknown";
      const div        = school.NCAA_Division || school["NCAA Division"] || "";
      const conf       = school.Conference || "";
      const coa        = school["COA (Out-of-State)"] || school.COA || 0;

      let popupContent = `
        <div style="font-family:'Courier New',monospace;font-size:11px;color:#e8e4dc;min-width:200px;">
          <div style="font-size:13px;font-weight:bold;color:#f5f0e8;margin-bottom:6px;">${schoolName}</div>
          <div style="color:#888;margin-bottom:4px;">${div} · ${conf}</div>
          <div style="color:#6ed430;">COA: $${Math.round(coa).toLocaleString()}</div>
      `;

      if (scored?.eligible) {
        popupContent += `
          <hr style="border:none;border-top:1px solid #333;margin:8px 0;"/>
          <div style="color:#6ed430;font-weight:bold;margin-bottom:4px;">✓ IN YOUR QUICK LIST</div>
          <div>Acad Fit: <b>${scored.acadScore?.toFixed(3)}</b></div>
          <div>Ath Fit: <b>${scored.athFitScore?.toFixed(3)}</b></div>
          <div>Distance: <b>${scored.dist} mi</b></div>
          ${scored.netCost != null ? `<div>Est Net Cost: <b>$${Math.round(scored.netCost).toLocaleString()}</b></div>` : ""}
          ${scored.droi != null ? `<div>DROI: <b>${scored.droi.toFixed(1)}×</b></div>` : ""}
        `;
      }

      if (school.q_link || school.coach_link) {
        popupContent += `<hr style="border:none;border-top:1px solid #333;margin:8px 0;"/>`;
        if (school.q_link)     popupContent += `<a href="${school.q_link}"     target="_blank" style="color:#4fc3f7;display:block;">Recruiting Q →</a>`;
        if (school.coach_link) popupContent += `<a href="${school.coach_link}" target="_blank" style="color:#4fc3f7;display:block;margin-top:4px;">Coaching Staff →</a>`;
      }

      popupContent += `</div>`;

      const marker = L.marker([lat, lng], { icon: makeIcon(color, size) });
      marker.bindPopup(popupContent, { maxWidth: 280, className: "grit-popup" });
      cluster.addLayer(marker);
    });

    cluster.addTo(map);
    clusterRef.current = cluster;
  }, [schools, results, mode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {mode === "quicklist" && results && (
        <div style={{
          position: "absolute", bottom: 16, left: 16, zIndex: 1000,
          background: "rgba(10,10,20,0.92)", border: "1px solid #2a2a3e",
          borderRadius: 6, padding: "10px 14px", fontFamily: "'Courier New',monospace", fontSize: 10,
        }}>
          <div style={{ color: "#6ed430", marginBottom: 6, letterSpacing: 1 }}>MAP LEGEND</div>
          {[
            { color: scoreColor(0.9), label: "Top match" },
            { color: scoreColor(0.5), label: "Good match" },
            { color: scoreColor(0.1), label: "Borderline" },
            { color: "#333",          label: "Not eligible" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, border: "1px solid rgba(255,255,255,0.3)" }} />
              <span style={{ color: "#888" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
