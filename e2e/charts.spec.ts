import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.addInitScript(() => {
    (window as any).__skip_seed = true;
  });
  await page.goto("/#/");
  await page.waitForLoadState("networkidle");
  const adminBtn = page.locator("button").filter({ hasText: /^Admin$/i }).first();
  if (await adminBtn.isVisible()) await adminBtn.click();
  const passwordInput = page.locator("input[type=password]");
  await passwordInput.waitFor({ state: "visible", timeout: 10000 });
  await passwordInput.fill("[REDACTED_ADMIN_PASSWORD]");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/#\/admin/, { timeout: 45000 });
  await page.waitForTimeout(3000);
}

test.describe("Charts Verification (Summary & Laporan Modules)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Go to "Transaksi" module
    const transaksiBtn = page.locator("button").filter({ hasText: /transaksi/i }).first();
    await expect(transaksiBtn).toBeVisible({ timeout: 10000 });
    await transaksiBtn.click();
    await page.waitForTimeout(2000);
  });

  test("Verify charts display in 'Summary' submodule", async ({ page }) => {
    // 1. Check title headers in Summary submodule
    await expect(page.getByText("Tren Penjualan").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Komposisi Menu").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Jam Ramai").first()).toBeVisible({ timeout: 10000 });

    // 2. Verify that Recharts components/SVGs are rendered
    const charts = page.locator(".recharts-responsive-container");
    const count = await charts.count();
    console.log(`[Summary] Found ${count} chart container(s)`);
    expect(count).toBeGreaterThan(0);

    // Verify first chart SVG is visible
    const firstChartSvg = page.locator(".recharts-responsive-container svg").first();
    await expect(firstChartSvg).toBeVisible({ timeout: 10000 });
  });

  test("Verify charts display in 'Laporan' submodule", async ({ page }) => {
    // 1. Switch to "Laporan" submodule tab
    const laporanTabBtn = page.locator("button").filter({ hasText: /^Laporan$/ }).first();
    await expect(laporanTabBtn).toBeVisible({ timeout: 10000 });
    await laporanTabBtn.click();
    await page.waitForTimeout(2000);

    // 2. Check title headers in Laporan submodule
    await expect(page.getByText("Penjualan Per Kategori").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Jam Ramai Transaksi").first()).toBeVisible({ timeout: 10000 });

    // 3. Verify that Recharts components/SVGs are rendered
    const charts = page.locator(".recharts-responsive-container");
    const count = await charts.count();
    console.log(`[Laporan] Found ${count} chart container(s)`);
    expect(count).toBeGreaterThan(0);

    // Verify first chart SVG is visible
    const firstChartSvg = page.locator(".recharts-responsive-container svg").first();
    await expect(firstChartSvg).toBeVisible({ timeout: 10000 });
  });
});
