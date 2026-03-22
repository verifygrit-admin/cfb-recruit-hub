# Dexter — cfb-recruit-hub Project Memory
**Role**: Platform monitor
**Project**: cfb-recruit-hub
**Global memory**: `_org/memory/GLOBAL/dexter/dexter-memory.md`
**Last updated**: 2026-03-22

---

## Project State
- CI pipeline: playwright.yml (regression + smoke), commitlint.yml (PR lint), sentinel.yml (daily SAID + VITE), deploy.yml (Vitest gate). All green.
- Live URL: verifygrit-admin.github.io/cfb-recruit-hub
- VITE_API_BASE: must match live Apps Script deployment URL (currently @28)
- GitHub secrets: VITE_API_BASE, ANTHROPIC_API_KEY, TEST_EMAIL, TEST_PASSWORD, SUPABASE_DB_PASSWORD (all set)

## Current Assignment
- DEC-CFB-008 Condition 2: POST-DEPLOY PASS after Step 10 (all Playwright tests green against live)
- Step 9: verify CI green after credentials + GitHub secrets rotation
- Ongoing: post-deploy Playwright execution after every GitHub Actions deploy

## Seven-Area Audit Focus for This Project
1. Auth/Data Integrity — SAID generation, Recruits tab mapping, magic link flows
2. API Viability — VITE_API_BASE staleness detection
3. Data Pipeline Health — GrittyOS DB field completeness
4. Formula Integrity — GRIT FIT 3-gate scoring edge cases
5. Multiuser Collision — concurrent submissions, SAID auto-increment
6. Surface Stability — map markers, q_link/coach_link rendering
7. CI/CD Pipeline — deploy duration, non-200 responses, stale CDN

## Open Items
- Step 9 credentials rotation — NOT YET STARTED
- Step 10 Track A POST-DEPLOY PASS — blocked on Steps 6-9
- Sentinel.yml SCHOOL_COUNT_LOW false positive (LOW, backlog)
