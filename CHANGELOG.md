# Changelog

All notable changes to cfb-recruit-hub are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Apps Script: `lockService` endpoint for concurrency safety
- Apps Script: test mode for safe GAS-side unit testing without live sheet writes
- Apps Script: `version` endpoint returning deployed Code.gs version
- Apps Script: `getSAIDStats` endpoint for profile analytics
- Automation infrastructure: vitest, commitlint, husky pre-commit hooks, CI test workflows

### Changed
- README: version history section added, current version documented as v2.0.0 (Stage 1 complete)

---

## [2.0.0] - 2026-03-22

Stage 1 complete. All six auth flows verified against the live platform. BL-002 closed. Stage 2 (Supabase backend) cleared to begin.

### Added
- Pending account UX: form fields locked visually when account is in pending state; banner and actions pinned to top
- `checkEmail` correctly handles pending accounts — does not allow sign-in bypass

### Fixed
- New Profile "Stay" choice: restores original user state instead of clearing it
- Pending state visual: action buttons and banner surface at top of form; locked fields greyed out

### Changed
- BACKLOG, PROJECT_BRIEF, and TESTING_FLOWS updated to reflect Stage 1 close-out state
- Flow 1 and Flow 2 test specs corrected and re-verified against live platform
- Flow 3 spec updated to reflect magic link path (6-digit path removed in v1.1.3)
- AUTOMATION_ARCHITECTURE: decision status header corrected
- BL-004 added: Auth tab cols 13–15 missing header labels (LOW, accepted known artifact)
- BL-005 added: CI failures from retroactive tag push accepted per DEC-GLOBAL-006-B

---

## [1.2.0] - 2026-03-15

### Added
- Playwright regression suite: 4 tests covering auth, form submission, and short list persistence
- clasp config, manifest, and Apps Script project brief for local GAS development

### Changed
- Auth: removed 6-digit email change verification path; magic link is now the sole account-access flow (consolidated from v1.1.3)
- `createAccount` now returns the full profile immediately — restores UI state post-signup without a round-trip
- Architecture: Option B (Supabase backend) confirmed as next milestone (DEC-CFB-001)

### Fixed
- CI: corrected `VITE_API_BASE` secret causing failed Pages rebuilds
- CI: GitHub Pages workflow no longer cancels in-progress deploys on sequential pushes
- Removed dead `api.js` exports flagged in BL-001 audit (BL-001 closed)

---

## [1.1.5] - 2026-03-15

### Removed
- Dead `api.js` exports: `requestEmailChange` and `confirmEmailChange` — these referenced the removed 6-digit path and were unreachable after v1.1.3 (closes BL-001)

---

## [1.1.3] - 2026-03-15

### Changed
- Email change flow: removed 6-digit verification path entirely; magic link is now the sole email change mechanism
- Auth tab cols 13–15 header repair: `pendingNewEmail`, `emailVerifyCode`, `emailVerifyExpiry` header labels corrected in Code.gs

### Removed
- `requestEmailChange` and `confirmEmailChange` GAS action handlers (6-digit path)
- `MailApp` dependency from email change path

---

## [1.1.2] - 2026-03-13

### Fixed
- Orphaned pending accounts: `signIn` now detects a pending account on the incoming email and surfaces a "resend setup email" prompt instead of failing silently

---

## [1.1.1] - 2026-03-14

### Fixed
- Schema collision: Recruits tab cols 24–26 were used by both profile data and new auth fields (`lastLogin`, `lastLogout`, `loginCount`) — auth fields shifted to cols 27–29 to prevent data corruption

---

## [1.1.0] - 2026-03-14

### Added
- Agents reference dashboard in repo docs
- Platform roadmap document
- Architecture audit document (Morty initial pass)
- gas-engineer (Patch) agent definition with v1.1.x task queue and GWS CLI integration

### Fixed
- QuickListForm background image path — broken after Vite asset move

### Changed
- Settings save now routes through `handleSubmit` — GPA check and scoring correctly re-evaluated on save

---

## [1.0.0] - 2026-03-13

All six authentication flows verified end-to-end. Full platform working in production.

