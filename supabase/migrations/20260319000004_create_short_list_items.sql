-- ============================================================
-- Stage2_Step5_short_list_items
-- Migration: 20260319000004_create_short_list_items.sql
-- ============================================================
--
-- SCHEMA SOURCES (per PROTO-GLOBAL-010):
--   Primary:   apps-script/Code.gs  saveShortList()  lines 337-381
--              headers array lines 348-353; appendRow() lines 356-378
--   Secondary: src/components/ShortList.jsx
--              field references: netCost, adltv, droi, breakEven,
--              matchRank, matchTier, crm_contacted, crm_applied,
--              crm_offer, crm_committed, _schoolName, _divLabel,
--              Conference, State, _coaNum, _qLink, _coachLink
--
-- DECISIONS IMPLEMENTED:
--   DEC-CFB-003: Flat table (Option A — one row per athlete-school pair)
--   DEC-CFB-007: RLS policy — owner-only full CRUD via auth_said() = said
--   FLAG 2 (Gate 8): saveShortList() uses DELETE WHERE said = auth_said()
--                    then INSERT. RLS DELETE policy must be included.
--
-- SCHEMA RECONCILIATION NOTES:
--   Code.gs saveShortList() writes 21 columns. The Gate 7 / Gate 8 spec
--   listed 15. The 6 columns present in Code.gs but absent from the spec
--   are included here because Code.gs is the authoritative source:
--     div          (s._divLabel)   -- division label
--     conference   (s.Conference)  -- conference name
--     grad_rate    (s.gradRate)    -- graduation rate
--     coa          (s._coaNum)     -- cost of attendance (raw)
--     q_link       (s._qLink)      -- recruiting questionnaire URL
--     coach_link   (s._coachLink)  -- coaching staff page URL
--   Naming: Code.gs uses camelCase headers (schoolName, matchRank, etc.).
--   This migration uses snake_case per Postgres convention.
--
-- RLS DEPENDENCY:
--   auth_said() function must exist before this migration runs.
--   It is created in: 20260319000002_create_auth_said.sql
--
-- FK NOTE:
--   unitid intentionally has NO foreign key constraint to the schools
--   table. School data originates from the GrittyOS Sheet/CSV pipeline
--   and may not be fully seeded in Supabase at the time short list rows
--   are written. Referential integrity is enforced at the application layer.
-- ============================================================


-- ── TABLE ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.short_list_items (
  id            bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Athlete identifier (links to auth_said() for RLS)
  said          text         NOT NULL,

  -- School identifier — no FK; school data comes from Sheet/CSV pipeline
  unitid        integer      NOT NULL,

  -- School display fields (denormalized for fast reads without a join)
  school_name   text,
  div           text,
  conference    text,
  state         text,

  -- GRIT Fit scoring outputs
  match_rank    integer,
  match_tier    text,

  -- Financial metrics
  net_cost      numeric,
  droi          numeric,
  break_even    numeric,
  adltv         numeric,
  grad_rate     numeric,
  coa           numeric,

  -- Distance
  dist          numeric,

  -- Links
  q_link        text,
  coach_link    text,

  -- CRM tracking flags
  crm_contacted boolean      NOT NULL DEFAULT false,
  crm_applied   boolean      NOT NULL DEFAULT false,
  crm_offer     boolean      NOT NULL DEFAULT false,
  crm_committed boolean      NOT NULL DEFAULT false,

  -- Timestamps
  added_at      timestamptz  NOT NULL DEFAULT now(),

  -- Uniqueness: one row per athlete-school pair
  CONSTRAINT short_list_items_said_unitid_key UNIQUE (said, unitid)
);

-- Index on said for RLS filter performance
CREATE INDEX IF NOT EXISTS short_list_items_said_idx
  ON public.short_list_items (said);


-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.short_list_items ENABLE ROW LEVEL SECURITY;

-- SELECT: athlete can read their own rows only
CREATE POLICY "owner_select"
  ON public.short_list_items
  FOR SELECT
  USING (auth_said() = said);

-- INSERT: athlete can insert rows for themselves only
CREATE POLICY "owner_insert"
  ON public.short_list_items
  FOR INSERT
  WITH CHECK (auth_said() = said);

-- UPDATE: athlete can update their own rows only
CREATE POLICY "owner_update"
  ON public.short_list_items
  FOR UPDATE
  USING      (auth_said() = said)
  WITH CHECK (auth_said() = said);

-- DELETE: required by saveShortList() DELETE-then-INSERT pattern.
--   The Supabase api.js rewrite will issue:
--     DELETE FROM short_list_items WHERE said = auth_said()
--   before inserting the new set. Without this policy that DELETE is blocked.
CREATE POLICY "owner_delete"
  ON public.short_list_items
  FOR DELETE
  USING (auth_said() = said);


-- ── VERIFICATION QUERIES ─────────────────────────────────────────────────────
-- Run these in the Dashboard SQL editor after applying the migration
-- to confirm the table and policies are live.
--
-- 1. Confirm table exists with correct columns:
--    SELECT column_name, data_type, is_nullable
--    FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND table_name   = 'short_list_items'
--    ORDER BY ordinal_position;
--
-- 2. Confirm RLS is enabled:
--    SELECT relname, relrowsecurity
--    FROM pg_class
--    WHERE relname = 'short_list_items';
--
-- 3. Confirm all 4 policies exist:
--    SELECT policyname, cmd
--    FROM pg_policies
--    WHERE tablename = 'short_list_items'
--    ORDER BY cmd;
