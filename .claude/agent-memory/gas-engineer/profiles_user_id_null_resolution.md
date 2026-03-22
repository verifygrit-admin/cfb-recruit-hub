---
name: profiles user_id NOT NULL — approved resolution
description: Finding and approved fix for Supabase profiles.user_id NOT NULL constraint that blocks saveRecruit() at Step 6. Migration deferred to cfb-recruit-hub build session.
type: project
---

# profiles.user_id NOT NULL — Finding and Approved Resolution

**Status:** APPROVED — deferred to cfb-recruit-hub build session
**Severity:** HIGH (was blocking Step 6)
**Flag state:** RESOLVED — resolution approved, execution pending

---

## 1. THE FINDING

**Source read:** `supabase/migrations/20260319000003_create_profiles.sql`, line 30

```sql
user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
```

**What this means in practice:**

The current GAS `saveRecruit()` function (Code.gs, line 188) creates a recruit profile row — name, email, SAID, status="pending", pendingToken, pendingTokenExpiry — and sends a setup email. At this point no Supabase auth account exists. The recruit has not yet set a password. Auth account creation happens later, in `completePendingAccount()` (Code.gs, line 678), after the recruit clicks the setup link and submits a password.

When the migration to Supabase executes (Step 6, api.js rewrite), any `INSERT INTO profiles` call from `saveRecruit()` will fail at the Postgres constraint level because `user_id` is `NOT NULL` and there is no auth user to reference yet. This is a hard failure — no profile is created, the SAID is never returned, the setup email is never sent.

**Scope:** Every first-time profile submission hits this path. Every recruit on the platform uses `saveRecruit()` as their entry point. This is not an edge case — it is the primary flow.

---

## 2. THE APPROVED RESOLUTION — Option 1

**Decision:** Make `user_id` nullable. Profiles are created without a user_id. The user_id is written after auth account creation via `completePendingAccount`.

### Migration file to create

**Filename:** `supabase/migrations/0005_allow_null_user_id.sql`
(Exact name is flexible — follow the existing migration numbering convention in `supabase/migrations/`)

**Migration content (template — verify against live schema before executing):**

```sql
-- Migration: allow_null_user_id
-- Approved resolution for profiles.user_id NOT NULL constraint.
-- Rationale: saveRecruit() creates profiles before auth accounts exist.
-- user_id is set later by completePendingAccount after password creation.
-- DEC: approved by Chris, 2026-03-22.

ALTER TABLE public.profiles
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;
```

**Why ON DELETE SET NULL instead of CASCADE:** If a Supabase auth user record is deleted, CASCADE would delete the entire recruit profile — all their data, their SAID, their short list. SET NULL preserves the profile row and its SAID, leaving user_id null. This matches the GAS behavior where a profile exists independently of auth state.

### Code.gs change required — completePendingAccount

When `completePendingAccount()` is ported to the Supabase path, it must include a step to write `user_id` to the existing profile row after the auth user is created. The current GAS function (Code.gs, line 706) writes `status = "active"` and clears `pendingToken`/`pendingTokenExpiry` on the Recruits sheet. The Supabase equivalent must also `UPDATE profiles SET user_id = [auth.uid()] WHERE said = [said]`.

**Sequence in Supabase path:**
1. `INSERT INTO profiles` (user_id NULL, status="pending", pending_token, etc.) — at form submit
2. Send setup email with pendingToken
3. Recruit clicks link, submits password
4. Create Supabase auth user → get auth uid
5. `UPDATE profiles SET user_id = [uid], status = "active", pending_token = null, pending_token_expiry = null WHERE said = [said]`

---

## 3. WHEN THIS EXECUTES

**Pre-condition for:** Step 6 (api.js rewrite — switching `fetchSchools()` and profile writes from GAS to Supabase)

**Does not execute until:** cfb-recruit-hub build work resumes. Chris routes the execution.

**Session pickup:** When build resumes, this migration runs before any Supabase profile write is wired. The sequence is:
1. Run `0005_allow_null_user_id.sql` via Supabase CLI (`supabase db push` or `supabase migration up`)
2. Verify via Supabase dashboard or psql: `\d profiles` — confirm user_id is nullable and FK is ON DELETE SET NULL
3. Proceed with Step 6 api.js wiring

**No Code.gs changes required** for this resolution — the GAS layer is unaffected. This is purely a Supabase schema fix and a future `completePendingAccount` Supabase-path requirement.

---

## 4. SEVERITY AND STATUS

| Field | Value |
|-------|-------|
| Severity | HIGH |
| Status | APPROVED — deferred |
| Flag | RESOLVED — no longer an open flag |
| Decision date | 2026-03-22 |
| Approved by | Chris |

**Why:** The resolution is approved and the path is clear. This is not an open question requiring a decision. It is an approved, scoped migration waiting for the build session to resume. No blocking items remain.

---

## 5. FILES INVOLVED

| File | Role |
|------|------|
| `supabase/migrations/20260319000003_create_profiles.sql` | Source of the constraint (line 30) — do not modify this file |
| `supabase/migrations/0005_allow_null_user_id.sql` | Migration to create at execution time |
| `apps-script/Code.gs` — `completePendingAccount()` (line 678) | Reference for the Supabase-path equivalent — must UPDATE user_id after auth creation |
| `src/lib/api.js` | Where the Supabase profile INSERT will live at Step 6 |

---

**Why:** profiles.user_id NOT NULL constraint; Supabase rejects INSERT when no auth user exists.
**How to apply:** Run migration 0005 before wiring any Supabase profile write in api.js. Confirm user_id is nullable before Step 6 proceeds.
