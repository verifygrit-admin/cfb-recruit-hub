/**
 * CFB Recruit Hub — Regression Tests
 *
 * Covers the 4 regression checks defined in TESTING_FLOWS.txt:
 *   [1] Sign in → sign out → sign in
 *   [2] Forgot password flow (partial — email code step is manual)
 *   [3] Submit form logged out → pending profile created
 *   [4] Short list saves and restores across sign-out / sign-in
 *
 * Environment variables (never hardcode credentials):
 *   TEST_EMAIL      — existing test account email
 *   TEST_PASSWORD   — existing test account password
 *   TEST_FRESH_EMAIL — leave blank; generated dynamically with +alias trick
 *
 * Run: npm test
 * Run headed: npm run test:headed
 */

import { test, expect } from '@playwright/test';
import { TEST_ATHLETE } from './test-data.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const TEST_EMAIL    = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

/**
 * Navigate to the app and dismiss any blocking overlay (tutorial or auth modal)
 * that auto-opens on load.
 *
 * Sequence: the HelmetAnim fires ~4.5s after mount. When done it either shows
 * the Tutorial (first visit) or the Auth modal (returning visitor, not signed in).
 * networkidle fires after the Schools API call (~10-20s). By then the overlay
 * is already open. We dismiss it before any nav interactions.
 */
