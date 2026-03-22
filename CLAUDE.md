# cfb-recruit-hub — Project Context

**Repo**: `https://github.com/verifygrit-admin/cfb-recruit-hub` (public)
**Path**: `C:\Users\chris\dev\cfb-recruit-hub`
**Live**: `verifygrit-admin.github.io/cfb-recruit-hub`
**Stack**: React + Vite, Leaflet + leaflet.markercluster, Apps Script Web App backend (retiring to Supabase)
**Purpose**: Combined CFB-mapping + gritos-quicklist — browse map mode + My Quick List mode with athlete form. 661 programs, GRIT FIT Formula operational, SAID auth active.

---

## Stage 2 — Supabase Migration

**Decision**: DEC-CFB-001 confirmed Option B (Supabase). Stage 1 CLOSED (DEC-GLOBAL-018, 2026-03-19). v2.0.0 tagged on db0e70e.

**Supabase project**: `https://oeekcafirfxgtdoocael.supabase.co` (us-east-1)
**Anon key**: `sb_publishable_ig_RGk-rMMS__NcnWMPYqQ_8MY0chb4`
**CLI**: authenticated + linked. DB password in `.env.local` (gitignored).

### Schema (Steps 1-5 COMPLETE)
- `schools` (38 cols) — public SELECT, DENY writes
- `profiles` (31 cols) — owner-only SELECT/INSERT/UPDATE via `auth_said()`, DENY DELETE
- `short_list_items` (23 cols) — owner-only full CRUD including DELETE
- `auth_said()` function — extracts SAID from JWT `user_metadata`
- SAID sequence + `generate_said()` trigger — atomic, no LockService needed
- Migration files: `supabase/migrations/` (0001-0004), all PROTO-GLOBAL-010 compliant

### Translation Layer (partial)
`src/lib/api.js` — `COLUMN_MAP` + `transformSchoolRow()` written, not yet wired. Wires at Step 6 when `fetchSchools()` switches to Supabase. Option C (scoring.js snake_case refactor) backlogged for post-Stage-2.

### Active Build Sequence
Steps 1-5 (schema foundation) COMPLETE. Steps 6-10 are the active build sequence. See `ROADMAP.txt` for full detail.

**Seeding pipeline** — blocks Step 6:
- Step A: Google service account setup (BLOCKED ON CHRIS)
- Step B: 4 data fixes in Sheet (BLOCKED ON CHRIS): Bryant University UNITID, Commonwealth U dedup, PA Western U dedup, Notre Dame/UConn/UMass Type field
- Step C: `sync_schools.py` (Patch builds, NOT YET BUILT)
- Step D: Run + David verifies (661 rows, UNITID uniqueness, spot-check)

**Step 6**: api.js full rewrite — 17 functions to Supabase. Largest single step.
**Step 7**: Edge Functions (Resend email) — can parallel with Step 6.
**Step 8**: TEST_MODE routing — `profiles_test` companion table.
**Step 9**: Credentials + GitHub secrets rotation (Dexter owns).
**Step 10**: Validation — 3 parallel tracks: Quin Playwright, Morty RLS audit, Patch force reset.

### Governance Decisions (locked)
DEC-CFB-003 flat table, DEC-CFB-004 Resend, DEC-CFB-005 force reset, DEC-CFB-006 us-east-1, DEC-CFB-007 RLS policy set, DEC-CFB-008 Code.gs retirement gate (Morty PASS + Dexter POST-DEPLOY PASS).

---

## Backend — Apps Script (retiring)

**Code.gs**: v1.2.0 @33 — LockService, TEST_MODE (Option B), `?action=version`, `?action=getSAIDStats`. Stays live until Morty RLS audit PASS + Dexter POST-DEPLOY PASS (DEC-CFB-008).
**Deploy**: `cd apps-script && clasp push && clasp deploy --deploymentId AKfycbxd-fUAqlrErpUz_4j--4TkYM4xbtKgAyp6CcwhYzO_qJ1UkgQQ5bICz-SOS_l_aTM9 --description "..."` — clasp authenticated as `chris@thinkwellspring.com`, Script ID in `apps-script/.clasp.json`
**Live deployment**: @28, deployment ID `AKfycbxd-fUAqlrErpUz_4j--4TkYM4xbtKgAyp6CcwhYzO_qJ1UkgQQ5bICz-SOS_l_aTM9`
**Sheet**: GrittyOS DB (`1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo`)
**Sheet structure**: Recruits tab cols 1-23 (profile) + 24-26 (status/pendingToken/pendingTokenExpiry); Auth tab cols 1-12 (existing) + 13-15 (pendingNewEmail/emailVerifyCode/emailVerifyExpiry)

---

## Frontend Deploy

**Method**: GitHub Actions `deploy.yml` builds from master on every push using `VITE_API_BASE` secret → deploys via `actions/deploy-pages`. Do NOT use `npx gh-pages` — it pushes to gh-pages branch which is NOT the live source.
**GitHub secret `VITE_API_BASE`**: must match live Apps Script deployment URL. Update via `gh secret set VITE_API_BASE --repo verifygrit-admin/cfb-recruit-hub --body "...url..."` then push empty commit to trigger rebuild.
**GitHub secrets**: VITE_API_BASE, ANTHROPIC_API_KEY, TEST_EMAIL, TEST_PASSWORD, SUPABASE_DB_PASSWORD (all set)
**Local git identity**: `user.email = verifygrit-admin@users.noreply.github.com`

