import { test, expect } from '@playwright/test';

/**
 * Auth E2E Tests
 * These tests exercise authentication user flows in the browser.
 *
 * NOTE: For CI these tests require a running dev server with a Supabase
 * test instance. The tests are designed to be resilient by checking UI
 * state (error messages, redirects) rather than asserting exact API data.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Login Flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('TC-E2E-AUTH-01: login page renders required fields', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="email"], #email')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"], #password')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log")')).toBeVisible();
  });

  test('TC-E2E-AUTH-02: shows error message on invalid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log")').first();

    await emailInput.fill('notareal@user.invalid');
    await passwordInput.fill('wrongpassword123');
    await submitBtn.click();

    // Wait for error to appear
    await expect(
      page.locator('text=/invalid|error|failed|incorrect/i').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('TC-E2E-AUTH-03: empty form submission shows validation feedback', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log")').first();
    await submitBtn.click();

    // Either HTML5 validation or app validation message should appear
    const emailInput = page.locator('input[type="email"]').first();
    const validationState = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validationState).toBe(false);
  });

  test('TC-E2E-AUTH-04: login page has link to register', async ({ page }) => {
    const registerLink = page.locator('a[href*="register"], a:has-text("Register"), a:has-text("Sign up")').first();
    await expect(registerLink).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Register Flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('TC-E2E-AUTH-05: register page renders all required fields', async ({ page }) => {
    await expect(page.locator('input[type="email"], #email').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('input[type="text"], input[name="full_name"], #full_name').first()).toBeVisible();
  });

  test('TC-E2E-AUTH-06: shows error when passwords do not match (if applicable)', async ({ page }) => {
    // Fill form with mismatched passwords or incomplete data
    const emailInput = page.locator('input[type="email"], #email').first();
    await emailInput.fill('test@example.com');

    const passwordInputs = page.locator('input[type="password"]');
    const count = await passwordInputs.count();
    if (count >= 2) {
      await passwordInputs.nth(0).fill('password123');
      await passwordInputs.nth(1).fill('differentpassword');
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      // Should show some error
      await expect(page.locator('text=/match|password|error/i').first()).toBeVisible({ timeout: 5000 });
    } else {
      // Only one password field — skip password mismatch check
      test.skip();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Protected Routes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Protected Routes', () => {
  test('TC-E2E-AUTH-07: unauthenticated user accessing /profile sees login redirect or prompt', async ({ page }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.removeItem('session');
      localStorage.removeItem('user');
    });

    await page.goto('/profile');

    // Should either redirect to /login or show a login prompt
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const hasLoginContent = await page.locator('text=/login|sign in|unauthorized/i').count();

    const isProtected = currentUrl.includes('/login') || hasLoginContent > 0;
    expect(isProtected).toBe(true);
  });

  test('TC-E2E-AUTH-08: accessing /admin without admin role shows forbidden or redirect', async ({ page }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto('/admin');
    await page.waitForTimeout(1500);
    // Should not render admin content to unauthenticated users
    const adminHeading = page.locator('h1:has-text("Admin"), h2:has-text("Admin Dashboard")');
    // Either we are redirected or admin content is not shown
    const url = page.url();
    const notOnAdmin = !url.endsWith('/admin') || (await adminHeading.count()) === 0;
    expect(notOnAdmin).toBe(true);
  });
});