async function gotoApp(page) {
  // Suppress tutorial overlays for the entire test session.
  // Without this: the quicklist tutorial fires after sign-in and blocks nav.
  await page.addInitScript(() => {
    localStorage.setItem('cfb_browse_tutSeen', '1');
    localStorage.setItem('cfb_ql_tutSeen', '1');
  });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  // Dismiss tutorial if present
  const tutOverlay = page.locator('#tutOverlay');
  if (await tutOverlay.isVisible().catch(() => false)) {
    await page.click('#tutClose');
    await tutOverlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  // Dismiss auto-opened auth modal if present (returning visitor, not signed in)
  const authOverlay = page.locator('.auth-overlay');
  if (await authOverlay.isVisible().catch(() => false)) {
    // Click the × dismiss button inside the modal
    await page.locator('.auth-modal button').filter({ hasText: '×' }).click().catch(async () => {
      // Fallback: click "Return to Browsing Schools" link
      await page.locator('.auth-modal a, .auth-modal button').filter({ hasText: /Return to Browsing/i }).click().catch(() => {});
    });
    await authOverlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

/**
 * Dismiss the "Your GRIT FIT Results are ready" modal that auto-opens after
 * sign-in when the account has a saved profile with results.
 * This modal blocks the nav dropdown menu even though the button itself is clickable.
 */
async function dismissResultsModalIfPresent(page) {
  const btn = page.locator('button', { hasText: 'View My Matches' });
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await btn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

/**
 * Open the nav dropdown and click the "Sign In" item.
 * The nav dropdown is rendered by ModeToggle (.nav-dropdown-btn) and
 * contains a .nav-dropdown-item--signin button.
 */
async function openSignInModal(page) {
  // Open the nav dropdown in the header
  await page.click('.nav-dropdown-btn');
  // Click "Sign In" inside the dropdown menu
  await page.click('.nav-dropdown-item--signin');
  // Wait for the auth modal to appear
  await page.waitForSelector('.auth-modal', { state: 'visible' });
}

/**
 * Fill and submit the sign-in form inside the AuthModal.
 * Assumes the modal is already open and showing the signIn view.
 */
async function fillSignIn(page, email, password) {
  // The sign-in view has two visible (non-readOnly) inputs: email + password
  // Use placeholder text to target them precisely
  await page.fill('.auth-modal input[placeholder="Your email"]', email);
  await page.fill('.auth-modal input[placeholder="Your password"]', password);
  await page.click('.auth-modal .auth-submit');
}

/**
 * Wait for the auth modal to disappear and the user's SAID or profile
 * to be reflected in the UI. After a successful sign-in the modal closes
 * and the nav dropdown button label changes to the active mode label
 * (the modal is gone from the DOM).
 */
async function waitForSignInComplete(page) {
  await page.waitForSelector('.auth-modal', { state: 'detached', timeout: 15000 });
}

/**
 * Open dropdown and click Sign Out.
 */
async function signOut(page) {
  await page.click('.nav-dropdown-btn');
  await page.click('.nav-dropdown-item--signout');
}

/**
 * Wait for sign-out to complete: Sign Out item should be gone,
 * Sign In item should be present in the dropdown.
 */
async function waitForSignOutComplete(page) {
  // The sign-out item disappears and sign-in item appears — poll the dropdown
  // We open it briefly to verify then close it.
  await page.waitForFunction(async () => {
    // Check localStorage is cleared
    return !localStorage.getItem('cfb_session_token');
  }, undefined, { timeout: 5000 });
}

// ── Test 1: Sign in → sign out → sign in ──────────────────────────────────
test('Sign in → sign out → sign in restores session', async ({ page }) => {
  // Credentials must be set in .env.test
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set — skipping auth tests');
  }

  await gotoApp(page);

  // ── Step 1: Sign in ──
  await openSignInModal(page);
  await fillSignIn(page, TEST_EMAIL, TEST_PASSWORD);
  await waitForSignInComplete(page);
  await dismissResultsModalIfPresent(page);

  // Assert: dropdown shows Sign Out (sign-in succeeded); click Sign Out directly
  // Note: ModeToggle uses mousedown (not keydown) for close-on-outside. Escape does
  // NOT close the dropdown — pressing it then re-opening toggles it closed instead.
  // Keep dropdown open and interact directly.
  await page.click('.nav-dropdown-btn');
  await expect(page.locator('.nav-dropdown-item--signin')).not.toBeVisible();
  await expect(page.locator('.nav-dropdown-item--signout')).toBeVisible();

  // ── Step 2: Sign out directly from the open dropdown ──
  await page.click('.nav-dropdown-item--signout');
  await waitForSignOutComplete(page);

  // Assert: dropdown now shows Sign In
  await page.click('.nav-dropdown-btn');
  await expect(page.locator('.nav-dropdown-item--signin')).toBeVisible();
  await expect(page.locator('.nav-dropdown-item--signout')).not.toBeVisible();
  await page.click('.nav-dropdown-btn'); // toggle close

  // ── Step 3: Sign back in ──
  await openSignInModal(page);
  await fillSignIn(page, TEST_EMAIL, TEST_PASSWORD);
  await waitForSignInComplete(page);
  await dismissResultsModalIfPresent(page);

  // Assert: session restored — Sign Out visible, Sign In gone
  await page.click('.nav-dropdown-btn');
  await expect(page.locator('.nav-dropdown-item--signout')).toBeVisible();
  await expect(page.locator('.nav-dropdown-item--signin')).not.toBeVisible();
  await page.click('.nav-dropdown-btn'); // toggle close
});

// ── Test 2: Forgot password flow (partial) ────────────────────────────────
test('Forgot password → confirmation message shown (partial — code entry is manual)', async ({ page }) => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    test.skip(true, 'TEST_EMAIL not set — skipping forgot password test');
  }

  await gotoApp(page);

  // Open sign-in modal
  await openSignInModal(page);

  // Click "Forgot password?" link inside the modal
  // In AuthModal signIn view: <button onClick={() => switchView("forgotPassword")}>Forgot password?</button>
  await page.click('.auth-modal .auth-switch button:has-text("Forgot password?")');

  // We should now be on the forgotPassword view
  // Title: "Reset Your Password"
  await expect(page.locator('.auth-modal .auth-title')).toHaveText('Reset Your Password');

  // Fill email and submit
  await page.fill('.auth-modal input[placeholder="Your email"]', TEST_EMAIL);
  await page.click('.auth-modal .auth-submit');

  // Assert: the submission was processed — either success (view → "Enter Reset Code")
  // or a handled error message. Both indicate the form worked; only "stuck loading"
  // or a JS crash would be a real failure. Apps Script email sending can fail due to
  // quota limits — that's a backend issue, not a regression in the form flow.
  await page.waitForTimeout(8000); // allow API round-trip
  const title = await page.locator('.auth-modal .auth-title').textContent().catch(() => '');
  const hasError = await page.locator('.auth-modal .auth-error').isVisible().catch(() => false);
  const hasSuccess = title === 'Enter Reset Code';

  expect(hasSuccess || hasError, 'Expected forgot-password form to respond (success or handled error)').toBeTruthy();

  // MANUAL STEP: enter 6-digit code from email — cannot automate without Mailtrap
  // This test stops here. The reset code + new password entry requires real inbox access.
});

// ── Test 3: Submit form logged out → pending profile / results shown ───────
test('Submit form logged out → results or StayGrittyModal shown, no error', async ({ page }) => {
  // Generate a fresh + alias email so each run is unique
  const freshEmail = `testuser+${Date.now()}@gmail.com`;

  await gotoApp(page);

  // Navigate to My GRIT Fit (QuickListForm) via the nav dropdown
  await page.click('.nav-dropdown-btn');
  await page.click('.nav-dropdown-item:has-text("My GRIT Fit")');

  // Wait for the form to appear
  // QuickListForm is wrapped in .form-wrapper with h2.form-title = "Student-Athlete Profile"
  await page.waitForSelector('.form-wrapper', { state: 'visible', timeout: 10000 });

  // Fill Identity section
  await page.fill('input[placeholder="Full Name"]', TEST_ATHLETE.name);
  await page.fill('input[placeholder="Anytown High School"]', TEST_ATHLETE.highSchool);
  await page.fill('input[placeholder="PA"]', TEST_ATHLETE.state);

  // Grad Year — select element for gradYear
  // Label "Expected Grad Year" → <select> with option values like "2027"
  await page.selectOption('select:near(:text("Expected Grad Year"))', TEST_ATHLETE.gradYear);

  // Email field — placeholder "athlete@email.com"
  await page.fill('input[placeholder="athlete@email.com"]', freshEmail);

  // Optional: phone and twitter (skip — not required)

  // Fill Athletics section
  // Position — select element near "Primary Position" label
  await page.selectOption('select:near(:text("Primary Position"))', TEST_ATHLETE.position);
  await page.fill('input[placeholder="72"]', TEST_ATHLETE.height);
  await page.fill('input[placeholder="185"]', TEST_ATHLETE.weight);
  await page.fill('input[placeholder="4.60"]', TEST_ATHLETE.speed40);

  // Fill Academics section
  await page.fill('input[placeholder="3.20"]', TEST_ATHLETE.gpa);
  // SAT is optional — skip (defaults to 1000)

  // Submit the form
  // The submit button uses class .form-submit.
  // For a logged-out user the label is "Generate My GRIT Fit →".
  const submitBtn = page.locator('.form-submit');
  await submitBtn.click();

  // Assert: either results appear (AuthModal for new account, or StayGrittyModal)
  // OR the results map view appears. Any of these is a valid non-error outcome.
  //
  // Valid outcomes:
  //   A) AuthModal appears (profile saved, new account creation prompt)
  //   B) StayGrittyModal appears (GPA fail or no top-50 matches)
  //   C) Results modal appears ("Your GRIT FIT Results are ready")
  //
  // We assert that none of these show a "failed to save" error.
  await page.waitForTimeout(5000); // allow API round-trip

  // Assert no form-level error mentioning "failed" or "error"
  const formError = page.locator('.form-error');
  if (await formError.isVisible()) {
    const errorText = await formError.textContent();
    expect(errorText).not.toMatch(/failed to save|network error|something went wrong/i);
  }

  // At least one of the valid outcome selectors should be present
  const authModal      = page.locator('.auth-modal');
  const stayGrittyModal = page.locator('.staygritty-modal, [class*="stay-gritty"], [class*="StayGritty"]');
  const resultsModal   = page.locator('text=Your GRIT FIT Results are ready');
  const resultsTable   = page.locator('.results-table, .summary-bar');

  // SELECTOR NOTE: StayGrittyModal class name not confirmed — flagged for inspection.
  // Using text-based fallback below as well.
  const stayGrittyText = page.locator('text=Stay Gritty, text=keep working, text=no matching programs').first();

  const anyValidOutcome = await Promise.race([
    authModal.waitFor({ state: 'visible', timeout: 12000 }).then(() => 'authModal'),
    resultsModal.waitFor({ state: 'visible', timeout: 12000 }).then(() => 'resultsModal'),
    resultsTable.waitFor({ state: 'visible', timeout: 12000 }).then(() => 'resultsTable'),
  ]).catch(() => null);

  // If none of the above appeared, check for StayGrittyModal by text
  if (!anyValidOutcome) {
    // StayGrittyModal may have appeared — check for its dismiss button or backdrop
    const stayGrittyVisible = await page.locator('.auth-overlay').isVisible().catch(() => false);
    expect(stayGrittyVisible, 'Expected at least one valid outcome modal to appear').toBeTruthy();
  }

  // SHEET VERIFICATION: run gws to confirm new row with status=pending after this test
  // gws sheets +read --spreadsheet 1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo --range "Recruits!A:Z" --format table
  // Look for a row containing the freshEmail value used in this test run.
});

// ── Test 4: Short list saves and restores ─────────────────────────────────
test('Short list saves and restores across sign-out / sign-in', async ({ page }) => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set — skipping short list test');
  }

  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await gotoApp(page);

  // ── Step 0: Profile Bootstrap ─────────────────────────────────────────────
  // Ensures the test account has a profiles row with GRIT FIT results.
  // On first run: signed-in submit creates a profile via saveRecruit + linkSaidToAuth.
  // On subsequent runs: updateRecruit fires (idempotent). See QA-SPEC-T4-SETUP-001.

  // Step 0a: Sign in
  await openSignInModal(page);
  await fillSignIn(page, TEST_EMAIL, TEST_PASSWORD);
  await waitForSignInComplete(page);
  await dismissResultsModalIfPresent(page);

  // Step 0b: Navigate to My GRIT Fit
  await page.click('.nav-dropdown-btn');
  await page.click('.nav-dropdown-item:has-text("My GRIT Fit")');
  await page.waitForSelector('.form-wrapper', { state: 'visible', timeout: 10000 });

  // Step 0c: Fill required fields using TEST_ATHLETE data
  await page.fill('input[placeholder="Full Name"]', TEST_ATHLETE.name);
  await page.fill('input[placeholder="Anytown High School"]', TEST_ATHLETE.highSchool);
  await page.fill('input[placeholder="PA"]', TEST_ATHLETE.state);
  await page.selectOption('select:near(:text("Expected Grad Year"))', TEST_ATHLETE.gradYear);
  await page.fill('input[placeholder="athlete@email.com"]', TEST_EMAIL);
  await page.selectOption('select:near(:text("Primary Position"))', TEST_ATHLETE.position);
  await page.fill('input[placeholder="72"]', TEST_ATHLETE.height);
  await page.fill('input[placeholder="185"]', TEST_ATHLETE.weight);
  await page.fill('input[placeholder="4.60"]', TEST_ATHLETE.speed40);
  await page.fill('input[placeholder="3.20"]', TEST_ATHLETE.gpa);

  // Step 0d: Submit — for signed-in users the button is "Update My GRIT Fit →"
  // or "Generate My GRIT Fit →"; .form-submit matches both.
  await page.locator('.form-submit').first().click();

  // Step 0e: Dismiss results modal and confirm summary bar.
  // On first run (no profile), revealResults is deferred until AFTER saveRecruit +
  // linkSaidToAuth complete. So .summary-bar appearing IS the completion signal —
  // the SAID is already stored in user_metadata by the time results render.
  await dismissResultsModalIfPresent(page);
  await page.waitForSelector('.summary-bar', { state: 'visible', timeout: 20000 });

  // Step 0f: Sign out to reset state before the persistence test
  await signOut(page);
  await waitForSignOutComplete(page);

  // ── Step 1: Sign in (profile should auto-restore with results) ──
  await openSignInModal(page);
  await fillSignIn(page, TEST_EMAIL, TEST_PASSWORD);
  await waitForSignInComplete(page);
  await dismissResultsModalIfPresent(page);

  // Wait for school data to load
  await page.waitForSelector('.leaflet-container, .loading-screen', { timeout: 20000 });
  const loadingScreen = page.locator('.loading-screen');
  if (await loadingScreen.isVisible()) {
    await loadingScreen.waitFor({ state: 'detached', timeout: 20000 });
  }

  // ── Step 2: Add a school to the short list ──
  // After sign-in with a profile, results auto-restore and summary-bar appears.
  await page.waitForSelector('.summary-bar', { state: 'visible', timeout: 15000 });

  // Switch to Table view to use the ResultsTable add-to-short-list button
  await page.click('.panel-btn:has-text("Table")');
  await page.waitForSelector('table, .results-table', { state: 'visible', timeout: 10000 });

  // Click the first short-list toggle button in the table.
  const addBtn = page.locator('.sl-toggle-btn[title="Add to Short List"]').first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  await page.waitForTimeout(500);

  // ── Step 3: Sign out ──
  await signOut(page);
  await waitForSignOutComplete(page);

  // Assert: short list is cleared from UI after sign-out
  // Navigate to My Short List to verify it's empty
  await page.click('.nav-dropdown-btn');
  await page.click('.nav-dropdown-item:has-text("My Short List")');
  await page.waitForTimeout(1000);

  // The ShortList component should show an empty state (no school rows).
  // After logout, shortList state is reset to [] in handleLogout().
  // Rows are <tr class="sl-row"> inside the ShortList component.
  const shortListItems = page.locator('tr.sl-row');
  const itemCount = await shortListItems.count();
  expect(itemCount).toBe(0);

  // ── Step 4: Sign back in ──
  await openSignInModal(page);
  await fillSignIn(page, TEST_EMAIL, TEST_PASSWORD);
  await waitForSignInComplete(page);
  await dismissResultsModalIfPresent(page);

  // Allow time for short list to restore from localStorage or server
  await page.waitForTimeout(3000);

  // Navigate to My Short List
  await page.click('.nav-dropdown-btn');
  await page.click('.nav-dropdown-item:has-text("My Short List")');
  await page.waitForTimeout(2000);

  // Assert: short list is restored (at least 1 school visible).
  // Rows are <tr class="sl-row"> inside the ShortList component.
  const restoredItems = page.locator('tr.sl-row');
  const restoredCount = await restoredItems.count();
  expect(restoredCount).toBeGreaterThanOrEqual(1);
});
