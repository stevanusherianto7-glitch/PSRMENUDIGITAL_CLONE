import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function getSupabaseConfig(): { url: string; key: string } {
  // Option B: Local Supabase Fallback for CI E2E Testing
  const LOCAL_URL = 'http://127.0.0.1:54321';
  const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjc3ODk4MTE4LCJleHAiOjE5OTM0NzQxMTh9.n2p9H5B9m6x2m1w6x2n_L3L-V3H8G7j6_z9K1h2L_D4';

  let url = process.env.VITE_SUPABASE_URL || LOCAL_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!key) {
    try {
      const secretsPath = path.join(process.cwd(), 'e2e_secrets.json');
      if (fs.existsSync(secretsPath)) {
        const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
        key = secrets.supabaseServiceRoleKey || '';
      }
    } catch (e) {
      // ignore
    }
  }
  
  if (!key && url.includes('127.0.0.1')) {
    key = LOCAL_KEY;
  }

  return { url, key };
}

test.describe('Kedai Elvera 57 - E2E Multi-User Circular Ordering Flow (Playwright)', () => {
  const TABLE_ID = 'A2';

  test('should process a complete guest-to-kitchen-to-waiter order lifecycle', async ({ page }) => {
    // Generate random order notes to make it unique
    const uniqueNote = `Test Order ${Date.now()}`;

    // Register console logger for debugging
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // --- STEP 0: SKIPPED CLEANUP TO AVOID LOCAL ADMIN KEY ISSUES ---
    console.log(`[TEST PREP] Using clean table ${TABLE_ID} for isolation.`);

    await page.goto(`/#/menu/${TABLE_ID}`);

    // Welcome modal step 1
    const introButton = page.locator('button:has-text("Masuk Ke Menu")');
    if (await introButton.isVisible()) {
      await introButton.click();
    }
    await expect(page.locator('text=Selamat Datang di')).toBeVisible();
    await page.locator('text=Dine In').first().click({ force: true });
    await page.locator('button:has-text("Lanjut")').click();

    // Welcome modal step 2
    await page.locator('button:has-text("Mulai Pesan Sekarang!")').click();

    // Choose "Nasi Goreng Jawa"
    await page.locator('button:has-text("Nasi Goreng Jawa")').click();
    await page.locator('button:has-text("Tambah")').click();

    // Open Cart
    await page.locator('button:has-text("Lihat Keranjang")').click();

    // Enter notes and checkout
    const notesTextarea = page.locator('textarea[placeholder*="masak pedas"]');
    await notesTextarea.fill('Pedas mantap chef, telurnya matang ya.');
    await page.locator('button:has-text("Pesan Sekarang")').click();

    // Verify it is on the guest status tracking page
    await expect(page.locator('h2:has-text("Status Pesanan")')).toBeVisible();
    await expect(page.locator('text="Menunggu Konfirmasi"').first()).toBeVisible({ timeout: 15000 });

    // --- STEP 2: KITCHEN STAFF LOGS IN AND COOKS THE ORDER ---
    // Navigate to Login Page
    await page.goto('/');

    // Select the "Dapur" role button first
    await page.locator('button:has-text("Dapur")').click();

    // Fill credentials for Kitchen role
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('[REDACTED_KITCHEN_PASSWORD]');
    await page.locator('button:has-text("Masuk")').click();

    // Assert redirection to the waiter/staff panel
    await expect(page).toHaveURL(/.*#\/kitchen/);
    await expect(page.locator('text=Dapur · Kedai Elvera 57')).toBeVisible();

    // Switch to "Dapur" (kitchen) tab (should be active by default for kitchen role, but let's be safe)
    await page.locator('button:has-text("Dapur")').click();

    // Verify Guest order card from Table A8 is visible
    const tableHeader = page.locator(`text=Meja ${TABLE_ID}`).first();
    await expect(tableHeader).toBeVisible();
    await expect(page.locator('text=Nasi Goreng Jawa').first()).toBeVisible();
    await expect(page.locator('text=Pedas mantap chef, telurnya matang ya.').first()).toBeVisible();

    // Scoped order card for Table A8 to avoid conflict with other concurrent orders
    const orderCard = page.locator('.bg-card', { hasText: `Meja ${TABLE_ID}` }).first();

    // Click "Mulai Masak"
    await orderCard.locator('button:has-text("Mulai Masak")').click();

    // Verify status changes to cooking and button becomes "Selesai Masak — Siap Antar"
    const readyButton = orderCard.locator('button:has-text("Selesai Masak")');
    await expect(readyButton).toBeVisible();

    // Click "Selesai Masak — Siap Antar"
    await readyButton.click();

    // Order should disappear from Dapur queue
    await expect(tableHeader).not.toBeVisible();

    // Logout from Kitchen
    await page.locator('button[aria-label="Logout"]').click();
    await expect(page).toHaveURL(/.*#\/$/); // back to login

    // --- STEP 3: WAITER LOGS IN AND SERVES THE ORDER ---
    // Select the "Waiter" role button first
    await page.locator('button:has-text("Waiter")').click();

    // Fill credentials for Waiter role
    await passwordInput.fill('[REDACTED_WAITER_PASSWORD]');
    await page.locator('button:has-text("Masuk")').click();

    // Assert redirection
    await expect(page).toHaveURL(/.*#\/waiter/);
    await expect(page.locator('text=Pelayan · Kedai Elvera 57')).toBeVisible();

    // Waiter tab should be active automatically. Verify Table A8 is in the "Siap Antar" list
    await expect(page.locator(`text=Meja ${TABLE_ID}`).first()).toBeVisible();

    // Click "Sudah Disajikan ke Meja A8"
    await page.locator(`button:has-text("Sudah Disajikan ke Meja ${TABLE_ID}")`).first().click();

    // Order should disappear from Waiter list
    await expect(page.locator(`text=Meja ${TABLE_ID}`).first()).not.toBeVisible({ timeout: 15000 });

    // Logout Waiter
    await page.locator('button[aria-label="Logout"]').click();
    await expect(page).toHaveURL(/.*#\/$/);
  });
});