---

## CI Pipeline

- `playwright.yml` — post-deploy regression + smoke
- `commitlint.yml` — PR lint
- `sentinel.yml` — daily SAID + VITE checks
- Vitest as pre-deploy gate in `deploy.yml`
- All green.

---

## Data Source of Truth

**Google Sheet** (ID: `1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo`, tab: GrittyOS DB). CSV in recruitingq-url-extract is a PIPELINE ARTIFACT, never a source of truth. Sheet tabs: acad_dict, acad_standards_test, SAT_percent, GrittyOS DB, 0. QL Calc. Acad_rigor values are static (pre-computed, not live formulas).

**Sync architecture (approved)**: Option A — Sheet → Supabase via Python + gspread. Google service account required (Chris action, not yet set up). `sync_schools.py` not yet built.

---

## Agent Ownership Map

| Agent | Scope | Trigger |
|-------|-------|---------|
| **Patch** | Code.gs, apps-script/, Sheets data layer, clasp deploy, sync_schools.py, api.js rewrite, Edge Functions | `patch -` |
| **Dexter** | Platform health audit, CI/CD monitoring, post-deploy Playwright, PASS gate for Rio | `dexter -` |
| **Morty** | Architecture audit, RLS audit (DEC-CFB-008 Condition 1) | `morty -` |
| **Rio** | Version tagging, Code.gs commit+push after Dexter PASS | `rio -` |
| **Quin** | Test coverage, Playwright suite (4 tests), Vitest scoring (16 tests), QA-SPEC-001 | `quin -` |
| **David** | GrittyOS DB integrity, seeding acceptance, IPEDS sync | `david -` |
| **Nova** | Executes on Patch's instruction. If Patch unavailable, executes with Gate 8 decision record + Gate 7 spec as baseline. No architecture decisions — escalates to Scout. | Main instance — no trigger |

Agent-specific rules are in `.claude/rules/` (dexter-rules.md, morty-rules.md, patch-rules.md, rio-rules.md).

---

## Hotfix Queue (Patch owns)

- **v1.1.2** (HIGH) — Orphaned profiles on GPA-fail and no-top50 paths
- **v1.1.3** (HIGH) — Email change path ambiguity + Auth tab cols 13-15 header repair (DEC-CFB-002)
- **v1.1.4** (MEDIUM) — Remove or implement 6-digit verify modal

---

## Testing State

- **Playwright**: 4 tests passing
- **Vitest**: 16 scoring tests passing
- **BL-002**: CLOSED
- **QA-SPEC-001**: Drafted (schema verification + post-seed integrity tests). Quin's D3 api.js return-shape test plan accepted (DEC-GLOBAL-032).
- **Flow 6**: DONE (commit 25373d9)
- **Flows 1-5**: Code complete, not yet run against live platform — must run before Stage 2 close (Step 10 Track A)

---

## Email / Domain

- **Resend**: API key `re_3PhfNzAJ_MDLAi8a9Pc5B7CJEH2HAqZMo`, sender `noreply@grittyfb.com`, domain verified. Key stored as Supabase secret at Step 7 — not in code, not in GitHub secrets.
- **Custom domain**: `grittyfb.com` (owned by Chris, Resend verified). Not yet pointed at GitHub Pages. Vercel migration planned post-Stage-2.

---

## Key File Paths

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main application component |
| `src/lib/scoring.js` | GRIT FIT Formula (3-gate scoring) |
| `src/lib/constants.js` | Configuration constants |
| `src/lib/api.js` | API layer (Apps Script now, Supabase at Step 6) |
| `src/components/MapView.jsx` | Leaflet map with school markers |
| `src/components/QuickListForm.jsx` | Athlete profile form |
| `src/components/ResultsTable.jsx` | GRIT FIT results display |
| `apps-script/Code.gs` | Apps Script backend (retiring) |
| `ROADMAP.txt` | Stage 2 roadmap (cold-start pickup guide) |
| `BACKLOG.txt` | Non-blocking backlog items |
| `TESTING_FLOWS.txt` | Flow descriptions and pass criteria |

---

## Open Flags

- **profiles.user_id NOT NULL** → Option 1 (nullable) APPROVED, execution deferred to build resumption (Patch owns, migration 0005)
- **Patch user_id migration** must execute before Step 6
- **Google service account** + **Sheet data fixes** — both BLOCKED ON CHRIS, both block seeding pipeline
- **Rio D2** (version milestone structure) — overdue, needed before Step 6 first commit
- **Quin D3** (api.js return-shape tests) — accepted (DEC-GLOBAL-032), gates Step 6 done condition

---

## Push Targets

| Target | Check Shape |
|--------|-------------|
| GitHub | `git push` to origin — verify: `git status` + `git log origin/HEAD..HEAD` |
| Apps Script | `clasp push` + `clasp deploy` — paired operation per Event #3 |
| Supabase migrations | `supabase db push` — PUSH CHECK fires before (pending check shape at Gate 8) |
