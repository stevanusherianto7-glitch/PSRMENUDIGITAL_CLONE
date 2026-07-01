-- =====================================================
-- PSRMENUDIGITAL - Schema Cleanup & Migration
-- Date: 2026-07-01
-- Kedai Elvera 57 Restaurant POS + Digital Menu
-- =====================================================

-- =====================================================
-- STEP 1: CREATE MISSING TABLES
-- =====================================================

-- 1. Meja (Restaurant Tables) - dari supabase.ts schema
CREATE TABLE IF NOT EXISTS meja (
  id        text PRIMARY KEY,
  seat      integer NOT NULL,
  status    text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','occupied','service','reserved')),
  pax       integer,
  total     bigint,
  duration  text,
  orders    text[],
  updated_at timestamptz DEFAULT now()
);

-- Seed data meja 1-10
INSERT INTO meja (id, seat, status) VALUES
  ('1', 4, 'available'), ('2', 4, 'available'), ('3', 4, 'available'),
  ('4', 4, 'available'), ('5', 6, 'available'), ('6', 6, 'available'),
  ('7', 2, 'available'), ('8', 2, 'available'), ('9', 8, 'available'),
  ('10', 10, 'available')
ON CONFLICT (id) DO NOTHING;

-- 2. Jadwal Shift Karyawan - dari JadwalShift.tsx + KaryawanModule.tsx
CREATE TABLE IF NOT EXISTS jadwal_shift (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name text NOT NULL,
  role          text NOT NULL DEFAULT 'Staff',
  schedule      JSONB DEFAULT '[]'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 3. Absensi Karyawan - dari JadwalShift.tsx
CREATE TABLE IF NOT EXISTS attendances (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id text NOT NULL,
  date        date NOT NULL,
  status      text NOT NULL DEFAULT 'hadir'
    CHECK (status IN ('hadir','izin','sakit','alpha')),
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- 4. Bahan Resep (HPP Calculator) - dari KalkulatorHPP.tsx
CREATE TABLE IF NOT EXISTS bahan_resep (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             text NOT NULL,
  price            numeric NOT NULL DEFAULT 0,
  conversion_value numeric NOT NULL DEFAULT 1000,
  qty              numeric NOT NULL DEFAULT 1,
  unit             text DEFAULT 'gram',
  created_at       timestamptz DEFAULT now()
);

-- 5. Aset Inventaris - dari AssetModule.tsx
CREATE TABLE IF NOT EXISTS assets (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  category   text NOT NULL DEFAULT 'Lainnya'
    CHECK (category IN ('Elektronik','Furnitur','Peralatan Dapur','Lainnya')),
  quantity   integer NOT NULL DEFAULT 0,
  condition  text NOT NULL DEFAULT 'Baik'
    CHECK (condition IN ('Baik','Perlu Perbaikan','Rusak')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Log Inventory - dari AdminPage.tsx (inventory_logs)
CREATE TABLE IF NOT EXISTS inventory_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id text REFERENCES inventory(id) ON DELETE SET NULL,
  action       text NOT NULL CHECK (action IN ('masuk','keluar','adjust','expired')),
  qty_change   numeric NOT NULL DEFAULT 0,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- 7. Transaction Items (detail per item per transaksi)
CREATE TABLE IF NOT EXISTS transaction_items (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id text REFERENCES transactions(id) ON DELETE CASCADE,
  menu_item_id   text,
  name           text NOT NULL,
  category       text,
  qty            integer NOT NULL DEFAULT 1,
  price          bigint NOT NULL DEFAULT 0,
  subtotal       bigint NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

-- =====================================================
-- STEP 2: ENABLE REALTIME (sesuai supabase.ts docs)
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE meja;
ALTER PUBLICATION supabase_realtime ADD TABLE jadwal_shift;

-- =====================================================
-- STEP 3: DISABLE RLS (demo mode - sesuai supabase.ts)
-- =====================================================
ALTER TABLE meja             DISABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_shift     DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendances      DISABLE ROW LEVEL SECURITY;
ALTER TABLE bahan_resep      DISABLE ROW LEVEL SECURITY;
ALTER TABLE assets           DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs   DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: DROP OBSOLETE TABLES (digantikan tabel baru)
-- =====================================================

-- karyawan → digantikan jadwal_shift + attendances
DROP TABLE IF EXISTS karyawan CASCADE;

-- shift → digantikan jadwal_shift
DROP TABLE IF EXISTS shift CASCADE;

-- stok → digantikan inventory (sudah ada)
DROP TABLE IF EXISTS stok CASCADE;

-- order_items → digantikan transaction_items
DROP TABLE IF EXISTS order_items CASCADE;

-- tables → digantikan meja
DROP TABLE IF EXISTS "tables" CASCADE;

-- pelanggan → tidak dipakai di aplikasi manapun
DROP TABLE IF EXISTS pelanggan CASCADE;

-- categories → hardcoded di data.ts, bukan dari DB
DROP TABLE IF EXISTS categories CASCADE;

-- payments → tidak dipakai (transaksi via transactions)
DROP TABLE IF EXISTS payments CASCADE;

-- notifications → tidak diimplementasikan
DROP TABLE IF EXISTS notifications CASCADE;

-- settings → tidak dipakai di kode
DROP TABLE IF EXISTS settings CASCADE;

-- tts_settings → tidak dipakai di kode
DROP TABLE IF EXISTS tts_settings CASCADE;

-- logs → tidak dipakai di kode
DROP TABLE IF EXISTS logs CASCADE;

-- =====================================================
-- STEP 5: CLEANUP profiles table
-- =====================================================

-- Hapus kolom 'password' dari profiles 
-- (Supabase Auth yang mengelola password, bukan kolom ini)
ALTER TABLE profiles DROP COLUMN IF EXISTS password;

-- =====================================================
-- VERIFIKASI: Cek tabel yang tersisa
-- =====================================================
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns 
        WHERE table_name = t.table_name AND table_schema = 'public') as col_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
