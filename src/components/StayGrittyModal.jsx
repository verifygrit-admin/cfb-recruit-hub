import { calcAthleticFit, calcAthleticComponents } from "../lib/scoring.js";
import { ATH_STANDARDS, TIER_ORDER, POSITIONS, RECRUIT_BUDGETS } from "../lib/constants.js";

const TIER_LABELS = {
  "Power 4": "Power 4", "G6": "G6",
  "1-FCS": "FCS", "2-Div II": "Division II", "3-Div III": "Division III",
};

const METRIC_LABELS = { hScore: "Height", wScore: "Weight", sScore: "40-Yard Dash" };

// WOW threshold — any metric score at or above this percentile earns a callout
const WOW_THRESHOLD = 0.75;

const WOW_CALLOUTS = {
  hScore: {
    label: "Height",
    coachValue: "Height is one of the first things coaches evaluate at your position. Standing above the positional median signals natural physical upside that can't be developed in a weight room — and it separates your profile from the crowd before you ever step on a field.",
  },
  wScore: {
    label: "Playing Weight",
    coachValue: "Playing at or above the positional weight median signals physical readiness and the ability to compete from day one. Coaches don't want to wait years for a recruit to develop the frame to handle contact. Your weight tells them you're ready now.",
  },
  sScore: {
    label: "40-Yard Speed",
    coachValue: "Elite speed is one of the rarest and most coveted traits in college football recruiting. Coaches can develop strength and technique — they cannot coach speed. A top-tier 40 time travels fast through recruiting networks and is the single most attention-grabbing number on a recruiting profile.",
  },
  acadRigorScore: {
    label: "Academic Profile",
    coachValue: "Academic strength directly affects a program's ability to admit you. Coaches don't just want talent — they need recruits who clear the admissions bar and stay eligible. A strong academic profile gives a coach confidence that offering you won't fall apart in the admissions office.",
  },
};

// Position suggestion pools — only suggest analogous roles by position group
const OFF_SKILL = ["QB", "RB", "FB", "WR"];
const OFF_LINE  = ["OL", "C", "G", "T"];
const DEF_SKILL = ["CB", "S"];
const DEF_LINE  = ["DL", "DE", "DT", "EDGE"];
const SUGGESTION_POOLS = {
  QB:   [...OFF_SKILL, "TE", ...DEF_SKILL, "LB"],
  RB:   [...OFF_SKILL, "TE", ...DEF_SKILL, "LB"],
  FB:   [...OFF_SKILL, "TE", ...DEF_SKILL, "LB"],
  WR:   [...OFF_SKILL, "TE", ...DEF_SKILL, "LB"],
  TE:   [...OFF_SKILL, ...OFF_LINE, ...DEF_SKILL, ...DEF_LINE, "LB"], // crossover
  OL:   [...OFF_LINE, ...DEF_LINE, "LB"],
  C:    [...OFF_LINE, ...DEF_LINE, "LB"],
  G:    [...OFF_LINE, ...DEF_LINE, "LB"],
  T:    [...OFF_LINE, ...DEF_LINE, "LB"],
  CB:   [...DEF_SKILL, "LB", ...OFF_SKILL, "TE"],
  S:    [...DEF_SKILL, "LB", ...OFF_SKILL, "TE"],
  LB:   [...DEF_SKILL, ...DEF_LINE, ...OFF_LINE],                     // crossover
  DL:   [...DEF_LINE, "LB", ...OFF_LINE],
  DE:   [...DEF_LINE, "LB", ...OFF_LINE],
  DT:   [...DEF_LINE, "LB", ...OFF_LINE],
  EDGE: [...DEF_LINE, "LB", ...OFF_LINE],
};

