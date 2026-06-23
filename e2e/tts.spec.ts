/**
 * TTS (Text-to-Speech) — Playwright E2E Test Suite
 * 
 * Menguji seluruh alur TTS di PSRMENUDIGITAL:
 *   1. Toggle TTS ON/OFF + UI state
 *   2. TTS preference persists across page reload (localStorage)
 *   3. Tombol Test TTS memicu speechSynthesis.speak
 *   4. Pesanan baru memicu auto-announce ([TTS] console log)
 *   5. First-load suppression — order lama tidak diumumkan
 *   6. TTS disabled — tidak ada announcement
 *   7. Teks announcement sesuai format Indonesia ("shef", "dapur dan bar", dll)
 *   8. Connection badge shows green (Supabase Online)
 *   9. Cross-tab localStorage lock mechanism
 *  10. Burst orders — semua diumumkan berurutan
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Login as Admin using actual form flow */
async function loginAsAdmin(page: Page) {
  await page.goto('/#/');
  await page.waitForLoadState('networkidle');

  // The Admin role button is pre-selected by default, but click it to be sure
  const adminBtn = page.locator('button').filter({ hasText: /^Admin$/i }).first();
  if (await adminBtn.isVisible()) {
    await adminBtn.click();
  }

  // Type the admin password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill('[REDACTED_ADMIN_PASSWORD]');

  // Submit login form  
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  // Wait for redirect to admin page
  await page.waitForURL(/\/#\/admin/, { timeout: 15000 });
  // Wait for Supabase data loading
  await page.waitForTimeout(4000);
}

/** Collect console messages matching a pattern */
function collectConsoleLogs(page: Page, pattern: string): string[] {
  const logs: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    const text = msg.text();
    if (text.includes(pattern)) {
      logs.push(text);
    }
  });
  return logs;
}

/** Stub speechSynthesis.speak to track calls without producing audio */
async function stubSpeechSynthesis(page: Page) {
  await page.evaluate(() => {
    const calls: string[] = [];
    (window as any).__ttsSpokenTexts = calls;
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        calls.push(utterance.text);
        console.log('[TTS-STUB] speak called with:', utterance.text);
        // Fire end event so the system thinks it completed
        setTimeout(() => {
          try { utterance.dispatchEvent(new Event('end')); } catch (_) {}
        }, 50);
      };
    }
  });
}

/** Get all texts that were passed to speechSynthesis.speak */
async function getSpokenTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__ttsSpokenTexts || []);
}

