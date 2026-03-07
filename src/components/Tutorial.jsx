import { useState } from "react";

const BROWSE_SLIDES = [
  {
    num: "01 / 04",
    title: "Welcome to Browse Schools",
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
        <li><strong>Division Tier</strong> — show only Power 4, G6, FCS, D2, or D3 programs</li>
        <li><strong>Admissions Selectivity</strong> — filter by how selective the school is academically</li>
        <li><strong>Conference</strong> — drill into a specific conference</li>
        <li><strong>ADLTV Rank</strong> — show only top-ranked programs by lifetime value</li>
        <li><strong>State</strong> — narrow to schools in specific states</li>
        <li><strong>Search</strong> — find a specific school by name</li>
      </ul>
    ),
    tip: "On mobile, tap the menu button to open the filter panel.",
  },
  {
    num: "04 / 04",
    title: "My GRIT Fit",
    body: "Switch to MY GRIT FIT in the top-right to enter your athlete profile. The GRIT FIT Formula scores every program against your athletic metrics, academic scores, location, and financial data.",
    extra: (
      <ul className="tut-list">
        <li>Green markers = Top Match (ranks 1–30)</li>
        <li>Gold markers = Good Match (ranks 31–40)</li>
        <li>Red markers = Borderline (ranks 41–50)</li>
        <li>Switch to TABLE view for sortable results with net cost and ROI data</li>
      </ul>
    ),
    tip: "Your profile data is saved to help coaches connect with you.",
  },
];

const QL_SLIDES = [
  {
    num: "01 / 05",
    title: "What is My GRIT Fit?",
    body: "The GRIT FIT Formula evaluates every NCAA program against your personal profile — athletic metrics, academics, location, and household finances — to surface your best realistic matches.",
    extra: (
      <div className="tut-defs">
        {[
          { term: "My Athletic Score", desc: "How your height, weight, and 40-yard dash compare to the median athlete at each division level for your position. Awards (All-State, Captain, etc.) add bonus points." },
          { term: "My Academic Rigor Score", desc: "How your SAT + GPA combination compares to the academic profile of students admitted to each school. Used to match you with programs where you're a realistic academic fit." },
          { term: "My Test Optional Score", desc: "A GPA-only version of your academic score, used for schools that don't require standardized test scores. If a school is test-optional, this score is what drives your academic match." },
          { term: "Recruit Reach", desc: "The maximum distance coaches at your tier typically recruit. Programs beyond this radius are filtered out." },
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
    num: "02 / 05",
    title: "Your Score Dashboard",
    body: "After submitting your profile, three scores appear above your results table:",
    extra: (
      <div className="tut-defs">
        {[
          { term: "My Athletic Score", desc: "Your boosted athletic fit score for your matched division tier. Above 50% = eligible. Higher = stronger athletic profile vs competition at that level." },
          { term: "My Academic Rigor Score", desc: "Your combined SAT + GPA percentile. Used to rank and sort your Top 50 matches from most to least academically demanding." },
          { term: "My Test Optional Score", desc: "Your GPA-only score, used for schools with test-optional admissions policies." },
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
    num: "03 / 05",
    title: "Reading Your Results",
    body: "Your top 50 matches are shown on the map and in the table. Hover any column header for a full description.",
    extra: (
      <div className="tut-defs">
        {[
          { term: "Target Rank", desc: "Your personalized rank — #1 is the school whose academic rigor best matches your profile." },
          { term: "Net Cost", desc: "Projected 4-year net cost after Expected Family Contribution and estimated merit aid. Requires AGI + dependents in your profile." },
          { term: "DROI", desc: "Degree ROI — the school's Adjusted Degree Lifetime Value divided by your projected net cost. Higher means better financial return." },
          { term: "ADLTV", desc: "Adjusted Degree Lifetime Value — estimated lifetime earnings premium for graduates, adjusted for graduation rate." },
        ].map(({ term, desc }) => (
          <div key={term} className="tut-def-row">
            <div className="tut-def-term">{term}</div>
            <div className="tut-def-desc">{desc}</div>
          </div>
        ))}
      </div>
    ),
    tip: "Click any column header to sort your results by that metric.",
  },
  {
    num: "04 / 05",
    title: "Taking Action",
    body: "Each matched school has direct links to connect with the program:",
    extra: (
      <ul className="tut-list">
        <li><strong>Recruit Quest.</strong> — submit your recruiting questionnaire directly to the school's coaches</li>
        <li><strong>Coaching Staff</strong> — view the football staff directory to identify who to contact</li>
        <li>Use <strong>Edit Profile</strong> in the summary bar to adjust your data and rerun</li>
        <li>Switch back to <strong>Browse Schools</strong> to explore programs freely</li>
      </ul>
    ),
    tip: "Submitting your questionnaire is the single highest-impact action a recruit can take.",
  },
  {
    num: "05 / 05",
    title: "Refine Your Results Anytime",
    body: "Your matches are only as accurate as the information you provide. Use the Edit My Profile button at the bottom of the screen to update your data and rerun the formula at any time.",
    extra: (
      <ul className="tut-list">
        <li><strong>Athletics</strong> — use your honest 40 time and real measurables, not your goal numbers</li>
        <li><strong>Academics</strong> — enter your current GPA and most recent SAT/ACT score</li>
        <li><strong>Location</strong> — your high school state affects which programs can realistically recruit you</li>
        <li><strong>Household</strong> — AGI and dependents unlock personalized net cost and ROI data</li>
      </ul>
    ),
    tip: "Honest inputs = accurate matches. The formula works best when your profile reflects where you are today.",
  },
];

export default function Tutorial({ type = "browse", onClose }) {
  const [idx, setIdx] = useState(0);
  const slides = type === "quicklist" ? QL_SLIDES : BROWSE_SLIDES;
  const slide  = slides[idx];

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
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            style={{ padding: "7px 18px", background: "transparent", border: "1px solid #1e2e21", borderRadius: 3, color: idx === 0 ? "#2a3a2e" : "#6b8c72", cursor: idx === 0 ? "default" : "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1 }}
          >← Back</button>
          <div style={{ display: "flex", gap: 6 }}>
            {slides.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{ width: 6, height: 6, borderRadius: "50%", background: i === idx ? "#6ed430" : "#1e2e21", cursor: "pointer" }} />
            ))}
          </div>
          {idx < slides.length - 1
            ? <button onClick={() => setIdx(i => i + 1)} style={{ padding: "7px 18px", background: "#6ed430", border: "none", borderRadius: 3, color: "#000", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>Next →</button>
            : <button onClick={onClose} style={{ padding: "7px 18px", background: "#6ed430", border: "none", borderRadius: 3, color: "#000", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>Get Started →</button>
          }
        </div>
      </div>
    </div>
  );
}