// Concrete training tips keyed by weakest metric
const TRAINING_TIPS = {
  wScore: [
    { title: "Eat in a daily caloric surplus", body: "Add 300–500 calories above your maintenance level. Focus on lean protein (chicken, eggs, tuna, beans), complex carbs (rice, oats, sweet potato), and healthy fats (peanut butter, avocado, whole eggs). Aim for 0.8–1g of protein per lb of bodyweight every day." },
    { title: "Compound lifts 3–4x per week", body: "Squat, deadlift, bench press, and power clean recruit the most muscle mass in the least time. Start with a 5x5 program (free at stronglifts.com) and add weight to the bar each session. Consistency beats intensity." },
    { title: "Eat within 30 minutes post-workout", body: "Protein + carbs immediately after lifting accelerates muscle synthesis. Two eggs and a banana, a glass of chocolate milk, or Greek yogurt with fruit are cheap and highly effective options." },
    { title: "Prioritize sleep — 8 to 9 hours", body: "The majority of muscle growth happens during sleep, not in the gym. Cutting sleep short limits the gains from every workout. This is the highest-ROI, zero-cost training variable most athletes underuse." },
    { title: "Track your food for two weeks", body: "Most athletes significantly underestimate their daily intake. Use a free app like Cronometer or MyFitnessPal for two weeks to confirm you are actually eating above maintenance — not just thinking you are." },
  ],
  sScore: [
    { title: "Fix your sprint mechanics first", body: "Most speed gains come from technique, not fitness. Focus on a powerful drive phase, tall hips, and straight arm drive. Film yourself or ask a coach to review one session. Bad mechanics permanently cap your ceiling regardless of conditioning." },
    { title: "Hill sprints or resistance sprints 2x per week", body: "Find a moderate incline and sprint up it at 100% effort with full recovery between reps. Uphill and resistance sprinting builds the explosive acceleration phase that most directly reduces 40 time. 6–8 reps per session is enough." },
    { title: "Plyometrics 2x per week", body: "Box jumps, broad jumps, and bounding drills train your fast-twitch muscle fibers — the same fibers that drive sprint speed. Three sets of 5 reps twice weekly is sufficient stimulus. Quality of effort matters more than volume." },
    { title: "Power cleans and trap bar deadlifts", body: "Research consistently shows hip-dominant explosive lifts have the strongest correlation with sprint speed. If these are not in your program, add them. Even one day per week produces measurable speed improvements over 8–12 weeks." },
    { title: "Sprint at full speed every rep in practice", body: "Speed is a skill trained at the speed you practice. Jogging through reps teaches your nervous system to jog. Sprint every drill that calls for it — your nervous system adapts to the stimulus you give it." },
  ],
  hScore: [
    { title: "Height is genetic — focus on what you can control", body: "The height score reflects the position median, not a hard cutoff. Meaningful improvements to your speed or weight scores can raise your overall athletic score enough to qualify even with the same height. Those are your levers." },
    { title: "Posture and core work can maximize your measured height", body: "Dead hangs (hang from a bar 30–60 seconds daily), thoracic mobility drills, and plank progressions correct forward lean over time. Athletes with poor posture can gain 0.5–1 inch in measured standing height through consistent postural work." },
    { title: "Consider positions with a lower height median", body: "The alternative positions shown above were selected partly because their height medians are closer to yours. Your overall score is naturally stronger there with identical measurables — and those are real options, not consolation prizes." },
    { title: "Technique closes the gap that inches can't", body: "Route precision, hand fighting, leverage, and positional IQ are things coaches weigh heavily but pre-recruit metrics don't capture. Developing elite technique at your position makes height a smaller factor than it appears on paper." },
  ],
};

const CLASS_LABELS = { Senior: "Senior", Junior: "Junior", Soph: "Sophomore", Freshman: "Freshman" };

const ACADEMIC_TIPS = [
  { title: "Ask your teachers directly", body: "Go to each teacher and ask: \"What is the single most impactful thing I can do to improve my grade?\" Teachers respect athletes who take initiative — and they often have options that aren't advertised." },
  { title: "Prioritize your lowest-grade classes first", body: "A point gained in a D has far more GPA impact than a point gained in a B. Focus energy where the math works in your favor." },
  { title: "Ask about late work and extra credit", body: "Many teachers allow late or redone assignments for partial credit. Just ask. The worst they can say is no — and most say yes." },
  { title: "Use Khan Academy (free)", body: "khanacademy.org covers math, science, and SAT prep at every level. Free, self-paced, and used by millions of students. 20 minutes a day adds up fast." },
  { title: "Find your school's free tutoring", body: "Most schools offer peer tutoring or teacher-led help sessions at lunch or after school. Your counselor can point you to them." },
  { title: "Study in short focused blocks", body: "30 minutes of focused, phone-free study beats 2 hours of distracted work. Remove distractions first — then open the books." },
  { title: "Review notes within 24 hours", body: "The forgetting curve is real. Reviewing your notes the same day you take them dramatically improves retention without extra time." },
  { title: "Talk to your school counselor", body: "Ask specifically about grade forgiveness policies, course retakes, or summer school options. Counselors can open doors you don't know exist." },
];

