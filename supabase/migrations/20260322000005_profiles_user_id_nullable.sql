-- ============================================================
-- Stage2_Step6_Precondition — profiles.user_id nullable
-- Migration: 20260322000005_profiles_user_id_nullable.sql
-- ============================================================
--
-- SCHEMA SOURCE (per PROTO-GLOBAL-010):
--   Supabase project: oeekcafirfxgtdoocael (us-east-1)
--   Table definition: supabase/migrations/20260319000003_create_profiles.sql
--   Column in question: profiles.user_id (line 30)
--     was: uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
--
-- DECISION IMPLEMENTED:
--   DEC-CFB-001 Option 1 (nullable user_id) — APPROVED
--   Rationale: profiles are created before Supabase Auth user exists
--   (SAID is assigned at saveRecruit time; auth.users row is created
--   later when the athlete completes setup via magic link). NOT NULL
--   blocks the Step 6 INSERT path.
--
-- SCOPE:
--   Single ALTER TABLE statement.
--   No other columns, tables, policies, or sequences touched.
-- ============================================================

ALTER TABLE public.profiles
  ALTER COLUMN user_id DROP NOT NULL;
