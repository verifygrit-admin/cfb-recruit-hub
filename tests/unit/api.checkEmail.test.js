/**
 * api.checkEmail.test.js
 * QA-SPEC-001 / DEC-GLOBAL-032 — File 2 (Step 6 gate, guard clauses only)
 * 4 TCs covering checkEmail() input validation and degraded-network behavior.
 *
 * SCOPE BOUNDARY: TC-1 through TC-4 are Step 6 gate tests.
 * TC-5 through TC-7 are Step 10 Track A tests — DO NOT build those here.
 *
 * SOURCE CODE BEHAVIOR AS READ (src/lib/api.js line 133-138):
 *   checkEmail(email) returns { hasAccount: false } when:
 *     (a) !API_BASE is truthy, OR
 *     (b) !email is truthy (undefined, null, empty string)
 *   For any other truthy email string, it proceeds to fetch() regardless of
 *   format. There is no regex/format validation in the current implementation.
 *
 *   IMPORTANT FINDING: VITE_API_BASE is populated in the test environment
 *   (resolves to the live Apps Script URL via import.meta.env). TC-2 documents
 *   that malformed email strings reach the network — there is no format guard.
 *   This is a coverage gap surfaced by these tests, not a test authoring error.
 *   The gap should be routed to Patch/Nova for Step 6 when checkEmail() is
 *   rewritten against Supabase Auth.
 *
 * After Step 6: TC-2 and TC-4 must be updated to mock the Supabase client
 * instead of globalThis.fetch.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkEmail } from '../../src/lib/api.js';

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

  // TC-2: malformed email string — NO format validation exists in current impl.
  // A truthy string bypasses the !email guard and reaches fetch(). The fetch
  // may succeed or fail depending on network state; either way the function
  // returns { hasAccount: false } on failure (line 136: if (!res.ok) return { hasAccount: false }).
  // This TC asserts the shape contract only — not whether fetch was called.
  // COVERAGE GAP: checkEmail() accepts 'not-an-email' without format rejection.
  // Route to Patch for Step 6 spec: add email format validation before network call.
  it('TC-2: returns { hasAccount: false } for malformed email (no format validation in current impl)', async () => {
    // Mock fetch so no live network call is made during tests
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    const result = await checkEmail('not-an-email');
    expect(result).toEqual({ hasAccount: false });
    expect(typeof result.hasAccount).toBe('boolean');
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

  // TC-4: valid email with mocked successful network response
  // Mocks fetch to return { ok: true, json: () => ({ hasAccount: true }) }.
  // Asserts that the return shape on a successful response is { hasAccount: boolean }.
  // After Step 6: this TC must be updated to mock the Supabase auth client.
  it('TC-4: returns consistent shape on valid input with mocked network response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ hasAccount: true }),
    });
    const result = await checkEmail('valid@example.com');
    // Shape: must have a hasAccount boolean
    expect(typeof result.hasAccount).toBe('boolean');
    expect(result.hasAccount).toBe(true);
  });
});
