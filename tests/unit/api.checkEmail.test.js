/**
 * api.checkEmail.test.js
 * QA-SPEC-001 / DEC-GLOBAL-032 — File 2 (Step 6 gate, guard clauses only)
 * 4 TCs covering checkEmail() input validation and degraded-network behavior.
 *
 * SCOPE BOUNDARY: TC-1 through TC-4 are Step 6/7 gate tests.
 * TC-5 through TC-7 are Step 10 Track A tests — DO NOT build those here.
 *
 * UPDATED FOR STEP 7 (check_email_exists SECURITY DEFINER RPC):
 *   checkEmail() no longer calls supabase.auth.signInWithPassword() (Step 6
 *   dummy-password probe). It now calls supabase.rpc('check_email_exists').
 *   TC-2 and TC-4 have been updated accordingly.
 *
 *   Step 7 behavior:
 *     (a) !email guard returns { hasAccount: false } (unchanged)
 *     (b) Email format validation (Quin Finding 2) — malformed emails now
 *         return { hasAccount: false } before any Supabase call (unchanged).
 *     (c) Valid email: calls supabase.rpc('check_email_exists', { p_email })
 *         and returns { hasAccount, pendingAccount } from the RPC result row.
 *
 * TC-2 note: malformed email 'not-an-email' fails the format regex and
 * returns { hasAccount: false } WITHOUT reaching the Supabase client.
 * TC-4 note: mocks supabase.rpc instead of supabase.auth.signInWithPassword.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkEmail, supabase } from '../../src/lib/api.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkEmail() guard clauses (Step 6 gate)', () => {

  // TC-1: missing email argument (undefined) → !email guard fires before fetch
  it('TC-1: returns { hasAccount: false } when email argument is missing (undefined)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await checkEmail(undefined);
    expect(result).toEqual({ hasAccount: false });
    // !email fires before any network call
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // TC-2: malformed email string — format regex fires before Supabase call.
  it('TC-2: returns { hasAccount: false } for malformed email (format validation added at Step 6)', async () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc');
    const result = await checkEmail('not-an-email');
    expect(result).toEqual({ hasAccount: false });
    expect(typeof result.hasAccount).toBe('boolean');
    // Format guard fires before Supabase call — no RPC made
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  // TC-3: empty string email → !email guard fires (empty string is falsy)
  it('TC-3: returns { hasAccount: false } for empty string email', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await checkEmail('');
    expect(result).toEqual({ hasAccount: false });
    // !email fires before any network call
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // TC-4: valid email with mocked supabase.rpc response.
  // Updated for Step 7: mocks supabase.rpc('check_email_exists') instead of
  // supabase.auth.signInWithPassword (Step 6 dummy-password probe retired).
  // Simulates the RPC returning has_account=true for an existing account.
  it('TC-4: returns { hasAccount: true } when Supabase signals existing account', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data:  [{ has_account: true, pending_account: false }],
      error: null,
    });
    const result = await checkEmail('valid@example.com');
    // Shape: must have a hasAccount boolean
    expect(typeof result.hasAccount).toBe('boolean');
    expect(result.hasAccount).toBe(true);
  });
});
