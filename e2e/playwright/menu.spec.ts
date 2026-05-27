import { test, expect } from '@playwright/test';

test.describe('Kedai Elvera 57 - Guest Menu & Ordering E2E Flow (Playwright Real-API)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Guest Menu for Table A9
    await page.goto('/#/menu/A9');
  });

  test('should go through the complete ordering flow and track order status', async ({ page }) => {
    // Register dialog listener to handle both confirm and alert dialogs during cleanup
    page.on('dialog', async dialog => {
      if (dialog.type() === 'confirm') {
        expect(dialog.message()).toContain('Apakah Anda yakin ingin mereset');
        await dialog.accept();
      } else if (dialog.type() === 'alert') {
        expect(dialog.message()).toContain('Pesanan aktif berhasil dibersihkan');
        await dialog.accept();
      }
    });

    // --- 1. WELCOME MODAL STEP 1 ---
    const introButton = page.locator('button:has-text("Masuk Ke Menu")');
    if (await introButton.isVisible()) {
      await introButton.click();
    }

    // Assert welcome screen title
    await expect(page.locator('text=Selamat Datang di')).toBeVisible();
    await expect(page.locator('text=Kedai Elvera 57!')).toBeVisible();
    await expect(page.locator('text=Meja A9').first()).toBeVisible();

    // Select "Dine In" (already active by default, let's explicitly click it to test interaction)
    await page.locator('text=Dine In').first().click({ force: true });

    // Click "Lanjut" to proceed to step 2
    await page.locator('button:has-text("Lanjut")').click();

    // --- 2. WELCOME MODAL STEP 2 ---
    // Verify step instructions "Cara Memesan" render
    await expect(page.locator('text=Cara Memesan')).toBeVisible();
    await expect(page.locator('text=Pilih Menu Favorit')).toBeVisible();

    // Click "Mulai Pesan Sekarang!" to close modal
    await page.locator('button:has-text("Mulai Pesan Sekarang!")').click();

    // Welcome modal should disappear, menu categories should render
    await expect(page.locator('text=Selamat Datang di')).not.toBeVisible();
    await expect(page.locator('button:has-text("Makanan")')).toBeVisible();

    // --- 3. MENU ITEM SELECTION & CART ADDITION ---
    // Click on "Nasi Goreng Jawa" to open the detail dialog
    await page.locator('button:has-text("Nasi Goreng Jawa")').click();

    // Detail dialog should render
    await expect(page.locator('h3:has-text("Nasi Goreng Jawa")')).toBeVisible();
    await expect(page.locator('text=Nasi goreng khas Jawa, harum bumbu rempah')).toBeVisible();

    // Click "Tambah" to add to cart
    await page.locator('button:has-text("Tambah")').click();

    // Detail dialog should close and the bottom cart bar should appear
    await expect(page.locator('h3:has-text("Nasi Goreng Jawa")')).not.toBeVisible();
    const cartButton = page.locator('button:has-text("Lihat Keranjang")');
    await expect(cartButton).toBeVisible();
    await expect(cartButton).toContainText('Rp 25.000');

    // --- 4. VIEW CART & ADD NOTES ---
    // Open the Cart View
    await page.locator('button:has-text("Lihat Keranjang")').click();

    // Verify Cart Page components
    await expect(page.locator('h2:has-text("Keranjang Pesanan")')).toBeVisible();
    await expect(page.locator('text=Nasi Goreng Jawa').first()).toBeVisible();
    await expect(page.locator('span:has-text("1")').first()).toBeVisible();

    // Enter special notes for the chef
    const notesTextarea = page.locator('textarea[placeholder*="masak pedas"]');
    await notesTextarea.fill('Masak pedas sedang ya chef, telurnya setengah matang.');

    // Verify calculations
    await expect(page.locator('text=Subtotal (1 item)')).toBeVisible();
    await expect(page.locator('text=PPN 10%')).toBeVisible();
    // Subtotal 25,000 + Tax 2,500 = 27,500
    await expect(page.locator('text="Total"')).toBeVisible();
    await expect(page.locator('text="Rp 27.500"')).toBeVisible();

    // --- 5. SUBMIT ORDER & STATUS TRACKING ---
    // Click "Pesan Sekarang"
    await page.locator('button:has-text("Pesan Sekarang")').click();

    // Wait for the transition to the status view
    await expect(page.locator('h2:has-text("Status Pesanan")')).toBeVisible();
    await expect(page.locator('text="Menunggu Konfirmasi"').first()).toBeVisible({ timeout: 15000 });

    // --- 6. CLEANUP ACTIVE ORDERS (RESTORE DB STATE) ---
    // Click on the Trash can icon in the header to reset orders on this table
    const trashButton = page.locator('header button').nth(1);
    await trashButton.click();

    // Wait for the orders to be cleared
    await expect(page.locator('text=Semua pesanan telah selesai')).toBeVisible();
  });
});
