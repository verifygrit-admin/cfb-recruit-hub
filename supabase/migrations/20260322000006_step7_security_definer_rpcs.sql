-- ============================================================
-- Stage2_Step7 — SECURITY DEFINER RPCs
-- Migration: 20260322000006_step7_security_definer_rpcs.sql
-- ============================================================
--
-- SCHEMA SOURCE (per PROTO-GLOBAL-010):
--   Supabase project: oeekcafirfxgtdoocael (us-east-1)
--   Tables affected: profiles (read-only access patterns)
--
-- DECISIONS IMPLEMENTED:
--   Step 7 done-condition items 2 (getSAIDStats RPC),
--   3 (verify_pending_token RPC), and 4 (check_email_exists RPC).
--   All three functions are SECURITY DEFINER — they execute with the
--   privileges of the function owner (postgres), not the caller.
--   This allows anon-key callers to invoke narrowly scoped reads
--   on the profiles table without bypassing RLS on other queries.
--
-- SCOPE:
--   Creates three PostgreSQL functions. No DDL on tables or policies.
--   No changes to existing schema.
-- ============================================================


-- ── 1. get_said_stats() ───────────────────────────────────────────────────────
-- Returns aggregate SAID counters for the Dexter/Sentinel health check.
-- Replaces the getSAIDStats() stub in api.js.
-- Excludes test records (status = 'test') if that column value is used.
-- Only counts profiles with status IN ('pending', 'active') to mirror
-- the GAS-era getSAIDStats() which read only the Recruits tab (no test rows).
--
-- Return shape: TABLE(count bigint, latest text)
-- Callable by anon key via supabase.rpc('get_said_stats').
CREATE OR REPLACE FUNCTION public.get_said_stats()
RETURNS TABLE(count bigint, latest text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      COUNT(*)::bigint                                      AS count,
      MAX(said)                                             AS latest
    FROM public.profiles
    WHERE status IN ('pending', 'active');
END;
$$;

-- Revoke default PUBLIC execute; grant only to anon and authenticated roles.
REVOKE EXECUTE ON FUNCTION public.get_said_stats() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_said_stats() TO anon, authenticated;


-- ── 2. verify_pending_token(p_said text, p_token text) ───────────────────────
-- Validates a pending_token for the completePendingAccount() flow.
-- Checks: said matches, pending_token matches, token is not expired,
-- status is 'pending'. Returns the profile email on success so the
-- caller can proceed to signUp without an active session.
--
-- Return shape: TABLE(ok boolean, email text, error_code text)
--   ok = true  → token is valid; email is the address to use for signUp
--   ok = false → token invalid; error_code is one of:
--                  'not_found', 'token_mismatch', 'expired', 'already_active'
--
-- Callable by anon key via supabase.rpc('verify_pending_token', {p_said, p_token}).
CREATE OR REPLACE FUNCTION public.verify_pending_token(
  p_said  text,
  p_token text
)
RETURNS TABLE(ok boolean, email text, error_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.profiles%ROWTYPE;
BEGIN
  -- Look up the profile by SAID.
  SELECT * INTO v_row
  FROM public.profiles
  WHERE said = p_said
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, 'not_found'::text;
    RETURN;
  END IF;

  -- Already active — no token check needed.
  IF v_row.status = 'active' THEN
    RETURN QUERY SELECT false, NULL::text, 'already_active'::text;
    RETURN;
  END IF;

  -- Token mismatch.
  IF v_row.pending_token IS DISTINCT FROM p_token THEN
    RETURN QUERY SELECT false, NULL::text, 'token_mismatch'::text;
    RETURN;
  END IF;

  -- Token expired.
  IF v_row.pending_token_expiry IS NOT NULL
     AND v_row.pending_token_expiry < NOW() THEN
    RETURN QUERY SELECT false, NULL::text, 'expired'::text;
    RETURN;
  END IF;

  -- All checks pass — return the email for signUp.
  RETURN QUERY SELECT true, v_row.email, NULL::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_pending_token(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.verify_pending_token(text, text) TO anon, authenticated;


-- ── 3. check_email_exists(p_email text) ──────────────────────────────────────
-- Checks whether a given email has a profile row and what its status is.
-- Replaces the dummy-password signIn probe in checkEmail().
-- Queries only the profiles table (not auth.users) — sufficient for
-- the frontend's needs (hasAccount, pendingAccount).
--
-- Return shape: TABLE(has_account boolean, pending_account boolean)
--   has_account    = true if any profile row exists for this email
--   pending_account = true if the row's status is 'pending'
--
-- Callable by anon key via supabase.rpc('check_email_exists', {p_email}).
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS TABLE(has_account boolean, pending_account boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.profiles
  WHERE email = p_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, (v_row.status = 'pending');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_email_exists(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_email_exists(text) TO anon, authenticated;