function AcademicContent({ results, athlete, onEditProfile, onBrowse }) {
  const firstName = athlete.name?.split(" ")[0] || "Athlete";
  const { requiredGpa, classLabel } = results;
  const classDisplay = CLASS_LABELS[classLabel] || classLabel;
  const currentGpa = athlete.gpa ? parseFloat(athlete.gpa).toFixed(2) : "—";
  const gap = requiredGpa && athlete.gpa ? (requiredGpa - parseFloat(athlete.gpa)).toFixed(2) : null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(6,10,7,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", overflowY: "auto",
    }}>
      <div style={{
        background: "#0e1510", border: "1px solid #2e6b18", borderRadius: 6,
        padding: "32px 28px", maxWidth: 560, width: "100%",
        fontFamily: "'Barlow Condensed', sans-serif",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#6ed430", letterSpacing: 1, marginBottom: 6 }}>
          Stay Gritty, {firstName}!
        </div>
        <div style={{ fontSize: 13, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", lineHeight: 1.6, marginBottom: 20 }}>
          The GRIT FIT Formula couldn't generate matches right now because your current GPA
          puts you below the NCAA minimum academic eligibility threshold for a{" "}
          <strong style={{ color: "#c8f5a0" }}>{classDisplay}</strong>.
          This is fixable — and the steps to get there don't cost anything.
        </div>

        {/* GPA snapshot */}
        <div style={{ marginBottom: 20, background: "#0a120b", border: "1px solid #1e2e21", borderRadius: 4, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#f5a623", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
            Academic Eligibility Snapshot
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, color: "#6b8c72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Your GPA</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#ef5350", fontFamily: "'Barlow Condensed', sans-serif" }}>{currentGpa}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#6b8c72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{classDisplay} Minimum</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#6ed430", fontFamily: "'Barlow Condensed', sans-serif" }}>{requiredGpa?.toFixed(1)}</div>
            </div>
            {gap && (
              <div>
                <div style={{ fontSize: 10, color: "#6b8c72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Gap to Close</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#f5a623", fontFamily: "'Barlow Condensed', sans-serif" }}>+{gap}</div>
              </div>
            )}
          </div>
        </div>

        {/* What this means */}
        <div style={{ marginBottom: 20, padding: "12px 16px", background: "#130f08", border: "1px solid #3a2e10", borderRadius: 4 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#f5a623", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            Why It Matters
          </div>
          <div style={{ fontSize: 13, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", lineHeight: 1.6 }}>
            The NCAA requires a minimum GPA to certify initial academic eligibility — without it,
            no program at any level can offer you a spot on their roster. The good news: GPA is
            one of the most improvable metrics in your profile, and the best strategies are free.
          </div>
        </div>

        {/* Tips */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#6ed430", fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>
            Free Strategies to Move the Needle
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ACADEMIC_TIPS.map(tip => (
              <div key={tip.title} style={{ paddingLeft: 12, borderLeft: "2px solid #2e6b18" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c8f5a0", marginBottom: 2, letterSpacing: 0.5 }}>{tip.title}</div>
                <div style={{ fontSize: 12, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", lineHeight: 1.5 }}>{tip.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Encouragement close */}
        <div style={{ marginBottom: 20, padding: "12px 16px", background: "#0a120b", border: "1px solid #2e6b18", borderRadius: 4 }}>
          <div style={{ fontSize: 13, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", lineHeight: 1.6 }}>
            When your GPA improves, come back and update your profile. The GRIT FIT Formula will
            run immediately and show you every program you qualify for.
            <strong style={{ color: "#c8f5a0" }}> One semester of focused work can change your entire recruiting picture.</strong>
          </div>
        </div>

        {/* Support */}
        <div style={{ fontSize: 11, color: "#3a5a3e", textAlign: "center", marginBottom: 16, fontFamily: "'Barlow', sans-serif" }}>
          Support: <a href="mailto:verifygrit@gmail.com" style={{ color: "#3a5a3e" }}>verifygrit@gmail.com</a>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onEditProfile} style={{
            flex: 1, padding: "10px 20px", background: "#2e6b18", border: "1px solid #6ed430",
            borderRadius: 3, color: "#c8f5a0", fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
          }}>Update My Profile →</button>
          <button onClick={onBrowse} style={{
            padding: "10px 20px", background: "transparent", border: "1px solid #2e6b18",
            borderRadius: 3, color: "#6b8c72", fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
          }}>Home</button>
        </div>
      </div>
    </div>
  );
}

export default function StayGrittyModal({ results, athlete, onEditProfile, onBrowse }) {
  // Route to academic content if triggered by GPA threshold
  if (results.reason === "academic") {
    return <AcademicContent results={results} athlete={athlete} onEditProfile={onEditProfile} onBrowse={onBrowse} />;
  }

  const firstName = athlete.name?.split(" ")[0] || "Athlete";

  // Closest tier — highest athFit score across all tiers
  const closestTier = TIER_ORDER.reduce((best, t) =>
    (results.athFit[t] || 0) > (results.athFit[best] || 0) ? t : best,
    TIER_ORDER[TIER_ORDER.length - 1]
  );
  const closestScore = results.athFit[closestTier] || 0;
  const gapPct = Math.max(0, (0.5 - closestScore) * 100);

  // Per-metric breakdown at closest tier
  const comps = calcAthleticComponents(
    athlete.position, +athlete.height, +athlete.weight, +athlete.speed40, closestTier
  );

  // Weakest metric (lowest score)
  const weakest = comps
    ? Object.entries({ hScore: comps.hScore, wScore: comps.wScore, sScore: comps.sScore })
        .sort(([, a], [, b]) => a - b)[0]
    : null;

  // Strengths — metrics scoring above 50%
  const strengths = [];
  if (results.acadRigorScore > 0.5)
    strengths.push(`Academic Score: ${(results.acadRigorScore * 100).toFixed(0)}%`);
  if (comps?.sScore > 0.5) strengths.push(`40-Yard Dash: ${(comps.sScore * 100).toFixed(0)}%`);
  if (comps?.hScore > 0.5) strengths.push(`Height: ${(comps.hScore * 100).toFixed(0)}%`);
  if (comps?.wScore > 0.5) strengths.push(`Weight: ${(comps.wScore * 100).toFixed(0)}%`);

  // WOW scores — any metric at or above the 75th percentile
  const wowItems = [];
  if (results.acadRigorScore >= WOW_THRESHOLD)
    wowItems.push({ key: "acadRigorScore", score: results.acadRigorScore });
  if (comps?.sScore >= WOW_THRESHOLD) wowItems.push({ key: "sScore", score: comps.sScore });
  if (comps?.hScore >= WOW_THRESHOLD) wowItems.push({ key: "hScore", score: comps.hScore });
  if (comps?.wScore >= WOW_THRESHOLD) wowItems.push({ key: "wScore", score: comps.wScore });

  // Alternative positions at D3 — filtered to analogous position group
  const boost = results.boost || 0;
  const pool = SUGGESTION_POOLS[athlete.position] || [];
  const altPositions = POSITIONS.filter(pos =>
    pos !== athlete.position &&
    pool.includes(pos) &&
    ATH_STANDARDS["3-Div III"]?.[pos] &&
    calcAthleticFit(pos, +athlete.height, +athlete.weight, +athlete.speed40, "3-Div III") + boost > 0.5
  ).slice(0, 4);

  // Aspirational schools — pass distance + academic gates at closest tier, sorted by ADLTV
  const reach = RECRUIT_BUDGETS[closestTier] || 450;
  let tableSchools = (results.scored || [])
    .filter(s => s.Type === closestTier && s.dist <= reach && s.acadScore > 0)
    .sort((a, b) => (b.adltv || 0) - (a.adltv || 0))
    .slice(0, 5);
  // Fallback: if fewer than 3, show top schools by ADLTV from that tier regardless of other gates
  if (tableSchools.length < 3) {
    tableSchools = (results.scored || [])
      .filter(s => s.Type === closestTier)
      .sort((a, b) => (b.adltv || 0) - (a.adltv || 0))
      .slice(0, 5);
  }

  const tierLabel = TIER_LABELS[closestTier] || closestTier;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(6,10,7,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", overflowY: "auto",
    }}>
      <div style={{
        background: "#0e1510", border: "1px solid #2e6b18", borderRadius: 6,
        padding: "32px 28px", maxWidth: 560, width: "100%",
        fontFamily: "'Barlow Condensed', sans-serif",
        maxHeight: "90vh", overflowY: "auto",
      }}>

        {/* Header */}
        <div style={{ fontSize: 28, fontWeight: 700, color: "#6ed430", letterSpacing: 1, marginBottom: 6 }}>
          Stay Gritty, {firstName}!
        </div>
        <div style={{ fontSize: 13, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", lineHeight: 1.6, marginBottom: 20 }}>
          We couldn't find qualifying {tierLabel} matches for you as a{" "}
          <strong style={{ color: "#c8f5a0" }}>{athlete.position}</strong> right now —
          but you're closer than you think. Here's what the data shows and where to focus next.
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#6ed430", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
              Your Strengths
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {strengths.map(s => (
                <span key={s} style={{
                  padding: "4px 10px", background: "#1a2e1d", border: "1px solid #2e6b18",
                  borderRadius: 3, fontSize: 12, color: "#c8f5a0",
                }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* WOW callouts — metrics at or above 75th percentile */}
        {wowItems.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {wowItems.map(({ key, score }) => {
              const callout = WOW_CALLOUTS[key];
              if (!callout) return null;
              const pct = Math.round(score * 100);
              return (
                <div key={key} style={{
                  marginBottom: 10, padding: "14px 16px",
                  background: "linear-gradient(135deg, #0e1f10 0%, #0a1a0c 100%)",
                  border: "1px solid #6ed430", borderRadius: 4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>🔥</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#6ed430", letterSpacing: 1 }}>WOW!</span>
                    <span style={{ fontSize: 12, color: "#c8f5a0", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
                      {callout.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c8f5a0", marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5 }}>
                    You're performing better than {pct}% of student-athletes in this area.
                  </div>
                  <div style={{ fontSize: 12, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", lineHeight: 1.6 }}>
                    {callout.coachValue}{" "}
                    <strong style={{ color: "#c8f5a0" }}>Lock in your Stay Gritty Focus and this becomes a headline on your recruiting profile.</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Closest fit + component breakdown */}
        <div style={{ marginBottom: 20, background: "#0a120b", border: "1px solid #1e2e21", borderRadius: 4, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#f5a623", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Closest Fit: {tierLabel}
          </div>
          <div style={{ fontSize: 13, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", marginBottom: 14 }}>
            You scored <strong style={{ color: "#c8f5a0" }}>{(closestScore * 100).toFixed(1)}%</strong> as
            a {athlete.position} at the {tierLabel} level —
            {gapPct <= 15
              ? <> just <strong style={{ color: "#f5a623" }}>{gapPct.toFixed(1)}%</strong> from qualifying.</>
              : <> the qualifying threshold is 50%. Keep developing and update your profile as you improve.</>
            }
          </div>
          {comps && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { key: "hScore", label: "Height",       current: `${athlete.height} in`,   median: `${comps.std.h50} in`,  score: comps.hScore },
                { key: "wScore", label: "Weight",       current: `${athlete.weight} lbs`,  median: `${comps.std.w50} lbs`, score: comps.wScore },
                { key: "sScore", label: "40-Yard Dash", current: `${athlete.speed40}s`,    median: `${comps.std.s50}s`,    score: comps.sScore },
              ].map(({ key, label, current, median, score }) => {
                const isWeak = key === weakest?.[0];
                return (
                  <div key={key}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <div style={{ width: 88, fontSize: 11, color: isWeak ? "#ef5350" : "#6b8c72", fontWeight: isWeak ? 700 : 400 }}>
                        {label}{isWeak ? " ↓" : ""}
                      </div>
                      <div style={{ flex: 1, height: 5, background: "#1e2e21", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, score * 100)}%`, background: score >= 0.5 ? "#6ed430" : "#ef5350", borderRadius: 2, transition: "width 0.4s ease" }} />
                      </div>
                      <div style={{ width: 36, fontSize: 11, color: score >= 0.5 ? "#6ed430" : "#ef5350", textAlign: "right", fontWeight: 700 }}>
                        {(score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#3a5a3e", paddingLeft: 96 }}>
                      Yours: {current} · {tierLabel} median: {median}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stay Gritty focus + training tips */}
        {weakest && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ padding: "12px 16px", background: "#130f08", border: "1px solid #3a2e10", borderRadius: 4, marginBottom: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#f5a623", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                Stay Gritty Focus: {METRIC_LABELS[weakest[0]]}
              </div>
              <div style={{ fontSize: 13, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", lineHeight: 1.6 }}>
                Your <strong style={{ color: "#f5a623" }}>{METRIC_LABELS[weakest[0]]}</strong> is
                the primary metric holding you back. Close the gap between your current number and
                the {tierLabel} median and your qualifying score will follow.
                Update your profile when you've made progress — your results will refresh automatically.
              </div>
            </div>
            {TRAINING_TIPS[weakest[0]] && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#6ed430", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
                  How to Improve Your {METRIC_LABELS[weakest[0]]}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {TRAINING_TIPS[weakest[0]].map(tip => (
                    <div key={tip.title} style={{ paddingLeft: 12, borderLeft: "2px solid #2e6b18" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#c8f5a0", marginBottom: 2, letterSpacing: 0.5 }}>{tip.title}</div>
                      <div style={{ fontSize: 12, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", lineHeight: 1.5 }}>{tip.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alternative positions */}
        {altPositions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#6ed430", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
              Positions You Already Qualify For
            </div>
            <div style={{ fontSize: 13, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", marginBottom: 10 }}>
              Based on your current measurables, you score above 50% at the Division III level in these positions:
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {altPositions.map(p => (
                <span key={p} style={{
                  padding: "5px 12px", background: "#1a2e1d", border: "1px solid #2e6b18",
                  borderRadius: 3, fontSize: 13, color: "#6ed430", fontWeight: 700, letterSpacing: 1,
                }}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Aspirational mini-table */}
        {tableSchools.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#6ed430", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
              Schools to Work Toward
            </div>
            <div style={{ fontSize: 12, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", marginBottom: 10, lineHeight: 1.5 }}>
              These {tierLabel} programs already match your academic profile and location.
              Hit the qualifying athletic threshold and they move straight into your Top Matches.
            </div>
            <div style={{ overflowX: "auto", border: "1px solid #1e2e21", borderRadius: 4 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#0a120b" }}>
                    {["School", "State", "ADLTV", "ADLTV Rank", "Dist (mi)"].map(h => (
                      <th key={h} style={{
                        padding: "6px 10px", textAlign: "left", color: "#6b8c72",
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                        letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase",
                        borderBottom: "1px solid #1e2e21",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableSchools.map((s, i) => (
                    <tr key={s.UNITID} style={{ background: i % 2 === 0 ? "transparent" : "#0a120b" }}>
                      <td style={{ padding: "6px 10px", color: "#e8edf0" }}>{s._schoolName}</td>
                      <td style={{ padding: "6px 10px", color: "#6b8c72" }}>{s.State}</td>
                      <td style={{ padding: "6px 10px", color: "#6b8c72" }}>
                        {s.adltv ? `$${Math.round(s.adltv).toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "6px 10px", color: "#6b8c72" }}>
                        {s["ADLTV Rank"] ? `#${s["ADLTV Rank"]}` : "—"}
                      </td>
                      <td style={{ padding: "6px 10px", color: "#6b8c72" }}>
                        {s.dist !== 9999 ? s.dist?.toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Support */}
        <div style={{ fontSize: 11, color: "#3a5a3e", textAlign: "center", marginBottom: 16, fontFamily: "'Barlow', sans-serif" }}>
          Support: <a href="mailto:verifygrit@gmail.com" style={{ color: "#3a5a3e" }}>verifygrit@gmail.com</a>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onEditProfile} style={{
            flex: 1, padding: "10px 20px", background: "#2e6b18", border: "1px solid #6ed430",
            borderRadius: 3, color: "#c8f5a0", fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
          }}>Update My Profile →</button>
          <button onClick={onBrowse} style={{
            padding: "10px 20px", background: "transparent", border: "1px solid #2e6b18",
            borderRadius: 3, color: "#6b8c72", fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
          }}>Home</button>
        </div>

      </div>
    </div>
  );
}
