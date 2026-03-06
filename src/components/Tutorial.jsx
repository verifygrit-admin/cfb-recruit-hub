import { useState } from "react";
import { DIV_COLORS } from "../lib/constants.js";

const SLIDES = [
  {
    num: "01 / 04",
    title: "Welcome to the GRIT FIT CFB Recruit Hub",
    body: "This map shows every NCAA football program — 661 schools across all divisions. Markers are color-coded by division tier. Click any marker to see program details, recruiting links, and financial data.",
    extra: (
      <div className="tut-legend">
        {[
          { color: "#f5a623", label: "Power 4 (SEC, Big Ten, ACC, Big 12)" },
          { color: "#4fc3f7", label: "Group of 5 (American, MWC, Sun Belt…)" },
          { color: "#ce93d8", label: "FBS Independent" },
          { color: "#81c784", label: "FCS" },
          { color: "#ef9a9a", label: "Division II" },
          { color: "#b0bec5", label: "Division III" },
        ].map(({ color, label }) => (
          <div key={label} className="tut-legend-row">
            <div className="tut-swatch" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    ),
    tip: null,
  },
  {
    num: "02 / 04",
    title: "Understanding the Data",
    body: "Each school popup shows key metrics to help evaluate fit:",
    extra: (
      <div className="tut-defs">
        {[
          { term: "COA (OOS)", desc: "Cost of Attendance (out-of-state) — total annual cost including tuition, room, board, and fees." },
          { term: "ADLTV", desc: "Adjusted Degree Lifetime Value — estimated lifetime earnings premium from this degree, adjusted for graduation rate." },
          { term: "ADLTV Rank", desc: "National rank among all 661 programs by adjusted lifetime value." },
          { term: "Admissions Select.", desc: "Selectivity tier based on admissions rate: Super Elite (≤10%), Elite (11–19%), Very Selective (20–29%), Selective (30–49%), Somewhat Selective (50–67%), Standard (>67%)." },
        ].map(({ term, desc }) => (
          <div key={term} className="tut-def-row">
            <div className="tut-def-term">{term}</div>
            <div className="tut-def-desc">{desc}</div>
          </div>
        ))}
      </div>
    ),
    tip: null,
  },
  {
    num: "03 / 04",
    title: "Filtering & Browsing",
    body: "Use the left sidebar to narrow your search:",
    extra: (
      <ul className="tut-list">
        <li><strong>Division Tier</strong> — show only Power 4, G5, FCS, D2, or D3 programs</li>
        <li><strong>Admissions Selectivity</strong> — filter by how selective the school is academically</li>
        <li><strong>Conference</strong> — drill into a specific conference</li>
        <li><strong>ADLTV Rank</strong> — show only top-ranked programs by lifetime value</li>
        <li><strong>State</strong> — narrow to schools in specific states</li>
        <li><strong>Search</strong> — find a specific school by name</li>
      </ul>
    ),
    tip: "On mobile, tap the ≡ button to open the filter panel.",
  },
  {
    num: "04 / 04",
    title: "My Quick List",
    body: "Switch to MY QUICK LIST mode in the top-right to enter your athlete profile. The GRIT FIT Formula will score every program against your athletic metrics, academic scores, location, and financial data — then highlight your best matches on the map.",
    extra: (
      <ul className="tut-list">
        <li>Green markers = top matching programs</li>
        <li>Score is based on academic fit, athletic tier match, distance, and recruit reach</li>
        <li>Click any green marker for Recruiting Q and Coaching Staff links</li>
        <li>Switch to TABLE view for sortable results with net cost and ROI data</li>
      </ul>
    ),
    tip: "Your profile data is saved to help coaches connect with you. Fields marked Optional are not required to generate results.",
  },
];

export default function Tutorial({ onClose }) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];

  return (
    <div id="tutOverlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="tutCard">
        <button id="tutClose" onClick={onClose}>×</button>
        <div className="tut-body">
          <div className="tut-slide active">
            <div className="tut-num">{slide.num}</div>
            <div className="tut-h">{slide.title}</div>
            <p className="tut-p">{slide.body}</p>
            {slide.extra}
            {slide.tip && <div className="tut-tip">{slide.tip}</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 20px" }}>
          <button
            onClick={() => setIdx(i => Math.max(0, i-1))}
            disabled={idx === 0}
            style={{ padding: "7px 18px", background: "transparent", border: "1px solid #1e2e21", borderRadius: 3, color: idx === 0 ? "#2a3a2e" : "#6b8c72", cursor: idx === 0 ? "default" : "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1 }}
          >← Back</button>
          <div style={{ display: "flex", gap: 6 }}>
            {SLIDES.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{ width: 6, height: 6, borderRadius: "50%", background: i === idx ? "#6ed430" : "#1e2e21", cursor: "pointer" }} />
            ))}
          </div>
          {idx < SLIDES.length - 1
            ? <button onClick={() => setIdx(i => i+1)} style={{ padding: "7px 18px", background: "#6ed430", border: "none", borderRadius: 3, color: "#000", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>Next →</button>
            : <button onClick={onClose} style={{ padding: "7px 18px", background: "#6ed430", border: "none", borderRadius: 3, color: "#000", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>Get Started →</button>
          }
        </div>
      </div>
    </div>
  );
}
