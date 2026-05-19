import { test, expect } from '@playwright/test';

test.describe('Kedai Elvera 57 - E2E Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the login page
    await page.goto('/');
  });

  test('should render the login form with all visual branding elements', async ({ page }) => {
    // Check main title
    await expect(page.locator('text=Selamat datang kembali')).toBeVisible();
    await expect(page.locator('text=Pilih peran lalu masukkan password.')).toBeVisible();

    // Check presence of role buttons
    await expect(page.locator('button:has-text("Admin")')).toBeVisible();
    await expect(page.locator('button:has-text("Waiter")')).toBeVisible();
    await expect(page.locator('button:has-text("Dapur")')).toBeVisible();
  });

  test('should show error when incorrect password is typed', async ({ page }) => {
    // Select Admin role (default)
    // Select password field and type wrong password
    const passwordInput = page.locator('input[placeholder="Password Admin"]');
    await passwordInput.fill('wrongpassword123');

    // Click submit
    await page.locator('button:has-text("Masuk")').click();

    // Verify error toast or block appears
    const errorBlock = page.locator('text=Password salah. Coba lagi.');
    await expect(errorBlock).toBeVisible();
  });

  test('should successfully log in as Admin and redirect to admin panel', async ({ page }) => {
    // Input correct Admin password
    const passwordInput = page.locator('input[placeholder="Password Admin"]');
    await passwordInput.fill('[REDACTED_ADMIN_PASSWORD]');

    // Click submit
    await page.locator('button:has-text("Masuk")').click();

    // Wait for the URL to change to the admin dashboard (using HashRouter #/admin or #/)
    await page.waitForURL('**/#/admin');

    // Verify localStorage has pawon_session
    const session = await page.evaluate(() => localStorage.getItem('pawon_session'));
    expect(session).not.toBeNull();
    expect(JSON.parse(session || '{}').role).toBe('admin');
  });

  test('should successfully log in as Waiter and redirect to waiter panel', async ({ page }) => {
    // Click Waiter role selection button
    await page.locator('button:has-text("Waiter")').click();

    // Verify placeholder text changes accordingly
    const passwordInput = page.locator('input[placeholder="Password Waiter"]');
    await expect(passwordInput).toBeVisible();

    // Type correct password
    await passwordInput.fill('[REDACTED_WAITER_PASSWORD]');

    // Click submit
    await page.locator('button:has-text("Masuk")').click();

    // Wait for redirect to #/waiter
    await page.waitForURL('**/#/waiter');
  });
});
