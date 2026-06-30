/**
 * PSRMENUDIGITAL — Admin Kelola Galeri Acara E2E Test Suite
 *
 * Covers:
 *   [TAB]         Switching between "GENERATOR QR MEJA" and "KELOLA GALERI ACARA"
 *   [ADD]         "TAMBAH FOTO ACARA" button opens modal
 *   [EDIT]        "Edit" button on event cards opens modal
 *   [HAPUS]       "Hapus" button is clickable on event cards
 *   [MODAL]       Modal form fields, image source tabs, default images, close & save
 */

import { test, expect, type Page } from "@playwright/test";

// --- Helper: login as admin and navigate to Buku Menu Digital ---
async function loginAndGoToGallery(page: Page) {
  await page.goto("/#/");
  await page.waitForLoadState("networkidle");

  // Login
  const adminBtn = page.locator("button").filter({ hasText: /^Admin$/i }).first();
  if (await adminBtn.isVisible()) await adminBtn.click();
  const passwordInput = page.locator("input[type=password]");
  await passwordInput.waitFor({ state: "visible", timeout: 10000 });
  await passwordInput.fill("[REDACTED_ADMIN_PASSWORD]");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/#\/admin/, { timeout: 45000 });
  await page.waitForTimeout(3000);

  // Navigate to "Buku Menu Digital" sidebar item
  const bukuMenuBtn = page.locator("button").filter({ hasText: /buku menu/i }).first();
  await bukuMenuBtn.waitFor({ state: "visible", timeout: 10000 });
  await bukuMenuBtn.click();
  await page.waitForTimeout(2000);

  // Click on "KELOLA GALERI ACARA" tab
  const galeriTab = page.getByText("KELOLA GALERI ACARA", { exact: false }).first();
  await galeriTab.waitFor({ state: "visible", timeout: 5000 });
  await galeriTab.click();
  await page.waitForTimeout(1500);
}

// --- [TAB] Tab Switching ---

test.describe("[TAB] Admin Gallery Tab Navigation", () => {
  test("Both tabs are visible: GENERATOR QR MEJA and KELOLA GALERI ACARA", async ({ page }) => {
    await loginAndGoToGallery(page);

    const qrTab = page.getByText("GENERATOR QR MEJA", { exact: false }).first();
    const galeriTab = page.getByText("KELOLA GALERI ACARA", { exact: false }).first();
    await expect(qrTab).toBeVisible();
    await expect(galeriTab).toBeVisible();
  });

  test("Clicking tabs switches between QR and Gallery views", async ({ page }) => {
    await loginAndGoToGallery(page);

    // Verify gallery content
    let body = await page.content();
    expect(body).toMatch(/manajemen galeri acara|tambah foto acara/i);

    // Switch back to QR tab
    const qrTab = page.getByText("GENERATOR QR MEJA", { exact: false }).first();
    await qrTab.click();
    await page.waitForTimeout(1000);
    body = await page.content();
    expect(body).toMatch(/buku menu digital|qr code/i);

    // Switch back to Gallery tab
    const galeriTab = page.getByText("KELOLA GALERI ACARA", { exact: false }).first();
    await galeriTab.click();
    await page.waitForTimeout(1000);
    body = await page.content();
    expect(body).toMatch(/manajemen galeri acara/i);
  });
});

// --- [CARDS] Event Cards Display ---

test.describe("[CARDS] Event Gallery Cards", () => {
  test("Gallery shows all 4 event cards with badges", async ({ page }) => {
    await loginAndGoToGallery(page);

    const body = await page.content();
    expect(body).toMatch(/WEDDING/);
    expect(body).toMatch(/CORPORATE/);
    expect(body).toMatch(/BIRTHDAY/);
    expect(body).toMatch(/MUSIC EVENT/);
  });

  test("Each event card has Edit and Hapus buttons", async ({ page }) => {
    await loginAndGoToGallery(page);

    const editButtons = page.locator("button").filter({ hasText: /Edit/i });
    const hapusButtons = page.locator("button").filter({ hasText: /Hapus/i });
    
    const editCount = await editButtons.count();
    const hapusCount = await hapusButtons.count();
    
    expect(editCount).toBeGreaterThanOrEqual(4);
    expect(hapusCount).toBeGreaterThanOrEqual(4);
  });
});

// --- [ADD] TAMBAH FOTO ACARA button ---

test.describe("[ADD] Tambah Foto Acara Button", () => {
  test("TAMBAH FOTO ACARA button is visible and opens modal", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Verify modal opened
    const modalTitle = page.getByText("EDIT FOTO ACARA", { exact: false }).first();
    await expect(modalTitle).toBeVisible({ timeout: 3000 });
  });
});

