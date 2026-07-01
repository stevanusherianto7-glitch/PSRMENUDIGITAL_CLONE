/**
 * PSRMENUDIGITAL — Galeri & Reservasi E2E Test Suite
 *
 * Covers:
 *   [GALERI]       Gallery tab navigation and content rendering
 *   [RESERVASI]    Reservation tab navigation and form rendering
 *   [NAV]          Tab switching between MENU, GALERI, RESERVASI
 */

import { test, expect, type Page } from "@playwright/test";

// --- Helper: bypass welcome modal with PIN ---
async function bypassWelcomeModal(page: Page) {
  await page.addInitScript(() => {
    (window as any).__skip_seed = true;
  });
  await page.goto("/#/menu/1");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Step 1: Click "Lanjut" if visible
  const lanjutBtn = page.getByText(/lanjut/i).first();
  if (await lanjutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await lanjutBtn.click();
    await page.waitForTimeout(500);
  }

  // Step 2: Click "Mulai Pesan Sekarang"
  const startBtn = page.getByText(/mulai pesan sekarang/i).first();
  if (await startBtn.isVisible()) {
    await startBtn.click();
  }

  // Step 3: Wait for PIN input (geolocation fails) and enter PIN "PAWON"
  const pinInput = page.locator("input[type=password]").last();
  try {
    await pinInput.waitFor({ state: "visible", timeout: 15000 });
    await pinInput.fill("PAWON");
    const cekBtn = page.getByText(/^cek$/i).last();
    await cekBtn.click();
    await page.waitForTimeout(2000);
  } catch (e) {
    console.warn("PIN input welcome bypass did not appear:", e);
  }
}

// --- [NAV] Tab Navigation ---

test.describe("[NAV] Guest Navigation Tabs", () => {
  test("All three tabs (MENU, GALERI, RESERVASI) are visible after login", async ({ page, context }) => {
    await context.clearPermissions();
    await bypassWelcomeModal(page);

    // Use getByText with partial match (buttons contain SVG icon + text)
    const menuTab = page.getByText("MENU", { exact: false }).first();
    const galeriTab = page.getByText("GALERI", { exact: false }).first();
    const reservasiTab = page.getByText("RESERVASI", { exact: false }).first();

    await expect(menuTab).toBeVisible({ timeout: 5000 });
    await expect(galeriTab).toBeVisible({ timeout: 5000 });
    await expect(reservasiTab).toBeVisible({ timeout: 5000 });
  });

  test("Clicking tabs switches the active view", async ({ page, context }) => {
    await context.clearPermissions();
    await bypassWelcomeModal(page);

    // Click GALERI tab
    const galeriTab = page.getByText("GALERI", { exact: false }).first();
    await galeriTab.click();
    await page.waitForTimeout(1000);

    // Verify gallery content appeared
    let body = await page.content();
    expect(body).toMatch(/momen spesial|galeri/i);

    // Click RESERVASI tab
    const reservasiTab = page.getByText("RESERVASI", { exact: false }).first();
    await reservasiTab.click();
    await page.waitForTimeout(1000);

    // Verify reservation content appeared
    body = await page.content();
    expect(body).toMatch(/reservasi tempat|booking tempat|nama lengkap/i);

    // Click back to MENU tab
    const menuTab = page.getByText("MENU", { exact: false }).first();
    await menuTab.click();
    await page.waitForTimeout(1000);

    // Verify menu content re-appeared (category tabs)
    body = await page.content();
    expect(body).toMatch(/makanan|minuman/i);
  });
});

// --- [GALERI] Gallery Module ---

test.describe("[GALERI] Event Gallery Module", () => {
  test("Gallery shows event cards with images and descriptions", async ({ page, context }) => {
    await context.clearPermissions();
    await bypassWelcomeModal(page);

    const galeriTab = page.getByText("GALERI", { exact: false }).first();
    await galeriTab.click();
    await page.waitForTimeout(1000);

    const body = await page.content();
    // Check for key gallery content
    expect(body).toMatch(/momen spesial kami/i);
    expect(body).toMatch(/pernikahan|wedding/i);
    expect(body).toMatch(/corporate|rapat/i);
  });

  test("Gallery event cards have badge labels", async ({ page, context }) => {
    await context.clearPermissions();
    await bypassWelcomeModal(page);

    const galeriTab = page.getByText("GALERI", { exact: false }).first();
    await galeriTab.click();
    await page.waitForTimeout(1000);

    const body = await page.content();
    expect(body).toMatch(/WEDDING/);
    expect(body).toMatch(/CORPORATE/);
  });
});

// --- [RESERVASI] Reservation Module ---

test.describe("[RESERVASI] Reservation Module", () => {
  test("Reservation form shows all required fields", async ({ page, context }) => {
    await context.clearPermissions();
    await bypassWelcomeModal(page);

    const reservasiTab = page.getByText("RESERVASI", { exact: false }).first();
    await reservasiTab.click();
    await page.waitForTimeout(1000);

    const body = await page.content();
    // Check all form labels
    expect(body).toMatch(/nama lengkap pemesan/i);
    expect(body).toMatch(/nomor telepon/i);
    expect(body).toMatch(/jenis reservasi/i);
    expect(body).toMatch(/jumlah tamu/i);
    expect(body).toMatch(/tanggal booking/i);
    expect(body).toMatch(/jam mulai/i);
    expect(body).toMatch(/catatan khusus/i);
  });

  test("Reservation form has submit button", async ({ page, context }) => {
    await context.clearPermissions();
    await bypassWelcomeModal(page);

    const reservasiTab = page.getByText("RESERVASI", { exact: false }).first();
    await reservasiTab.click();
    await page.waitForTimeout(1000);

    const submitBtn = page.getByText(/ajukan reservasi sekarang/i).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
  });

  test("Reservation form can be filled and submitted", async ({ page, context }) => {
    await context.clearPermissions();
    await bypassWelcomeModal(page);

    const reservasiTab = page.getByText("RESERVASI", { exact: false }).first();
    await reservasiTab.click();
    await page.waitForTimeout(1000);

    // Fill in the form
    const nameInput = page.locator("input[type=text]").first();
    await nameInput.fill("Budi Santoso");

    const phoneInput = page.locator("input[type=tel]").first();
    await phoneInput.fill("081234567890");

    const guestCountInput = page.locator("input[type=number]").first();
    await guestCountInput.fill("10");

    const dateInput = page.locator("input[type=date]").first();
    await dateInput.fill("2026-07-15");

    const timeInput = page.locator("input[type=time]").first();
    await timeInput.fill("19:00");

    const notesInput = page.locator("textarea").first();
    await notesInput.fill("Acara ulang tahun, butuh dekorasi");

    // Listen for dialog (alert) on submit
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toMatch(/reservasi berhasil/i);
      await dialog.accept();
    });

    // Submit
    const submitBtn = page.getByText(/ajukan reservasi sekarang/i).first();
    await submitBtn.click();
    await page.waitForTimeout(1500);
  });

  test("Reservation form validates required fields", async ({ page, context }) => {
    await context.clearPermissions();
    await bypassWelcomeModal(page);

    const reservasiTab = page.getByText("RESERVASI", { exact: false }).first();
    await reservasiTab.click();
    await page.waitForTimeout(1000);

    // Try to submit empty form — HTML5 validation should prevent it
    const submitBtn = page.getByText(/ajukan reservasi sekarang/i).first();
    await submitBtn.click();
    await page.waitForTimeout(500);

    // Form should still be visible (not dismissed)
    await expect(submitBtn).toBeVisible();
  });
});