### Added
- GrittyOS logo in header: clickable, navigates home, preserves auth state
- BC High team photo as faint background on Settings/Profile page
- Support contact footer on all platform views and tutorial slides

### Fixed
- `Fastest Payback` panel: derives `breakEven` from `droi` when stored value is missing
- `Fastest Payback` missing from Short List Money Map on sign-in restore
- Logo broken image: moved to `src/assets`, imported via Vite
- POST→GET redirect auth failure on mobile: all auth actions now registered in `doGet` as fallback
- POST→GET redirect bug on mobile: action included in body; Code.gs reads from body with fallback
- Magic link modal title updated to "Complete Your Account Access"

---

## [0.9.0] - 2026-03-13

Auth system complete. Testing in progress.

### Added
- Full authentication system: `createAccount`, `signIn`, `signOut`, `validateToken`
- Magic link account completion flow (`?completeSAID=`)
- Pending account detection + resend setup email on sign-in
- Email change with 6-digit verification code
- Email change via magic link (`?changeEmail=`)
- Profile update (`updateRecruit`) vs new profile (`saveRecruit`) routing
- Short list persistence across sign-out/sign-in (server-synced)
- New profile while logged in — `SwitchModal` flow
- Auto-deploy via GitHub Actions on push to master
- PR review workflow (Claude) + PR template
- Six-flow auth test suite documented in `TESTING_FLOWS.txt`
- My Short List mode: drag-and-drop, CRM tracking, and Money Map
- WOW callout cards for metrics scoring at or above 75th percentile
- ADLTV Rank column in Stay Gritty aspirational schools table
- Academic eligibility GPA check with Stay Gritty modal variant
- Stay Gritty modal for athletes with no qualifying athletic tier
- Default score of 1000 note to PSAT/SAT tooltip
- GitHub Pages deployment via Actions

### Changed
- Nav: replaced mode toggle with unified nav dropdown; Sign In added as menu item
- Mobile nav: replaced 3-button mode toggle with dropdown select on screens ≤640px
- Rebrand: "My Quick List" → "My GRIT Fit"
- Rebrand: results language from "Target CFB Recruiting Matches" → "GRIT FIT"
- Onboarding: new users redirected to GRIT Fit form instead of auth modal
- "Create new account" in sign-in modal redirects to GRIT Fit form
- "Browse Schools" renamed to "Home"

### Fixed
- Short list not persisting across sign-out/sign-in
- Mobile sidebar: removed duplicate `.sidebar` class
- Mobile sidebar z-index conflict with Leaflet controls
- Mobile popup closing immediately on tap (two root causes resolved)
- Leaflet popup flash-close on mobile by disabling custom tap handler
- Mobile popup: disabled autoPan, capped popup height with scroll
- Auth: do not restore short list from localStorage without confirmed auth
- Helmet image: imported as Vite module asset; fixed GitHub Pages base URL path
- ModeToggle wrapper: replaced inline style with CSS class
- Stay Gritty modal trigger now also fires when `top50` is empty

---

## [Initial Scaffold] - pre-0.9.0

- Initial scaffold: GRIT FIT CFB Recruit Hub (`9311e1f`)
- Scoring engine, CFB map look and feel, sidebar, tutorial
- Scoring fixes: normCDF bug, lat/lng fallback
- Major platform update: UI overhaul, data alignment
- Student-Athlete Profile form with geocoding
- Recruit profile persistence with SAID update-vs-insert logic
- GRIT FIT branding in table view


[Unreleased]: https://github.com/verifygrit-admin/cfb-recruit-hub/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/verifygrit-admin/cfb-recruit-hub/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/verifygrit-admin/cfb-recruit-hub/compare/v1.1.5...v1.2.0
[1.1.5]: https://github.com/verifygrit-admin/cfb-recruit-hub/compare/v1.1.3...v1.1.5
[1.1.3]: https://github.com/verifygrit-admin/cfb-recruit-hub/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/verifygrit-admin/cfb-recruit-hub/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/verifygrit-admin/cfb-recruit-hub/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/verifygrit-admin/cfb-recruit-hub/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/verifygrit-admin/cfb-recruit-hub/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/verifygrit-admin/cfb-recruit-hub/releases/tag/v0.9.0