// --- [EDIT] Edit button on cards ---

test.describe("[EDIT] Edit Button on Event Cards", () => {
  test("Clicking Edit button opens the modal", async ({ page }) => {
    await loginAndGoToGallery(page);

    const editBtn = page.locator("button").filter({ hasText: /Edit/i }).first();
    await editBtn.click();
    await page.waitForTimeout(500);

    const modalTitle = page.getByText("EDIT FOTO ACARA", { exact: false }).first();
    await expect(modalTitle).toBeVisible({ timeout: 3000 });
  });
});

// --- [HAPUS] Hapus button on cards ---

test.describe("[HAPUS] Hapus Button on Event Cards", () => {
  test("Hapus buttons are visible and clickable", async ({ page }) => {
    await loginAndGoToGallery(page);

    const hapusBtn = page.locator("button").filter({ hasText: /Hapus/i }).first();
    await expect(hapusBtn).toBeVisible();
    // Click to verify it doesn't crash (no handler yet, just UI check)
    await hapusBtn.click();
    await page.waitForTimeout(500);
    // Page should still be intact
    const body = await page.content();
    expect(body).toMatch(/manajemen galeri acara/i);
  });
});

// --- [MODAL] Modal Form & Controls ---

test.describe("[MODAL] Edit Foto Acara Modal", () => {
  test("Modal has all form fields: Judul Acara, Tanggal, Kategori", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const body = await page.content();
    expect(body).toMatch(/judul acara/i);
    expect(body).toMatch(/tanggal/i);
    expect(body).toMatch(/kategori/i);
  });

  test("Modal has Judul input with default value", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const judulInput = page.locator("input[type=text]").first();
    await expect(judulInput).toBeVisible();
    const value = await judulInput.inputValue();
    expect(value).toMatch(/jamuan pernikahan/i);
  });

  test("Modal has Kategori dropdown with Wedding, Corporate, Birthday options", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const select = page.locator("select").first();
    await expect(select).toBeVisible();

    const options = await select.locator("option").allTextContents();
    expect(options).toContain("Wedding");
    expect(options).toContain("Corporate");
    expect(options).toContain("Birthday");
  });

  test("Modal has image source tabs: Preview, Upload, URL", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const body = await page.content();
    expect(body).toMatch(/preview/i);
    expect(body).toMatch(/upload/i);
    expect(body).toMatch(/url/i);
  });

  test("Modal has default image thumbnails for quick selection", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const body = await page.content();
    expect(body).toMatch(/pilih cepat dari gambar default/i);
    
    // Check there are thumbnail images in the modal
    const thumbnails = page.locator(".fixed img[src*='unsplash']");
    const thumbCount = await thumbnails.count();
    expect(thumbCount).toBeGreaterThanOrEqual(4);
  });

  test("Modal has upload placeholder area", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const body = await page.content();
    expect(body).toMatch(/belum ada foto|klik untuk upload/i);
  });

  test("Modal close (X) button works", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.getByText("EDIT FOTO ACARA", { exact: false }).first();
    await expect(modalTitle).toBeVisible();

    // Click X button to close (inside modal header, next to "EDIT FOTO ACARA" title)
    const closeBtn = page.locator(".fixed .border-b button").first();
    await closeBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Modal should be gone
    await expect(modalTitle).not.toBeVisible();
  });

  test("SIMPAN PERUBAHAN button closes modal", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const modalTitle = page.getByText("EDIT FOTO ACARA", { exact: false }).first();
    await expect(modalTitle).toBeVisible();

    // Click SIMPAN PERUBAHAN
    const saveBtn = page.getByText("SIMPAN PERUBAHAN", { exact: false }).first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await page.waitForTimeout(500);

    // Modal should be closed
    await expect(modalTitle).not.toBeVisible();
  });

  test("Modal form fields can be edited", async ({ page }) => {
    await loginAndGoToGallery(page);

    const addBtn = page.getByText("TAMBAH FOTO ACARA", { exact: false }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Edit judul
    const judulInput = page.locator("input[type=text]").first();
    await judulInput.clear();
    await judulInput.fill("Acara Baru Tes");
    const judulValue = await judulInput.inputValue();
    expect(judulValue).toBe("Acara Baru Tes");

    // Edit tanggal
    const tanggalInput = page.locator("input[type=text]").nth(1);
    await tanggalInput.clear();
    await tanggalInput.fill("01 Januari 2027");
    const tanggalValue = await tanggalInput.inputValue();
    expect(tanggalValue).toBe("01 Januari 2027");

    // Change kategori
    const select = page.locator("select").first();
    await select.selectOption("corporate");
    const selectedValue = await select.inputValue();
    expect(selectedValue).toBe("corporate");
  });
});
