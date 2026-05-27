import { test, expect } from '@playwright/test';

test.describe('Kedai Elvera 57 - E2E Admin & POS Kasir Flow (Playwright Robustness Simulator)', () => {
  const TABLE_ID = 'A7';
  const MOCK_ORDER_ID = 'MOCK-BILL-A7';

  test.beforeEach(async ({ page }) => {
    // BLOCK & MOCK ALL SUPABASE REST API CALLS
    await page.route('**/rest/v1/**', async route => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/orders') && method === 'GET') {
        // Return simulated active orders (Mock Seeding)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: MOCK_ORDER_ID,
              table_id: TABLE_ID,
              tableId: TABLE_ID, // both cases for safety
              items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 2, category: 'Makanan' }],
              subtotal: 50000,
              total: 55000,
              notes: 'Ekstra pedas ya chef!',
              order_mode: 'dine-in',
              orderMode: 'dine-in', // both cases for safety
              status: 'served',
              type: 'guest',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
        });
      } else if (url.includes('/transactions') && method === 'POST') {
        // Simulate Offline Fallback scenario by failing the transaction insert!
        // This triggers the robustness offline queue saving / error toast gracefully.
        await route.abort('internetdisconnected');
      } else if (url.includes('/orders') && (method === 'PATCH' || method === 'POST' || method === 'DELETE')) {
        // Simulate network failure for orders too
        await route.abort('internetdisconnected');
      } else {
        // Allow other API GET calls to return empty arrays so they don't break UI
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });
  });

  test('should log in as Admin, process a bill offline, and gracefully handle fallback', async ({ page }) => {
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // --- STEP 1: LOGIN AS ADMIN ---
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');

    // Click on Admin role card
    const roleButton = page.locator('button:has-text("Admin")');
    await expect(roleButton).toBeVisible();
    await roleButton.click();

    // Fill password field
    const pinField = page.locator('input[placeholder="Password Admin"]');
    await expect(pinField).toBeVisible();
    await pinField.fill('[REDACTED_ADMIN_PASSWORD]');

    // Click submit/login button
    const submitButton = page.locator('button:has-text("Masuk")');
    await submitButton.click();

    // Assert redirection to the Admin Panel
    await page.waitForURL('**/#/admin');
    console.log('[TEST PROGRESS] Logged in successfully. On Admin panel.');

    // Verify main Dashboard / Data Transaksi is visible
    await expect(page.locator('text=Data Transaksi').first()).toBeVisible({ timeout: 15000 });

    // --- STEP 2: NAVIGATE TO KASIR MODULE ---
    console.log('[TEST PROGRESS] Navigating to Kasir module...');
    const kasirNavButton = page.locator('button:has-text("KASIR")');
    await expect(kasirNavButton).toBeVisible();
    await kasirNavButton.click();

    // Verify cashier screen is rendered
    await expect(page.locator('text=Antrean Pembayaran').first()).toBeVisible({ timeout: 10000 });

    // --- STEP 3: SELECT MOCKED BILL & VERIFY CART ---
    console.log('[TEST PROGRESS] Selecting Table A7 bill...');
    const orderCard = page.locator(`text=Meja ${TABLE_ID}`).first();
    await expect(orderCard).toBeVisible();
    await orderCard.click();

    // Verify order items have been loaded into the cart
    await expect(page.locator('text=Pengelola Tagihan').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Nasi Goreng Jawa ×2').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Rp 55.000').last()).toBeVisible({ timeout: 15000 });

    // --- STEP 4: CHOOSE PAYMENT METHOD & SUBMIT ---
    console.log('[TEST PROGRESS] Processing Tunai payment (Simulated Offline)...');
    const tunaiButton = page.locator('button:has-text("TUNAI")').first();
    await expect(tunaiButton).toBeVisible();
    await tunaiButton.click();

    // Click payment process button
    const processPaymentButton = page.locator('button:has-text("Proses Bayar")').first();
    await expect(processPaymentButton).toBeVisible();
    await expect(processPaymentButton).toBeEnabled();
    await processPaymentButton.click();

    // Assert Confirmation Modal is visible
    await expect(page.locator('text=Konfirmasi Pembayaran').first()).toBeVisible();
    await expect(page.locator('text=Ya, Proses').first()).toBeVisible();

    // Click confirm inside modal
    const confirmButton = page.locator('text=Ya, Proses').first();
    await confirmButton.click();

    // --- STEP 5: VERIFY ROBUSTNESS STATE ---
    // Because we aborted the network for POST /transactions, it should gracefully fall back
    // by still showing "Transaksi Berhasil" (because Kasir treats local state as priority).
    console.log('[TEST PROGRESS] Asserting robust transaction success despite offline error...');
    
    // We expect the success screen to still appear without crashing (White Screen of Death)
    await expect(page.locator('text=Transaksi Berhasil').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Struk Pelanggan').first()).toBeVisible();

    // Go back to main cashier screen
    const backButton = page.locator('text=← Beranda Utama').first();
    await expect(backButton).toBeVisible();
    await backButton.click({ force: true });

    console.log('[TEST PROGRESS] Cashier resilience tested successfully! Test completed.');
  });
});