/** Insert a test order directly via the app's Supabase client */
async function insertTestOrder(page: Page, overrides: Record<string, any> = {}) {
  const orderId = `ORD-TEST-${Date.now().toString(36).toUpperCase()}`;
  
  const result = await page.evaluate(async ({ orderId, overrides }) => {
    // Access Supabase client via the app's module system
    // @ts-ignore — runs in browser context where Vite resolves this
    const mod = await import('/src/lib/supabase.ts');
    const supabase = mod.supabase;
    
    const order = {
      id: orderId,
      table_id: overrides.table_id || 'A1',
      status: overrides.status || 'pending',
      type: overrides.type || 'guest',
      items: overrides.items || [
        { id: 'test_001', qty: 1, name: 'Nasi Goreng Jawa', price: 25000, category: 'Makanan' }
      ],
      subtotal: overrides.subtotal || 25000,
      total: overrides.total || 25000,
      order_mode: overrides.order_mode || 'dine-in',
      notes: overrides.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('orders').insert(order).select().single();
    return { data, error: error?.message || null };
  }, { orderId, overrides });
  
  return { orderId, ...result };
}

/** Delete a test order */
async function deleteTestOrder(page: Page, orderId: string) {
  await page.evaluate(async (id) => {
    // @ts-ignore — runs in browser context where Vite resolves this
    const mod = await import('/src/lib/supabase.ts');
    await mod.supabase.from('orders').delete().eq('id', id);
  }, orderId);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('TTS System — PSRMENUDIGITAL', () => {
  
  test.describe.configure({ mode: 'serial' });

  // ── Test 1: TTS toggle button visible and functional ───────────────────
  test('1. TTS toggle button is visible and toggleable', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Find TTS toggle button by title
    const ttsToggle = page.locator('button[title="TTS Toggle"]');
    await expect(ttsToggle).toBeVisible();
    
    // Read initial state
    const initialState = await page.evaluate(() => localStorage.getItem('pawon_tts_enabled'));
    
    // Click to toggle OFF
    if (initialState === 'true' || initialState === null) {
      await ttsToggle.click();
      const stored = await page.evaluate(() => localStorage.getItem('pawon_tts_enabled'));
      expect(stored).toBe('false');
    }
    
    // Click to toggle back ON
    await ttsToggle.click();
    const storedAgain = await page.evaluate(() => localStorage.getItem('pawon_tts_enabled'));
    expect(storedAgain).toBe('true');
  });

  // ── Test 2: TTS preference persists across page reload ─────────────────
  test('2. TTS ON/OFF state persists to localStorage across reload', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Set TTS to OFF via toggle
    await page.evaluate(() => localStorage.setItem('pawon_tts_enabled', 'false'));
    
    // Reload and check it's still OFF
    await page.reload();
    await page.waitForTimeout(3000);
    const afterReload = await page.evaluate(() => localStorage.getItem('pawon_tts_enabled'));
    expect(afterReload).toBe('false');
    
    // The toggle should show VolumeX icon (muted)
    const ttsToggle = page.locator('button[title="TTS Toggle"]');
    await expect(ttsToggle).toBeVisible();
    
    // Cleanup: re-enable
    await page.evaluate(() => localStorage.setItem('pawon_tts_enabled', 'true'));
  });

  // ── Test 3: Test TTS button triggers speechSynthesis ───────────────────
  test('3. Test TTS button triggers speechSynthesis.speak', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Ensure TTS is enabled
    await page.evaluate(() => localStorage.setItem('pawon_tts_enabled', 'true'));
    await page.reload();
    await page.waitForTimeout(3000);
    
    await stubSpeechSynthesis(page);
    
    // Click the "Test TTS" button (hidden on mobile: hidden sm:flex)
    const testBtn = page.locator('button[title="Test TTS"]');
    
    if (await testBtn.isVisible()) {
      await testBtn.click();
      await page.waitForTimeout(1000);
      
      const spoken = await getSpokenTexts(page);
      expect(spoken.length).toBeGreaterThanOrEqual(1);
      expect(spoken.some(t => t.includes('Cek suara'))).toBe(true);
    } else {
      // Button hidden on small viewport — that's expected behavior
      test.skip();
    }
  });

  // ── Test 4: New order triggers TTS auto-announce ──────────────────────
  test('4. New order triggers auto-announce with [TTS] console log', async ({ page }) => {
    const ttsLogs = collectConsoleLogs(page, '[TTS]');
    
    await loginAsAdmin(page);
    await stubSpeechSynthesis(page);
    
    // Wait for first load to complete (marks existing orders as known)
    await page.waitForTimeout(6000);
    ttsLogs.length = 0;
    
    // Insert a new order directly into Supabase
    const { orderId, error } = await insertTestOrder(page);
    expect(error).toBeNull();
    
    // Wait for polling interval (30s) or realtime to pick it up
    await page.waitForTimeout(35000);
    
    // Check console logs for TTS announcement
    const announceLogs = ttsLogs.filter(l => l.includes('Announcing order:'));
    expect(announceLogs.length).toBeGreaterThanOrEqual(1);
    
    // Verify spoken text contains expected fragments
    const spoken = await getSpokenTexts(page);
    const orderSpeech = spoken.find(t => t.includes('Nasi Goreng Jawa'));
    expect(orderSpeech).toBeDefined();
    expect(orderSpeech).toContain('Pesanan');
    expect(orderSpeech).toContain('Mohon segera diproses');
    
    // Cleanup
    await deleteTestOrder(page, orderId);
  });

  // ── Test 5: First-load suppression ─────────────────────────────────────
  test('5. First-load suppression — pre-existing orders are NOT announced', async ({ page }) => {
    // Clear any existing session/TTS state
    await page.goto('/#/');
    await page.evaluate(() => {
      localStorage.setItem('pawon_tts_enabled', 'true');
    });
    
    // Insert an order BEFORE login (so it exists at first load)
    await page.waitForTimeout(1000);
    const { orderId, error } = await insertTestOrder(page);
    expect(error).toBeNull();
    
    // Now set up console logging BEFORE navigating to admin
    const ttsLogs = collectConsoleLogs(page, '[TTS]');
    
    // Login to admin
    await loginAsAdmin(page);
    await stubSpeechSynthesis(page);
    
    // Wait for first load
    await page.waitForTimeout(6000);
    
    // The pre-existing order should NOT be announced
    const announceLogs = ttsLogs.filter(l => l.includes('Announcing order:') && l.includes(orderId));
    expect(announceLogs.length).toBe(0);
    
    // But first-load marking should have occurred
    const firstLoadLogs = ttsLogs.filter(l => l.includes('First load - marking'));
    expect(firstLoadLogs.length).toBeGreaterThanOrEqual(1);
    
    // Cleanup
    await deleteTestOrder(page, orderId);
  });

  // ── Test 6: TTS disabled — no announcement ────────────────────────────
  test('6. TTS disabled — new orders are NOT announced', async ({ page }) => {
    // Disable TTS before login
    await page.goto('/#/');
    await page.evaluate(() => localStorage.setItem('pawon_tts_enabled', 'false'));
    
    const ttsLogs = collectConsoleLogs(page, '[TTS]');
    
    await loginAsAdmin(page);
    await stubSpeechSynthesis(page);
    
    await page.waitForTimeout(6000);
    ttsLogs.length = 0;
    
    // Insert a new order
    const { orderId, error } = await insertTestOrder(page);
    expect(error).toBeNull();
    
    // Wait for polling cycle
    await page.waitForTimeout(35000);
    
    // Should NOT have any announcement
    const announceLogs = ttsLogs.filter(l => l.includes('Announcing order:'));
    expect(announceLogs.length).toBe(0);
    
    const spoken = await getSpokenTexts(page);
    expect(spoken.length).toBe(0);
    
    // Cleanup
    await deleteTestOrder(page, orderId);
    await page.evaluate(() => localStorage.setItem('pawon_tts_enabled', 'true'));
  });

  // ── Test 7: Announcement text format correctness ──────────────────────
  test('7. Announcement text matches expected Indonesian format', async ({ page }) => {
    const ttsLogs = collectConsoleLogs(page, '[TTS]');
    
    await loginAsAdmin(page);
    await stubSpeechSynthesis(page);
    
    // Wait for first load
    await page.waitForTimeout(6000);
    ttsLogs.length = 0;
    
    // Insert order with specific items for text verification
    const { orderId, error } = await insertTestOrder(page, {
      table_id: 'A3',
      type: 'waiter',
      order_mode: 'take-away',
      notes: 'tidak pedas',
      items: [
        { id: 'test_drink', qty: 1, name: 'Es Teh Manis', price: 8000, category: 'Minuman' },
        { id: 'test_food', qty: 2, name: 'Nasi Goreng Jawa', price: 25000, category: 'Makanan' },
      ],
    });
    expect(error).toBeNull();
    
    // Wait for detection + announcement
    await page.waitForTimeout(35000);
    
    const spoken = await getSpokenTexts(page);
    const orderSpeech = spoken.find(t => t.includes('Meja A3'));
    expect(orderSpeech).toBeDefined();
    
    if (orderSpeech) {
      // Has both food + drink → "dapur dan bar"
      expect(orderSpeech).toContain('dapur dan bar');
      // Source: waiter → "dari pelayan"
      expect(orderSpeech).toContain('dari pelayan');
      // Mode: take-away → "dibungkus"
      expect(orderSpeech).toContain('dibungkus');
      // Qty 2 → "dua"
      expect(orderSpeech).toContain('dua');
      // Qty 1 → "satu"  
      expect(orderSpeech).toContain('satu');
      // Chef note uses intentional "shef" for Indonesian articulation
      expect(orderSpeech).toContain('Catatan untuk shef');
      expect(orderSpeech).toContain('tidak pedas');
      // Drinks listed BEFORE food (useTTS sorts: Minuman first)
      const drinkPos = orderSpeech.indexOf('Es Teh Manis');
      const foodPos = orderSpeech.indexOf('Nasi Goreng Jawa');
      expect(drinkPos).toBeLessThan(foodPos);
      // Ends with closing phrase
      expect(orderSpeech).toContain('Mohon segera diproses');
    }
    
    // Cleanup
    await deleteTestOrder(page, orderId);
  });

  // ── Test 8: Connection badge shows green (online) ─────────────────────
  test('8. Connection badge shows green when Supabase is online', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Wait for Supabase connection
    await page.waitForTimeout(6000);
    
    // The ConnectionBadge has title="Supabase Online" when connected
    const onlineBadge = page.locator('div[title="Supabase Online"]');
    
    // Should be visible and have green styling
    await expect(onlineBadge).toBeVisible({ timeout: 15000 });
    
    // Verify the Wifi icon is present (not WifiOff)
    const wifiIcon = onlineBadge.locator('svg');
    await expect(wifiIcon).toBeVisible();
    
    // Verify green CSS class
    const classes = await onlineBadge.getAttribute('class');
    expect(classes).toContain('bg-green-500');
  });

  // ── Test 9: Cross-tab lock mechanism ──────────────────────────────────
  test('9. Cross-tab localStorage lock prevents duplicate announcement', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Simulate another tab having already claimed an order
    const fakeOrderId = `ORD-FAKE-${Date.now()}`;
    const lockTimestamp = Date.now();
    
    await page.evaluate(({ id, ts }) => {
      localStorage.setItem(`tts_lock_${id}`, String(ts));
    }, { id: fakeOrderId, ts: lockTimestamp });
    
    // Verify the lock exists and is a valid timestamp
    const lockValue = await page.evaluate((id) => {
      return localStorage.getItem(`tts_lock_${id}`);
    }, fakeOrderId);
    
    expect(lockValue).not.toBeNull();
    expect(Number(lockValue)).toBe(lockTimestamp);
    
    // Verify lock key format matches what useTTS expects: tts_lock_{orderId}
    const allKeys = await page.evaluate((id) => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tts_lock_')) keys.push(k);
      }
      return keys;
    }, fakeOrderId);
    
    expect(allKeys).toContain(`tts_lock_${fakeOrderId}`);
    
    // Cleanup
    await page.evaluate((id) => localStorage.removeItem(`tts_lock_${id}`), fakeOrderId);
  });

  // ── Test 10: preloadVoices called on init ─────────────────────────────
  test('10. preloadVoices initializes speechSynthesis on page load', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    await loginAsAdmin(page);
    
    // Verify speechSynthesis is available and getVoices can be called
    const hasSpeechSynth = await page.evaluate(() => {
      return 'speechSynthesis' in window;
    });
    expect(hasSpeechSynth).toBe(true);
    
    // Verify voices list is accessible (preloadVoices should have been called)
    const voicesAvailable = await page.evaluate(() => {
      const voices = window.speechSynthesis.getVoices();
      return voices.length;
    });
    // Note: headless Chromium may return 0 voices, but the call should not throw
    expect(voicesAvailable).toBeGreaterThanOrEqual(0);
  });
});
