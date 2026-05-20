import { test, expect } from '@playwright/test';

test.describe('Kedai Elvera 57 - E2E Offline Fallback Flow (Opsi A)', () => {
  test.beforeEach(async ({ page }) => {
    // BLOCK all Supabase traffic to simulate Offline/Network Error
    await page.route('**/rest/v1/**', async route => {
      await route.abort('internetdisconnected');
    });

    // Navigate to Guest Menu
    await page.goto('/#/menu/A1');
  });

  test('should render SEED_MENU from local fallback when offline and allow order creation', async ({ page }) => {
    // 1. Bypass Welcome Screen
    const introButton = page.locator('button:has-text("Masuk Ke Menu")');
    if (await introButton.isVisible()) {
      await introButton.click();
    }
    await expect(page.locator('text=Selamat Datang di')).toBeVisible();
    await page.locator('button:has-text("Lanjut")').click();
    await page.locator('button:has-text("Mulai Pesan Sekarang!")').click();

    // 2. Verify Local Fallback Data (SEED_MENU) is rendered
    // Nasi Goreng Jawa is in SEED_MENU
    await expect(page.locator('button:has-text("Nasi Goreng Jawa")')).toBeVisible();

    // 3. Add to Cart (Click card to open modal, then Tambah)
    await page.locator('button:has-text("Nasi Goreng Jawa")').click();
    await page.locator('button:has-text("Tambah")').click();

    // 4. Go to Cart & Checkout
    await page.locator('button:has-text("Lihat Keranjang")').click();
    await expect(page.locator('h2:has-text("Keranjang Pesanan")')).toBeVisible();
    
    // Submit Order (It will use localStorage fallback because API is blocked)
    await page.locator('button:has-text("Pesan Sekarang")').click();

    // 5. Verify it transitions to status screen seamlessly
    await expect(page.locator('h2:has-text("Status Pesanan")')).toBeVisible();
    await expect(page.locator('text=Menunggu Jaringan (Offline)').first()).toBeVisible();
  });
});

