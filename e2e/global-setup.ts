/**
 * Playwright Global Setup — runs ONCE before all tests.
 *
 * Membersihkan semua order test lama (ID diawali "ORD-TEST-") dari Supabase
 * agar tidak mengganggu filter waktu dan logika TTS pada test berikutnya.
 */

import { request } from '@playwright/test';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://pbitlwrgainrcippjuwd.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4fJEkMwBlAmMjBez-6KgXA_eAXRMdsJ';

export default async function globalSetup() {
  console.log('\n[SETUP] Membersihkan order test lama dari Supabase...');

  const api = await request.newContext({
    baseURL: SUPABASE_URL,
    extraHTTPHeaders: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  // Hapus semua order yang ID-nya diawali "ORD-TEST-"
  // Supabase REST: DELETE /rest/v1/orders?id=like.*
  const res = await api.delete('/rest/v1/orders', {
    params: {
      id: 'like.ORD-TEST-%',
    },
  });

  if (res.ok()) {
    const text = await res.text();
    console.log(`[SETUP] ✅ Cleanup sukses (status ${res.status()}): ${text || '(kosong)'}`);
  } else {
    const text = await res.text();
    console.warn(`[SETUP] ⚠️ Cleanup gagal (status ${res.status()}): ${text}`);
  }

  await api.dispose();
}
