-- Migration: create_auth_said
-- Creates the auth_said() function used by profiles RLS policies.
-- Reads the 'said' claim from the current JWT (set at login time).

CREATE OR REPLACE FUNCTION public.auth_said()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(
    current_setting('request.jwt.claims', true)::json->>'said',
    ''
  )
$$;
