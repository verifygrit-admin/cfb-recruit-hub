# Morty — cfb-recruit-hub Project Memory
**Role**: Architecture auditor
**Project**: cfb-recruit-hub
**Global memory**: `_org/memory/GLOBAL/morty/morty-memory.md`
**Last updated**: 2026-03-23

---

## Project State
- Stage 2 Supabase migration in progress. Steps 1-7 code COMPLETE (PRs pending merge).
- Step 6 branch: feature/step-6-api-rewrite (api.js full rewrite — 19 functions, COLUMN_MAP, transformSchoolRow)
- Step 7 branch: feature/step-7-edge-functions (contains both Step 6 and Step 7 work per commit 9482641)
- Master currently at c37a785

## Schema Summary (Steps 1-7)
- schools (38 cols): public SELECT, DENY writes. COLUMN_MAP verified against table.
- profiles (31 cols): owner-only SELECT/UPDATE via auth_said(), INSERT open, DELETE blocked
- short_list_items (23 cols): owner-only full CRUD via auth_said()
- auth_said(): reads `current_setting('request.jwt.claims', true)::json->>'said'` — PC-4 CLOSED (live-tested)
- Migrations 0001-0006 deployed. 0005 made user_id nullable. 0006 added 3 SECURITY DEFINER RPCs.

## SECURITY DEFINER RPCs (migration 0006)
- get_said_stats() — anon + authenticated, reads profiles count/latest
- verify_pending_token(p_said, p_token) — anon + authenticated, validates pending token, returns email
- check_email_exists(p_email) — anon + authenticated, checks profiles for email existence

## Edge Functions (Step 7)
- send-pending-account: sends setup email via Resend. Called by saveRecruit() + resendSetupEmail(). NO JWT validation in function body.
- send-email-change: deployed but NOT called from api.js (Supabase built-in flow used instead).
- send-password-reset: deployed but NOT called from api.js (Supabase built-in flow used instead).

## Known Gaps (from 2026-03-23 spot-check)
1. resendSetupEmail() (api.js line 814) calls send-pending-account WITHOUT `said` in body — Edge Function requires said, will return 400. Email won't send on resend path.
2. All 3 Edge Functions lack JWT validation in function body — rely on platform-level enforcement (not verifiable from code alone).
3. resendSetupEmail() profiles UPDATE uses .eq("email",...).eq("status","pending") without auth context — RLS will silently reject unless called from authenticated session.
4. enable_confirmations = false in config.toml (local) — live Supabase project setting must match for createAccount/completePendingAccount to work.
5. send-email-change and send-password-reset are deployed but unused by api.js at Stage 2.
6. fetchTracker() is a stub returning {} — tracker table not yet in Supabase schema.

## Current Assignment
- DEC-CFB-008 Condition 1: Full RLS audit PASS — Step 10 Track B (not yet begun)
- Pre-Step 8 gate spot-check: COMPLETE 2026-03-23 — verdict: PASS WITH CONDITIONS (see spot-check report)

## RLS Interaction Patterns (api.js)
- saveRecruit(): INSERT open (profiles_insert_open WITH CHECK true) — correct
- updateRecruit(): UPDATE requires auth session (auth_said() must match said) — correct
- saveShortList(): DELETE then INSERT, owner_delete + owner_insert policies — correct
- getShortList(): SELECT owner_select policy — correct
- createAccount(): direct profiles UPDATE after signUp — correct IF enable_confirmations=false
- completePendingAccount(): uses verify_pending_token RPC (anon), then signUp, then direct UPDATE — correct
