import { test, expect } from "@playwright/test";

test.describe("[GALERI & RESERVASI] Event & Booking Features", () => {
  test("Guest menu shows GALERI and RESERVASI tabs and content", async ({ page, context }) => {
    await context.clearPermissions();
    await page.goto("/#/menu/A1");
    await page.waitForLoadState("networkidle");

    const startBtn = page.getByText(/mulai pesan sekarang/i).first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(4000);
      const pinInput = page.locator("input[type=password]").last();
      if (await pinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pinInput.fill("PAWON");
        const cekBtn = page.getByText(/^cek$/i).last();
        await cekBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Check if GALERI tab exists
    const galeriTab = page.locator("button").filter({ hasText: /^GALERI$/i }).first();
    await expect(galeriTab).toBeVisible({ timeout: 5000 });
    await galeriTab.click();
    await page.waitForTimeout(1000);
    const bodyGaleri = await page.content();
    expect(bodyGaleri).toMatch(/momen spesial|pernikahan|corporate/i);

    // Check if RESERVASI tab exists
    const reservasiTab = page.locator("button").filter({ hasText: /^RESERVASI$/i }).first();
    await expect(reservasiTab).toBeVisible({ timeout: 5000 });
    await reservasiTab.click();
    await page.waitForTimeout(1000);
    const bodyReservasi = await page.content();
    expect(bodyReservasi).toMatch(/booking tempat|nama lengkap|tanggal booking/i);
  });
});
