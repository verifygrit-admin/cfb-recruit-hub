# GrittyOS — CFB Recruit Hub

A recruiting intelligence platform for high school football student-athletes. Combines a full NCAA program map with a personalized matching engine — the **GRIT FIT Formula** — that scores every eligible program against an athlete's athletic metrics, academic profile, geographic reach, and household financial data.

---

## Platform Modes

### Browse Schools
An interactive map of all 661 NCAA football programs across every division. Markers are color-coded by division tier. Click any school to view a details card showing conference, admissions selectivity, ADLTV, ADLTV Rank, admission rate, graduation rate, cost of attendance, and estimated average merit aid. Filter the map by division tier, admissions selectivity, conference, ADLTV rank, state, or school name.

### My Quick List
Enter an athlete profile to run the GRIT FIT Formula. Every program is scored and ranked. The top 50 matches are displayed on the map and in a sortable results table. Three personal score metrics appear in the dashboard above the table.

---

## The GRIT FIT Formula

The formula filters and ranks programs across five sequential gates:

### Gate 1 — Athletic Tier Match
The athlete's position metrics (height, weight, 40-yard dash) are scored against the median standards at each division tier using a normal distribution (matching `NORM.DIST` in Google Sheets). Award bonuses are added on top: Expected Starter (+5%), Captain (+5%), All-Conference (+10%), All-State (+15%). The athlete is assigned to the highest tier where their boosted score exceeds 50%.

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

Financial columns appear in the results table when AGI and number of dependents are entered in the athlete profile. All calculations are modeled after the GrittyOS DB formula sheet.

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

### ADLTV — Adjusted Degree Lifetime Value
The estimated lifetime earnings premium from graduating from this institution, adjusted downward by the school's graduation rate:
```
ADLTV = DLTV x Graduation Rate
```
A school with high earnings outcomes but a low graduation rate is penalized — the adjustment reflects the realistic probability of actually capturing that value.

### DROI — Degree Return on Investment
```
DROI = ADLTV / Net Cost (4-year)
```
Higher is better. Measures how much lifetime value is generated per dollar invested. A DROI of 5x means the degree is projected to return $5 in lifetime earnings premium for every $1 spent net of aid.

### Break-Even
```
Break-Even = 40 / DROI  (years)
```
The estimated number of years post-graduation to fully recover the 4-year net investment based on the degree's earnings premium. A shorter break-even means faster financial payback.

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
- **Backend:** Google Apps Script Web App (read/write to GrittyOS DB Google Sheet)
- **Data:** GrittyOS DB — 661 NCAA football programs with academic, financial, athletic, and recruiting data

## Setup

1. Deploy `apps-script/Code.gs` as a Google Apps Script Web App (Execute as: Me · Access: Anyone)
2. Copy the Web App URL into `.env`:
   ```
   VITE_API_BASE=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
3. Place `helmet.png` in `/public/`
4. `npm install && npm run dev`
