import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function getSupabaseConfig(): { url: string; key: string } {
  // Option B: Local Supabase Fallback for CI E2E Testing
  const LOCAL_URL = 'http://127.0.0.1:54321';
  // Default local service_role key provided by Supabase CLI
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
  
  // Jika sedang berjalan di Local CI (Opsi B) dan key masih kosong, gunakan default local key
  if (!key && url.includes('127.0.0.1')) {
    key = LOCAL_KEY;
  }

  return { url, key };
}

test.describe('Kedai Elvera 57 - E2E Admin & POS Kasir Flow (Playwright)', () => {
  const TABLE_ID = 'A7';
  const MOCK_ORDER_ID = 'MOCK-BILL-A7';

  // Supabase Service Role configuration for pre/post test DB state seeding & cleanup
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.key);

  test('should log in as Admin, navigate to Kasir POS, and process an active served bill', async ({ page }) => {
    // Register console logger for debugging
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // --- STEP 0: DATABASE SEEDING & PRE-CLEANUP ---
    console.log(`[TEST PREP] Cleaning up any residual test orders/transactions for table ${TABLE_ID}...`);
    
    // Cleanup any existing transaction items and transactions for this table
    const { data: oldTxs } = await supabase
      .from('transactions')
      .select('id')
      .eq('table_id', TABLE_ID);

    if (oldTxs && oldTxs.length > 0) {
      const txIds = oldTxs.map(t => t.id);
      await supabase.from('transaction_items').delete().in('transaction_id', txIds);
      await supabase.from('transactions').delete().in('id', txIds);
    }

    // Cleanup residual orders
    await supabase.from('orders').delete().eq('table_id', TABLE_ID);

    console.log(`[TEST PREP] Seeding active served order for table ${TABLE_ID}...`);
    const { error: seedError } = await supabase
      .from('orders')
      .insert({
        id: MOCK_ORDER_ID,
        table_id: TABLE_ID,
        items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 2, category: 'Makanan' }],
        subtotal: 50000,
        total: 55000, // including 10% tax
        notes: 'Ekstra pedas ya chef!',
        order_mode: 'dine-in',
        status: 'served', // ready for billing
        type: 'guest',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (seedError) {
      console.error(`[TEST PREP] Seeding failed:`, seedError.message);
      throw new Error(`Seeding failed: ${seedError.message}`);
    }
    console.log(`[TEST PREP] Seeding successful for table ${TABLE_ID}.`);

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

    // Verify main Dashboard / Data Transaksi is visible (bypass strictness by taking first match)
    await expect(page.locator('text=Data Transaksi').first()).toBeVisible({ timeout: 15000 });

    // --- STEP 2: NAVIGATE TO KASIR MODULE ---
    console.log('[TEST PROGRESS] Navigating to Kasir module...');
    const kasirNavButton = page.locator('button:has-text("KASIR")');
    await expect(kasirNavButton).toBeVisible();
    await kasirNavButton.click();

    // Verify cashier screen is rendered
    await expect(page.locator('text=Antrean Pembayaran').first()).toBeVisible({ timeout: 10000 });

    // --- STEP 3: SELECT SEEDED BILL & VERIFY CART ---
    console.log('[TEST PROGRESS] Selecting Table A7 bill...');
    const orderCard = page.locator(`text=Meja ${TABLE_ID}`).first();
    await expect(orderCard).toBeVisible();
    await orderCard.click();

    // Verify order items have been loaded into the cart
    await expect(page.locator('text=Pengelola Tagihan').first()).toBeVisible();
    await expect(page.locator('text=Nasi Goreng Jawa ×2').first()).toBeVisible();
    await expect(page.locator('text=Rp 55.000').last()).toBeVisible();

    // --- STEP 4: CHOOSE PAYMENT METHOD & SUBMIT ---
    console.log('[TEST PROGRESS] Processing Tunai payment...');
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

    // --- STEP 5: VERIFY SUCCESS STATE ---
    console.log('[TEST PROGRESS] Asserting transaction success...');
    await expect(page.locator('text=Transaksi Berhasil').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Struk Pelanggan').first()).toBeVisible();
    await expect(page.locator('text=PDF Pelanggan').first()).toBeVisible();

    // Go back to main cashier screen
    const backButton = page.locator('text=← Beranda Utama').first();
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Cart should now be empty and A7 order card should be deleted from the active bills list
    await expect(orderCard).not.toBeVisible();
    console.log('[TEST PROGRESS] Cashier bill cleared. Test completed successfully!');

    // --- STEP 6: POST-TEST DATABASE CLEANUP ---
    console.log(`[TEST CLEANUP] Cleaning up created transactions for table ${TABLE_ID}...`);
    const { data: createdTxs } = await supabase
      .from('transactions')
      .select('id')
      .eq('table_id', TABLE_ID);

    if (createdTxs && createdTxs.length > 0) {
      const txIds = createdTxs.map(t => t.id);
      await supabase.from('transaction_items').delete().in('transaction_id', txIds);
      await supabase.from('transactions').delete().in('id', txIds);
      console.log(`[TEST CLEANUP] Removed ${txIds.length} mock transaction entries.`);
    }

    await supabase.from('orders').delete().eq('table_id', TABLE_ID);
    console.log('[TEST CLEANUP] Database restored to original clean state.');
  });
});
