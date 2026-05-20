-- Migration: Sync schema by adding missing column and tables
-- Target: Supabase remote & local DBs

-- 1. Aktifkan ekstensi uuid jika belum ada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Buat fungsi handle_updated_at jika belum terdaftar
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- 3. Tambah kolom served_at pada tabel orders jika belum ada
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS served_at timestamptz;

-- 4. Buat tabel event_gallery jika belum ada
CREATE TABLE IF NOT EXISTS public.event_gallery (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  date        text        NOT NULL,
  category    text        NOT NULL,
  image       text        NOT NULL,
  description text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger untuk updated_at event_gallery
DROP TRIGGER IF EXISTS set_event_gallery_updated_at ON public.event_gallery;
CREATE TRIGGER set_event_gallery_updated_at
  BEFORE UPDATE ON public.event_gallery
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.event_gallery DISABLE ROW LEVEL SECURITY;

-- Enable Realtime dengan penanganan Exception lengkap
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.event_gallery;
EXCEPTION 
  WHEN duplicate_object THEN
    RAISE NOTICE 'Table event_gallery is already in publication.';
  WHEN object_not_in_prerequisite_state THEN
    RAISE NOTICE 'Publication is FOR ALL TABLES. Skipping.';
  WHEN undefined_table THEN
    RAISE NOTICE 'Table public.event_gallery does not exist yet. Skipping.';
END $$;

-- Seed Data Awal Event Gallery jika belum ada
INSERT INTO public.event_gallery (title, date, category, image, description)
VALUES
  ('Jamuan Pernikahan Premium', '12 Mei 2026', 'Wedding', '/imports/event_wedding.png', 'Merayakan hari bahagia bersama keluarga tercinta dengan konsep prasmanan premium dan dekorasi adat Jawa modern yang anggun.'),
  ('Gathering & Rapat Korporat', '28 April 2026', 'Corporate', '/imports/event_gathering.png', 'Jamuan makan siang prasmanan premium dan kopi rehat berkualitas untuk kegiatan rapat kerja instansi dan forum korporat.'),
  ('Ulang Tahun & Kumpul Keluarga', '05 April 2026', 'Birthday', '/imports/event_birthday.png', 'Momen hangat kumpul keluarga besar merayakan ulang tahun dengan hidangan lezat racikan khusus koki andalan kami.'),
  ('Weekend Live Music Session', 'Maret - Mei 2026', 'Music Event', '/imports/event_livemusic.png', 'Keseruan akhir pekan di area taman outdoor menikmati alunan live acoustic music ditemani hidangan santai bersama sahabat.')
ON CONFLICT DO NOTHING;

-- 5. Buat tabel reservations jika belum ada
CREATE TABLE IF NOT EXISTS public.reservations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  phone       text        NOT NULL,
  type        text        NOT NULL,
  guests      integer     NOT NULL,
  date        text        NOT NULL,
  time        text        NOT NULL,
  notes       text,
  status      text        NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger untuk updated_at reservations
DROP TRIGGER IF EXISTS set_reservations_updated_at ON public.reservations;
CREATE TRIGGER set_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.reservations DISABLE ROW LEVEL SECURITY;

-- Enable Realtime untuk reservations dengan penanganan Exception lengkap
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
EXCEPTION 
  WHEN duplicate_object THEN
    RAISE NOTICE 'Table reservations is already in publication.';
  WHEN object_not_in_prerequisite_state THEN
    RAISE NOTICE 'Publication is FOR ALL TABLES. Skipping.';
  WHEN undefined_table THEN
    RAISE NOTICE 'Table public.reservations does not exist yet. Skipping.';
END $$;
