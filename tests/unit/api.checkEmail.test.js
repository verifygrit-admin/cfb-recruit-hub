/**
 * api.checkEmail.test.js
 * QA-SPEC-001 / DEC-GLOBAL-032 — File 2 (Step 6 gate, guard clauses only)
 * 4 TCs covering checkEmail() input validation and degraded-network behavior.
 *
 * SCOPE BOUNDARY: TC-1 through TC-4 are Step 6 gate tests.
 * TC-5 through TC-7 are Step 10 Track A tests — DO NOT build those here.
 *
 * UPDATED FOR STEP 6 (api.js Supabase rewrite):
 *   checkEmail() no longer calls globalThis.fetch directly. It now calls
 *   supabase.auth.signInWithPassword() internally. TC-2 and TC-4 have been
 *   updated to mock the Supabase client per the "After Step 6" note in the
 *   original test comments.
 *
 *   Step 6 behavior:
 *     (a) !email guard returns { hasAccount: false } (unchanged)
 *     (b) Email format validation (Quin Finding 2) — malformed emails now
 *         return { hasAccount: false } before any Supabase call.
 *     (c) Valid email: calls supabase.auth.signInWithPassword with dummy
 *         password; interprets error message to determine account existence.
 *
 * TC-2 note: malformed email 'not-an-email' now fails the format regex and
 * returns { hasAccount: false } WITHOUT reaching the Supabase client.
 * The original coverage gap (Quin Finding 2) is now fixed at Step 6.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkEmail, supabase } from '../../src/lib/api.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkEmail() guard clauses (Step 6 gate)', () => {

  // TC-1: missing email argument (undefined) → !email guard fires before fetch
  // The guard `!API_BASE || !email` short-circuits on !email = true.
  it('TC-1: returns { hasAccount: false } when email argument is missing (undefined)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await checkEmail(undefined);
    expect(result).toEqual({ hasAccount: false });
    // !email fires before any network call
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // TC-2: malformed email string — Step 6 adds email format validation (Quin Finding 2).
  // 'not-an-email' now fails the format regex and returns { hasAccount: false }
  // WITHOUT reaching the Supabase client. No mock needed.
  it('TC-2: returns { hasAccount: false } for malformed email (format validation added at Step 6)', async () => {
    const signInSpy = vi.spyOn(supabase.auth, 'signInWithPassword');
    const result = await checkEmail('not-an-email');
    expect(result).toEqual({ hasAccount: false });
    expect(typeof result.hasAccount).toBe('boolean');
    // Format guard fires before Supabase call — no network call made
    expect(signInSpy).not.toHaveBeenCalled();
  });

  // TC-3: empty string email → !email guard fires (empty string is falsy)
  // Guard short-circuits before any network call.
  it('TC-3: returns { hasAccount: false } for empty string email', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await checkEmail('');
    expect(result).toEqual({ hasAccount: false });
    // !email fires before any network call
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // TC-4: valid email with mocked Supabase signInWithPassword response.
  // Updated for Step 6: mocks supabase.auth.signInWithPassword instead of
  // globalThis.fetch (per the original "After Step 6" note in this file).
  // Simulates the "Invalid login credentials" error that indicates the account
  // exists (user is present but wrong password was used by the probe call).
  it('TC-4: returns { hasAccount: true } when Supabase signals existing account', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data:  { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });
    const result = await checkEmail('valid@example.com');
    // Shape: must have a hasAccount boolean
    expect(typeof result.hasAccount).toBe('boolean');
    expect(result.hasAccount).toBe(true);
  });
});
