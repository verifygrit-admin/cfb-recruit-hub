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
 *   ENV ISOLATION (Option B fix, 2026-03-22):
 *   API_BASE is a module-level const evaluated at import time from
 *   import.meta.env.VITE_API_BASE. In CI, this env var is not set during the
 *   test step — only during the build step. All TCs use dynamic imports with
 *   vi.stubEnv to ensure API_BASE is truthy, so each test exercises the guard
 *   it claims to test (not the !API_BASE guard). This makes the suite
 *   self-contained and CI-environment-independent.
 *
 *   COVERAGE GAP (pre-Step-6): checkEmail() accepts malformed email strings
 *   without format rejection. Addressed at Step 6 with email regex guard.
 *
 * After Step 6: TC-2 and TC-4 must be updated to mock the Supabase client
 * instead of globalThis.fetch.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Stubs VITE_API_BASE, resets the module cache, and dynamically imports api.js.
 * This ensures API_BASE is truthy in the re-evaluated module scope, so tests
 * exercise the intended guard — not the !API_BASE short-circuit.
 */
async function importWithApiBase() {
  vi.stubEnv('VITE_API_BASE', 'https://test-stub.example.com');
  vi.resetModules();
  return import('../../src/lib/api.js');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('checkEmail() guard clauses (Step 6 gate)', () => {

  // TC-1: missing email argument (undefined) → !email guard fires before fetch.
  // With API_BASE stubbed truthy, the !email guard is what actually fires.
  it('TC-1: returns { hasAccount: false } when email argument is missing (undefined)', async () => {
    const { checkEmail } = await importWithApiBase();
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
    const { checkEmail } = await importWithApiBase();
    // Mock fetch so no live network call is made during tests
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    const result = await checkEmail('not-an-email');
    expect(result).toEqual({ hasAccount: false });
    expect(typeof result.hasAccount).toBe('boolean');
  });

  // TC-3: empty string email → !email guard fires (empty string is falsy).
  // With API_BASE stubbed truthy, the !email guard is what actually fires.
  it('TC-3: returns { hasAccount: false } for empty string email', async () => {
    const { checkEmail } = await importWithApiBase();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await checkEmail('');
    expect(result).toEqual({ hasAccount: false });
    // !email fires before any network call
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // TC-4: valid email with mocked successful network response.
  // Mocks fetch to return { ok: true, json: () => ({ hasAccount: true }) }.
  // Asserts that the return shape on a successful response is { hasAccount: boolean }.
  // After Step 6: this TC must be updated to mock the Supabase auth client.
  it('TC-4: returns consistent shape on valid input with mocked network response', async () => {
    const { checkEmail } = await importWithApiBase();
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
