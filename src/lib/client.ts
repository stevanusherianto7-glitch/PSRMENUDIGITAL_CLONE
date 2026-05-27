/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI KONFIGURASI ENV DAN CLIENT SUPABASE UNTUK Kedai Elvera 57.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN SISTEM KEHILANGAN KONEKSI DATA. ⚠️
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  )
}
