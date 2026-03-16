# GrittyOS — CFB Recruit Hub

**A recruiting intelligence platform for high school football student-athletes — built to surface realistic, high-value program matches based on athletic fit, academic credentials, geographic reach, and household financial data.**

**[Live Tool → verifygrit-admin.github.io/cfb-recruit-hub](https://verifygrit-admin.github.io/cfb-recruit-hub/)**

> **This is not a recruiting service and not a scouting service.** This tool does not connect athletes to coaches, evaluate player talent, or facilitate contact between any parties. It is a data-driven research and decision-support tool. Use it to build a realistic school list, understand your financial picture, and take direct action through recruiting questionnaire links.

---

## The Problem This Solves

The conventional wisdom in college football recruiting drives most families toward a single outcome: a Division I scholarship offer. This is what we call the **Golden Opportunity** — real for a small number of elite athletes, but statistically unavailable for the vast majority of talented student-athletes. Families spend years optimizing for scholarship dollars and division labels while overlooking something far more durable: the long-term institutional value of the degree itself.

The **Platinum Opportunity** is GrittyOS's reframe. A student-athlete who attends a highly selective institution — even without a full scholarship, even in Division III or FCS — often emerges with greater career earnings, stronger alumni networks, and better long-term outcomes than a peer who waited years for a D1 offer to a less selective school. The **ADLTV (Adjusted Degree Lifetime Value)** metric embedded across this platform is designed to make that argument visible and quantifiable across all 661 NCAA football programs.

The Platinum Opportunity is not a consolation prize. In many cases, it is the better deal.

---

## Who This Is For

### Student-Athletes & Families
- Run the GRIT FIT Formula to get a personalized list of programs where you are a realistic fit athletically, academically, and geographically
- See your projected net cost and degree ROI for every matched school when household financial data is provided
- Access recruiting questionnaires and coaching staff directories directly from every program card
- Browse all 661 programs on a filterable map to research schools you may never have considered

### High School Coaches
- Surface realistic fits for players across the full spectrum of ability and academic profile
- Use the ADLTV rank filter to identify high-value programs regardless of division label
- Access recruiting questionnaire links directly from any program card

### College Football Coaches
- Understand the competitive landscape by division, conference, selectivity, and financial profile
- See how your program's ADLTV rank and admissions tier compare to peers across the country

---

## Platform Modes

### Browse Schools
An interactive map of all 661 NCAA football programs. Markers are color-coded by division tier. Click any school to view a details card showing conference, admissions selectivity, ADLTV, ADLTV Rank, admission rate, graduation rate, cost of attendance, and estimated average merit aid. Filter the map by division tier, admissions selectivity, conference, ADLTV rank, state, or school name.

### My Quick List
Enter a Student-Athlete Profile to run the GRIT FIT Formula. The form collects identity (name, high school, state, graduation year, email, phone, Twitter/X), athletic measurables (position, height, weight, 40-yard dash), academic credentials (GPA, PSAT/SAT), optional household financial data (AGI, dependents), and athletic awards. High school location is geocoded automatically using the school name and state to calculate precise recruiting reach distances.

Every program is scored and ranked. The top 50 matches are displayed on the map and in a sortable results table. Three personal score metrics appear in the dashboard above the table. Provide household AGI and dependents to unlock net cost and ROI projections for every matched school.

Submitted profiles are assigned a unique **Student-Athlete ID (SAID)** in the format `GRIT-[Year]-[NNNN]` and saved to the GrittyOS Master DB. Re-submitting an edited profile updates the existing record. Use **New Profile** to start fresh with a new SAID — treated as a distinct athlete entry.

---

## The GRIT FIT Formula

The formula filters and ranks programs across three sequential gates:

### Gate 1 — Athletic Tier Match
The athlete's position metrics (height, weight, 40-yard dash) are scored against the median standards at each division tier using a normal distribution (matching `NORM.DIST` in Google Sheets). Award bonuses are applied on top: Expected Starter (+5%), Captain (+5%), All-Conference (+10%), All-State (+15%). The athlete is assigned to the highest tier where their boosted score exceeds 50%.

**Tiers:** Power 4 · G6 · FCS · Division II · Division III

### Gate 2 — Recruit Reach
Coaches recruit within a realistic geographic radius based on their program's tier budget. Distance is calculated as straight-line miles (Haversine formula) from the athlete's high school to campus. Programs beyond the tier's reach radius are excluded.

| Tier | Reach Radius |
|---|---|
| Power 4 | 2,500 mi |
| G6 | 1,500 mi |
| FCS | 1,000 mi |
| Division II | 600 mi |
| Division III | 450 mi |

### Gate 3 — Academic Fit
The athlete's academic score is compared to each school's admissions threshold for their graduation year class. For test-optional schools, the GPA-only score is used. A school passes this gate only if the athlete's score meets or exceeds the school's threshold — meaning the athlete is academically credible to the program.

**Academic Rigor Score** — `(SAT percentile + GPA percentile) / 2`
**Test Optional Score** — GPA percentile only

### Ranking — Top 50 by Academic Rigor
Eligible schools are sorted by academic rigor fit (most demanding to least). This surfaces the programs where the athlete's credentials are the strongest match relative to admissions standards. The top 50 are assigned match tiers:

| Rank | Tier | Map Color |
|---|---|---|
| 1–30 | Top Match | Green |
| 31–40 | Good Match | Gold |
| 41–50 | Borderline | Red |

---

## Score Dashboard

Three personal scores appear above the results table after running My Quick List:

**My Athletic Score** — The athlete's boosted athletic fit score at their matched division tier, expressed as a percentile. Reflects how the athlete's measurables compare to the competition at that level.

**My Academic Rigor Score** — The combined SAT + GPA composite percentile. Used to rank and sort all matched programs from most to least academically demanding.

**My Test Optional Score** — The GPA-only academic score. Applied automatically for schools with test-optional admissions policies.

---

## Financial Data

Financial columns unlock when AGI and number of dependents are entered in the athlete profile. All calculations are modeled after the GrittyOS DB formula sheet.

### ADLTV — Adjusted Degree Lifetime Value
GrittyOS's core proprietary metric. Estimates the lifetime earnings premium associated with each institution's degree, adjusted downward by the school's graduation rate:
```
ADLTV = DLTV x Graduation Rate
```
A school with strong earnings outcomes but a low graduation rate is penalized — the adjustment reflects the realistic probability of actually capturing that value. This metric is the engine behind the Platinum Opportunity thesis: it cuts across division labels to reveal which programs deliver the most durable long-term return regardless of athletic tier.

### Expected Family Contribution (EFC / SAI)
Determined by a lookup table keyed to household AGI and number of dependents (1–4). Eligibility thresholds differ by school control type — public, private, and elite (Super Elite / Elite / Very Selective) schools each have separate aid eligibility cutoffs.

### Net Cost
Projected 4-year out-of-pocket cost after EFC and estimated merit aid:
```
Net Cost = (EFC x 4 x 1.18) - Merit Deduction
```
The 1.18 multiplier accounts for annual cost inflation. Merit deduction is applied when the school's average merit award exceeds the student's need gap.

### Athletic Scholarship
FBS programs (Power 4 and G6) are assumed to offer full cost-of-attendance scholarships. FCS programs are modeled at 60% COA, Division II at 30%. Ivy League and Pioneer League programs offer no athletic aid.

### DROI — Degree Return on Investment
```
DROI = ADLTV / Net Cost (4-year)
```
Higher is better. Measures how much lifetime value is generated per dollar invested. A DROI of 5x means the degree is projected to return $5 in lifetime earnings premium for every $1 spent net of aid. This is the single most important financial signal for evaluating whether a school is genuinely worth pursuing.

### Break-Even
```
Break-Even = 40 / DROI  (years)
```
The estimated number of years post-graduation to fully recover the 4-year net investment. A shorter break-even means faster financial payback and lower long-term risk.

---

## Results Table Columns

| Column | Description |
|---|---|
| Target Rank | Personalized rank among eligible programs, sorted by academic rigor fit |
| Match | Top Match (1–30) · Good Match (31–40) · Borderline (41–50) |
| School | Institution name |
| Div | NCAA Division classification |
| Conf | Athletic conference |
| Dist (mi) | Straight-line miles from athlete's high school to campus |
| Test Opt | Yes = test-optional admissions; GPA-only score used for matching |
| COA (OOS) | Annual Cost of Attendance out-of-state |
| ADLTV | Adjusted Degree Lifetime Value |
| Net Cost | Projected 4-year net cost after EFC and merit aid |
| DROI | Degree ROI — ADLTV divided by 4-year net cost |
| Break-Even | Estimated years to recover the 4-year net investment |
| Recruit Quest. | Direct link to submit a recruiting questionnaire to the coaching staff |
| Coaching Staff | Link to the football staff directory |

---

## Tech Stack

- **Frontend:** React + Vite
- **Map:** Leaflet + leaflet.markercluster
- **Backend:** Google Apps Script Web App (reads school data from GrittyOS Master DB; writes recruit profiles to a dedicated Recruits tab with auto-generated SAIDs and server-side timestamps; supports insert and update operations)
- **Data:** GrittyOS Master DB — 661 NCAA football programs with academic, financial, athletic, and recruiting data

## Setup

1. Deploy `apps-script/Code.gs` as a Google Apps Script Web App (Execute as: Me · Access: Anyone)
2. Copy the Web App URL into `.env`:
   ```
   VITE_API_BASE=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
3. Place `helmet.png` in `/public/`
4. `npm install && npm run dev`

> The **Recruits** tab in the connected Google Sheet is created automatically on the first profile submission. No manual sheet setup required. To reset recruit data, rename the existing tab (e.g. `Recruits_Archive`) and the script will create a fresh tab on the next submission.

---

## Data Sources

| Field | Source |
|---|---|
| Division, Conference | NCAA / GrittyOS internal database |
| Admission Rate, Graduation Rate, COA | IPEDS (Integrated Postsecondary Education Data System) |
| Geographic Coordinates | IPEDS institution coordinates |
| ADLTV, ADLTV Rank | GrittyOS proprietary model |
| Merit Aid | IPEDS institutional grant aid averages |
| Recruiting Questionnaire URLs | Manually collected from athletic department websites |
| Academic Selectivity Tier | GrittyOS classification derived from IPEDS admission rates |
| Athletic Standards (h/w/speed) | GrittyOS position standards database by division tier |

---

## About GrittyOS

GrittyOS is a college football recruiting advisory consortium and open-source platform that helps student-athletes and families navigate selective colleges offering partial or no athletic scholarships. We use data analysis, financial modeling, and recruiting strategy to identify market inefficiencies in college admissions and athletic recruiting — and help families capitalize on them.

**[https://www.skool.com/verify-grit-2176](https://www.skool.com/verify-grit-2176)** | Built by [Chris Conroy](https://beacons.ai/coachconroy)

---

*661 programs · FBS through Division III · All 50 states · Updated March 2026*

---

## Version History

> **Current version: v2.0.0** — Stage 1 complete. All auth and profile flows verified against live platform. Stage 2 (Supabase migration) cleared to plan.

---

### v2.0.0 — Stage 1 Close-Out *(2026-03-22)*
**Status: Current**

Stage 1 milestone release. All six TESTING_FLOWS verified against the live platform by Chris Conroy. MailApp OAuth authorization confirmed and re-auth procedure documented. Pending account UX hardened. `checkEmail` updated to detect pending accounts and prevent duplicate SAIDs. Sage strategic brief and Morty architecture flags filed as Stage 2 kickoff inputs.

- All TESTING_FLOWS.txt flows [x]: Submit New Profile (Flow 1), Magic Link Completion (Flow 2), Email Change (Flow 3), Silent Profile Update (Flow 4), GPA-Fail Path (Flow 5), Short List Persistence (Flow 6)
- MailApp OAuth authorized; `script.send_mail` scope confirmed live; re-auth procedure documented in Code.gs header
- Pending account state: form fields visually locked, green status banner, Resend Setup Email + Start Over at top
- `checkEmail` now checks Recruits tab for pending accounts — prevents duplicate SAID on re-submission
- GAS deployment @32; frontend commit db0e70e

---

### v1.2.0 — CI/CD Stability *(2026-03-22)*
Deploy workflow updated to not cancel in-progress GitHub Pages deploys on sequential pushes. Prevents race conditions on rapid push sequences.

---

### v1.1.5 — Dead Code Removal *(2026-03-22)*
Removed dead `requestEmailChange` and `confirmEmailChange` exports from `api.js` (BL-001). Flagged by Patch in v1.1.4 audit; confirmed safe by Dexter before removal.

---

### v1.1.3 — Email Change Module (Magic Link) *(2026-03-22)*
Removed 6-digit email change verification path. Retained and stabilized magic link path only (`requestEmailChangeMagicLink` / `confirmEmailChangeMagicLink`). Auth tab cols 13–15 header labels repaired. `pendingToken` / `pendingTokenExpiry` system confirmed operational.

---

### v1.1.2 — Orphaned Profile Recovery *(2026-03-13)*
Added detection for orphaned pending accounts on sign-in. Added Resend Setup Email flow for users who lost or never received their magic link. Prevents users from being permanently locked out of a pending SAID.

---

### v1.1.1 — Recruits Schema Repair *(2026-03-14)*
Moved auth session fields from Recruits cols 24–26 to cols 27–29 to make room for `status`, `pendingToken`, and `pendingTokenExpiry`. `repairRecruitsHeaders()` utility added for one-time migration. Required manual run in Apps Script editor after deploy.

---

### v1.1.0 — Architecture Baseline *(2026-03-14)*
Added agents reference documentation, platform roadmap, background image fix, and architecture audit output. Foundation for team-based development workflow.

---

### v1.0.0 — Initial Launch *(2026-03-13)*
Settings page wired through `handleSubmit` for GPA check and scoring. Full GRIT FIT Formula operational end-to-end. SAID auth system live. 661 programs, all map and results table features active.

---

### v0.9.0 — Pre-Launch *(2026-03-13)*
Pre-release build. Orphan pending account detection added; resend setup email flow introduced. Not publicly promoted.
