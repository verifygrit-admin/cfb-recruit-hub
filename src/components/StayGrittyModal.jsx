import { calcAthleticFit, calcAthleticComponents } from "../lib/scoring.js";
import { ATH_STANDARDS, TIER_ORDER, POSITIONS, RECRUIT_BUDGETS } from "../lib/constants.js";

const TIER_LABELS = {
  "Power 4": "Power 4", "G6": "G6",
  "1-FCS": "FCS", "2-Div II": "Division II", "3-Div III": "Division III",
};

const METRIC_LABELS = { hScore: "Height", wScore: "Weight", sScore: "40-Yard Dash" };

export default function StayGrittyModal({ results, athlete, onEditProfile, onBrowse }) {
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

  // Alternative positions at D3 that would qualify with current measurables
  const boost = results.boost || 0;
  const altPositions = POSITIONS.filter(pos =>
    pos !== athlete.position &&
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

        {/* Closest fit + component breakdown */}
        <div style={{ marginBottom: 20, background: "#0a120b", border: "1px solid #1e2e21", borderRadius: 4, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#f5a623", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Closest Fit: {tierLabel}
          </div>
          <div style={{ fontSize: 13, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", marginBottom: 14 }}>
            You scored <strong style={{ color: "#c8f5a0" }}>{(closestScore * 100).toFixed(1)}%</strong> as
            a {athlete.position} at the {tierLabel} level —
            just <strong style={{ color: "#f5a623" }}>{gapPct.toFixed(1)}%</strong> from qualifying.
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

        {/* Stay Gritty focus */}
        {weakest && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "#130f08", border: "1px solid #3a2e10", borderRadius: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#f5a623", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
              Stay Gritty Focus
            </div>
            <div style={{ fontSize: 13, color: "#6b8c72", fontFamily: "'Barlow', sans-serif", lineHeight: 1.6 }}>
              Your <strong style={{ color: "#f5a623" }}>{METRIC_LABELS[weakest[0]]}</strong> is
              the primary metric holding you back. Close the gap between your current number and
              the {tierLabel} median and your qualifying score will follow.
              Update your profile when you've made progress — your results will refresh automatically.
            </div>
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
                    {["School", "State", "ADLTV", "Dist (mi)"].map(h => (
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
          }}>Browse Schools</button>
        </div>

      </div>
    </div>
  );
}
