# Morty — cfb-recruit-hub Project Memory
**Role**: Architecture auditor
**Project**: cfb-recruit-hub
**Global memory**: `_org/memory/GLOBAL/morty/morty-memory.md`
**Last updated**: 2026-03-22

---

## Project State
- Stage 2 Supabase migration in progress. Steps 1-5 (schema) COMPLETE.
- Supabase schema: schools (38 cols), profiles (31 cols), short_list_items (23 cols)
- RLS policies deployed: public SELECT on schools, owner-only on profiles/short_list_items
- auth_said() function + SAID sequence + generate_said() trigger operational

## Current Assignment
- DEC-CFB-008 Condition 1: RLS audit PASS on final Supabase policies — Step 10 Track B
- Available for spot-checks during Step 6 if Patch surfaces structural questions

## Audit Scope for This Project
- Four-section audit: Foundation, Integration, Surface, Gaps & Observations
- Output: ARCHITECTURE_AUDIT.txt in repo root
- Key files to audit: src/lib/api.js (17 functions rewriting), src/lib/scoring.js (3-gate GRIT FIT), apps-script/Code.gs (retiring)

## Open Items
- RLS audit timing: after Step 6 (api.js rewrite) is complete and before Code.gs retirement
- Migration files in supabase/migrations/ (0001-0004) — all PROTO-GLOBAL-010 compliant
