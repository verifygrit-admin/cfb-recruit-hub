-- Migration: create_profiles
-- Creates the public.profiles table, SAID sequence, generate_said trigger, and RLS.
-- SAID format: GRIT-[year]-[NNNN], e.g. GRIT-2026-0001
-- user_id FK references auth.users — set at account creation via trigger or API call.

-- SAID counter sequence (scoped per year via generate_said function logic)
CREATE SEQUENCE IF NOT EXISTS public.said_seq START 1;

-- Trigger function: generates SAID on INSERT if not already set
CREATE OR REPLACE FUNCTION public.generate_said()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  year_str text;
  seq_val  bigint;
BEGIN
  IF NEW.said IS NULL THEN
    year_str := to_char(now(), 'YYYY');
    seq_val  := nextval('public.said_seq');
    NEW.said := 'GRIT-' || year_str || '-' || lpad(seq_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  said                  text UNIQUE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  name                  text,
  high_school           text,
  grad_year             integer,
  state                 text,
  email                 text,
  phone                 text,
  twitter               text,
  position              text,
  height                text,
  weight                numeric,
  speed_40              numeric,
  gpa                   numeric,
  sat                   integer,
  hs_lat                numeric,
  hs_lng                numeric,
  agi                   numeric,
  dependents            integer,
  expected_starter      boolean,
  captain               boolean,
  all_conference        boolean,
  all_state             boolean,
  status                text,
  pending_token         text,
  pending_token_expiry  timestamptz,
  last_login            timestamptz,
  last_logout           timestamptz,
  login_count           integer DEFAULT 0
);

-- Attach generate_said trigger
CREATE TRIGGER trg_generate_said
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_said();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO public
  USING (public.auth_said() = said);

CREATE POLICY "profiles_insert_open"
  ON public.profiles FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO public
  USING (public.auth_said() = said);

CREATE POLICY "profiles_delete_blocked"
  ON public.profiles FOR DELETE
  USING (false);
