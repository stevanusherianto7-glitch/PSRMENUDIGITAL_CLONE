import { test, expect } from '@playwright/test';

test('Click Mulai Masak', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));

  // Go to Waiter/Kitchen page
  await page.goto('http://localhost:5173/#/');
  await page.waitForLoadState('networkidle');

  // Login as Kitchen
  const kitchenBtn = page.locator('button').filter({ hasText: /^Dapur$/i }).first();
  await kitchenBtn.click();
  await page.locator('input[type="password"]').fill('[REDACTED_KITCHEN_PASSWORD]');
  await page.locator('button[type="submit"]').click();

  await page.waitForURL(/\/#\/kitchen/, { timeout: 15000 });
  await page.waitForTimeout(4000);

  // Click Mulai Masak
  const btn = page.locator('button:has-text("Mulai Masak")').first();
  if (await btn.isVisible()) {
    console.log("Found Mulai Masak button, clicking...");
    await btn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log("Mulai Masak button not found.");
    // Maybe no orders? Let's insert one first
    console.log("Inserting a dummy order...");
    await page.evaluate(async () => {
      // @ts-ignore
      const { supabase } = await import('/src/lib/supabase.ts');
      await supabase.from('orders').insert({
        id: 'TEST-CLICK',
        table_id: 'A1',
        status: 'pending',
        type: 'waiter',
        items: [{ id: 'menu_001', qty: 1, name: 'Food', price: 10000, category: 'Makanan' }],
        subtotal: 10000,
        total: 10000,
        order_mode: 'dine-in',
      });
    });
    await page.waitForTimeout(4000);
    const btn2 = page.locator('button:has-text("Mulai Masak")').first();
    if (await btn2.isVisible()) {
      await btn2.click();
      await page.waitForTimeout(2000);
    } else {
      console.log("Still no button");
    }
  }

  console.log("--- BROWSER LOGS ---");
  for (const log of logs) {
    console.log(log);
  }
});
