-- ============================================================
--  PAWON SALAM RESTO — Supabase SQL Schema
--  Project : PSRMENUDIGITAL
--  Jalankan seluruh script ini di Supabase → SQL Editor
-- ============================================================


-- ─────────────────────────────────────────────────────────────
--  1. TABEL MEJA (Restaurant Tables)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.meja (
  id          text        primary key,
  seat        integer     not null,
  status      text        not null default 'available'
                          check (status in ('available','occupied','service','reserved')),
  pax         integer,
  total       bigint,
  duration    text,
  orders      text[],
  updated_at  timestamptz not null default now()
);

comment on table  public.meja            is 'Status real-time setiap meja restoran';
comment on column public.meja.id         is 'Kode meja, contoh: A1–A9';
comment on column public.meja.seat       is 'Kapasitas kursi';
comment on column public.meja.status     is 'available | occupied | service | reserved';
comment on column public.meja.pax        is 'Jumlah tamu saat ini';
comment on column public.meja.total      is 'Total tagihan sementara (Rupiah)';
comment on column public.meja.orders     is 'Daftar pesanan aktif (array string)';

-- Index untuk query berdasarkan status
create index if not exists idx_meja_status
  on public.meja (status);

-- Trigger untuk update updated_at
drop trigger if exists set_meja_updated_at on public.meja;
create trigger set_meja_updated_at
  before update on public.meja
  for each row execute function public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────
--  2. TABEL MENU ITEMS (CLONED FROM ORDER_MENU_ITEMS SCHEMA)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.menu_items (
  id          bigserial    not null,
  menu_name   text        not null,
  image_url   text        not null,
  qty         integer     not null default 1,
  harga       numeric(12,2) not null,
  order_type  text        not null,
  chefs_note  text        not null default 'pedas manis',
  table_number text       null,
  constraint menu_items_pkey primary key (id),
  constraint menu_items_harga_chk check ((harga >= (0)::numeric)),
  constraint menu_items_qty_chk check ((qty > 0)),
  constraint menu_items_table_chk check (
    (
      (table_number is null)
      or (table_number ~ '^[A-J]([1-9]|10)$'::text)
    )
  )
);

comment on table  public.menu_items           is 'Katalog menu digital restoran (cloned from order_menu_items schema)';
comment on column public.menu_items.id         is 'Primary key auto-increment';
comment on column public.menu_items.menu_name  is 'Nama menu item';
comment on column public.menu_items.image_url  is 'URL gambar menu item';
comment on column public.menu_items.qty        is 'Jumlah pesanan (minimal 1)';
comment on column public.menu_items.harga      is 'Harga dalam Rupiah (numeric 12,2)';
comment on column public.menu_items.order_type is 'Tipe pesanan';
comment on column public.menu_items.chefs_note is 'Catatan untuk chef (default: pedas manis)';
comment on column public.menu_items.table_number is 'Nomor meja (format: A-J + 1-10)';

-- Index untuk query berdasarkan table_number
create index if not exists idx_menu_items_table_number
  on public.menu_items (table_number);

-- Index untuk query berdasarkan order_type
create index if not exists idx_menu_items_order_type
  on public.menu_items (order_type);

-- Trigger untuk update updated_at
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'menu_items' and column_name = 'updated_at'
  ) then
    alter table public.menu_items
    add column updated_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_menu_items_updated_at'
  ) then
    drop trigger if exists set_menu_items_updated_at on public.menu_items;
    create trigger set_menu_items_updated_at
      before update on public.menu_items
      for each row execute function public.handle_updated_at();
  end if;
end
$$;


-- ─────────────────────────────────────────────────────────────
--  3. TABEL ORDER MENU ITEMS (dari bucket public-images)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.order_menu_items (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  image_url   text        not null,
  category    text        default 'Makanan',
  price       bigint      not null default 0 check (price >= 0),
  available   boolean     not null default true,
  description text,
  created_at  timestamptz not null default now()
);

comment on table  public.order_menu_items         is 'Menu items yang diambil dari bucket public-images';
comment on column public.order_menu_items.name      is 'Nama menu (diambil dari nama file)';
comment on column public.order_menu_items.image_url is 'URL gambar dari bucket public-images';
comment on column public.order_menu_items.category  is 'Kategori menu default: Makanan';
comment on column public.order_menu_items.price    is 'Harga default 0 (harus diupdate)';
comment on column public.order_menu_items.available is 'Status ketersediaan default: true';

-- Index untuk query berdasarkan kategori
create index if not exists idx_order_menu_items_category
  on public.order_menu_items (category);

-- Index untuk query berdasarkan availability
create index if not exists idx_order_menu_items_available
  on public.order_menu_items (available);

-- Trigger untuk update updated_at (tambahkan updated_at column dulu)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'order_menu_items' and column_name = 'updated_at'
  ) then
    alter table public.order_menu_items
    add column updated_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_order_menu_items_updated_at'
  ) then
    drop trigger if exists set_order_menu_items_updated_at on public.order_menu_items;
    create trigger set_order_menu_items_updated_at
      before update on public.order_menu_items
      for each row execute function public.handle_updated_at();
  end if;
end
$$;

-- ─────────────────────────────────────────────────────────────
--  4. TABEL INVENTORY
-- ─────────────────────────────────────────────────────────────
create table if not exists public.inventory (
  id          text        primary key,
  name        text        not null,
  qty         numeric     not null check (qty >= 0),
  unit        text        not null,
  exp_date    date        not null,
  category    text        not null,
  method      text        not null default 'FIFO'
                          check (method in ('FIFO','LIFO')),
  stock       numeric     not null check (stock >= 0),
  min_stock   numeric     not null check (min_stock >= 0),
  updated_at  timestamptz not null default now()
);

comment on table  public.inventory            is 'Stok bahan baku dapur dengan tracking FIFO/LIFO';
comment on column public.inventory.qty        is 'Kuantitas saat ini';
comment on column public.inventory.exp_date   is 'Tanggal kadaluarsa';
comment on column public.inventory.method     is 'Metode pengeluaran stok: FIFO atau LIFO';
comment on column public.inventory.stock      is 'Stok aktual (sama dengan qty, untuk tracking historis)';
comment on column public.inventory.min_stock  is 'Batas minimum sebelum alert stok rendah';


-- ─────────────────────────────────────────────────────────────
--  5. TABEL TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id          text        primary key,
  table_id    text,
  items       jsonb       not null default '[]'::jsonb,
  subtotal    bigint      not null check (subtotal >= 0),
  tax         bigint      not null check (tax >= 0),
  total       bigint      not null check (total >= 0),
  method      text        not null
                          check (method in ('Tunai','QRIS','Debit','E-Wallet')),
  created_at  timestamptz not null default now()
);

comment on table  public.transactions          is 'Riwayat transaksi penjualan POS';
comment on column public.transactions.table_id is 'Kode meja atau "Walk-in"';
comment on column public.transactions.items    is 'Array CartItem dalam format JSONB';
comment on column public.transactions.subtotal is 'Subtotal sebelum PPN (Rupiah)';
comment on column public.transactions.tax      is 'PPN 10% (Rupiah)';
comment on column public.transactions.total    is 'Total akhir termasuk PPN (Rupiah)';

-- Index untuk query laporan (filter by date)
create index if not exists idx_transactions_created_at
  on public.transactions (created_at desc);

create index if not exists idx_transactions_method
  on public.transactions (method);

create index if not exists idx_transactions_table_id
  on public.transactions (table_id);


-- ─────────────────────────────────────────────────────────────
--  6. FUNGSI AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- Trigger untuk inventory
drop trigger if exists set_inventory_updated_at on public.inventory;
create trigger set_inventory_updated_at
  before update on public.inventory
  for each row execute function public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────
--  7. REALTIME SUBSCRIPTIONS
--  (aktifkan di Supabase Dashboard → Database → Replication
--   atau jalankan perintah di bawah)
-- ─────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.meja;
exception when duplicate_object then
  raise notice 'Table meja is already in supabase_realtime publication';
end $$;

do $$ begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then
  raise notice 'Table transactions is already in supabase_realtime publication';
end $$;


-- ─────────────────────────────────────────────────────────────
--  8. ROW LEVEL SECURITY (nonaktifkan untuk mode demo)
--  PERINGATAN: Aktifkan RLS + policies di production!
-- ─────────────────────────────────────────────────────────────
alter table public.meja              disable row level security;
alter table public.menu_items        disable row level security;
alter table public.order_menu_items  disable row level security;
alter table public.inventory         disable row level security;
alter table public.transactions      disable row level security;


-- ─────────────────────────────────────────────────────────────
--  9. SEED DATA — MEJA (A1–A9)
-- ─────────────────────────────────────────────────────────────
insert into public.meja (id, seat, status, pax, total, duration, orders)
values
  ('A1', 4, 'occupied', 3, 145000, '45m',     array['Gudeg Komplit x2','Soto Ayam x1']),
  ('A2', 2, 'available', null, null, null,     null),
  ('A3', 4, 'occupied', 2, 87000,  '15m',     array['Ayam Bakar x1','Es Dawet x2']),
  ('A4', 6, 'reserved', null, null, null,      null),
  ('A5', 8, 'occupied', 5, 256000, '1j 12m',  array['Gudeg Komplit x3','Ayam Bakar x2','Es Dawet x5']),
  ('A6', 4, 'service',  3, 198000, '58m',     array['Nasi Liwet x2','Tempe Bacem x4']),
  ('A7', 2, 'available', null, null, null,     null),
  ('A8', 4, 'occupied', 4, 312000, '32m',     array['Paket Keluarga x1','Es Jeruk x4']),
  ('A9', 6, 'available', null, null, null,     null)
on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────
-- 10. SEED DATA — MENU ITEMS (NEW SCHEMA)
-- ─────────────────────────────────────────────────────────────
-- Karena id adalah bigserial (auto-increment), kita tidak specify id.
-- Columns: menu_name, image_url, qty, harga, order_type, chefs_note, table_number
insert into public.menu_items (menu_name, image_url, qty, harga, order_type, chefs_note, table_number)
values
  ('Gudeg Komplit',       'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=200&fit=crop&auto=format',  1, 45000.00, 'Dine-in',  'pedas manis', 'A1'),
  ('Ayam Bakar Kecap',    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=300&h=200&fit=crop&auto=format',  1, 52000.00, 'Dine-in',  'pedas manis', 'A3'),
  ('Soto Ayam Lamongan',  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&h=200&fit=crop&auto=format',  1, 35000.00, 'Dine-in',  'pedas manis', 'A5'),
  ('Nasi Liwet Solo',     'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300&h=200&fit=crop&auto=format',  1, 42000.00, 'Dine-in',  'pedas manis', 'A6'),
  ('Tempe Bacem',         'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop&auto=format',  1, 18000.00, 'Dine-in',  'pedas manis', 'A8'),
  ('Perkedel Kentang',    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=300&h=200&fit=crop&auto=format',  1, 12000.00, 'Takeaway', 'pedas manis', null),
  ('Es Dawet Ayu',        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=200&fit=crop&auto=format',  1, 15000.00, 'Dine-in',  'pedas manis', 'A1'),
  ('Es Jeruk Peras',      'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=200&fit=crop&auto=format',  1, 12000.00, 'Dine-in',  'pedas manis', 'A3'),
  ('Kolak Pisang',        'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=200&fit=crop&auto=format',  1, 20000.00, 'Dine-in',  'pedas manis', 'A5'),
  ('Klepon',              'https://images.unsplash.com/photo-1559181567-c3190ca9be46?w=300&h=200&fit=crop&auto=format',  1, 16000.00, 'Takeaway', 'pedas manis', null)
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────
-- 11. SEED DATA — INVENTORY
--  Gunakan CURRENT_DATE untuk tanggal relatif
-- ─────────────────────────────────────────────────────────────
insert into public.inventory (id, name, qty, unit, exp_date, category, method, stock, min_stock)
values
  ('i1',  'Ayam Kampung',  5,    'kg',   CURRENT_DATE + interval '1 day',  'Protein',  'FIFO', 5,    8),
  ('i2',  'Daun Salam',    200,  'gram', CURRENT_DATE,                     'Rempah',   'FIFO', 200,  100),
  ('i3',  'Santan Kelapa', 3,    'liter',CURRENT_DATE + interval '2 days', 'Dairy',    'FIFO', 3,    5),
  ('i4',  'Beras Premium', 25,   'kg',   CURRENT_DATE + interval '90 days','Pokok',    'LIFO', 25,   10),
  ('i5',  'Cabe Merah',    2,    'kg',   CURRENT_DATE + interval '3 days', 'Sayuran',  'FIFO', 2,    3),
  ('i6',  'Gula Merah',    1,    'kg',   CURRENT_DATE + interval '40 days','Bumbu',    'LIFO', 1,    2),
  ('i7',  'Tahu Putih',    3,    'kg',   CURRENT_DATE + interval '1 day',  'Protein',  'FIFO', 3,    5),
  ('i8',  'Santan UHT',    6,    'liter',CURRENT_DATE + interval '6 days', 'Dairy',    'LIFO', 6,    4),
  ('i9',  'Kencur',        500,  'gram', CURRENT_DATE + interval '14 days','Rempah',   'FIFO', 500,  200),
  ('i10', 'Kelapa Parut',  1.5,  'kg',   CURRENT_DATE + interval '2 days', 'Bumbu',    'FIFO', 1.5,  2)
on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────
--  11. SEED DATA — SAMPLE TRANSACTIONS (7 hari terakhir)
-- ─────────────────────────────────────────────────────────────
insert into public.transactions (id, table_id, items, subtotal, tax, total, method, created_at)
values
  -- Hari ini
  ('TX-DEMO-01', 'A1', '[{"id":"m1","name":"Gudeg Komplit","qty":2,"price":45000},{"id":"m7","name":"Es Dawet Ayu","qty":2,"price":15000}]'::jsonb, 120000, 12000, 132000, 'QRIS',     now() - interval '2 hours'),
  ('TX-DEMO-02', 'A3', '[{"id":"m2","name":"Ayam Bakar Kecap","qty":1,"price":52000},{"id":"m8","name":"Es Jeruk Peras","qty":1,"price":12000}]'::jsonb, 64000,  6400,  70400,  'Tunai',    now() - interval '3 hours'),
  ('TX-DEMO-03', 'A5', '[{"id":"m1","name":"Gudeg Komplit","qty":3,"price":45000},{"id":"m2","name":"Ayam Bakar Kecap","qty":2,"price":52000}]'::jsonb, 239000, 23900, 262900, 'Debit',    now() - interval '4 hours'),
  ('TX-DEMO-04', 'Walk-in', '[{"id":"m7","name":"Es Dawet Ayu","qty":3,"price":15000},{"id":"m9","name":"Kolak Pisang","qty":2,"price":20000}]'::jsonb, 85000,  8500,  93500,  'E-Wallet', now() - interval '5 hours'),
  ('TX-DEMO-05', 'A8', '[{"id":"m4","name":"Nasi Liwet Solo","qty":4,"price":42000},{"id":"m5","name":"Tempe Bacem","qty":4,"price":18000}]'::jsonb, 240000, 24000, 264000, 'Tunai',    now() - interval '6 hours'),

  -- Kemarin
  ('TX-DEMO-06', 'A2', '[{"id":"m3","name":"Soto Ayam Lamongan","qty":2,"price":35000}]'::jsonb, 70000,  7000,  77000,  'QRIS',     now() - interval '1 day 1 hour'),
  ('TX-DEMO-07', 'A6', '[{"id":"m1","name":"Gudeg Komplit","qty":1,"price":45000},{"id":"m5","name":"Tempe Bacem","qty":2,"price":18000}]'::jsonb, 81000,  8100,  89100,  'Tunai',    now() - interval '1 day 3 hours'),
  ('TX-DEMO-08', 'A4', '[{"id":"m2","name":"Ayam Bakar Kecap","qty":3,"price":52000},{"id":"m8","name":"Es Jeruk Peras","qty":3,"price":12000}]'::jsonb, 192000, 19200, 211200, 'Debit',    now() - interval '1 day 5 hours'),

  -- 2 hari lalu
  ('TX-DEMO-09', 'A1', '[{"id":"m4","name":"Nasi Liwet Solo","qty":2,"price":42000},{"id":"m7","name":"Es Dawet Ayu","qty":4,"price":15000}]'::jsonb, 144000, 14400, 158400, 'E-Wallet', now() - interval '2 days 2 hours'),
  ('TX-DEMO-10', 'A9', '[{"id":"m1","name":"Gudeg Komplit","qty":5,"price":45000},{"id":"m9","name":"Kolak Pisang","qty":3,"price":20000}]'::jsonb, 285000, 28500, 313500, 'Tunai',    now() - interval '2 days 4 hours'),

  -- 3 hari lalu
  ('TX-DEMO-11', 'A3', '[{"id":"m2","name":"Ayam Bakar Kecap","qty":2,"price":52000},{"id":"m3","name":"Soto Ayam Lamongan","qty":2,"price":35000}]'::jsonb, 174000, 17400, 191400, 'QRIS',     now() - interval '3 days 1 hour'),
  ('TX-DEMO-12', 'A7', '[{"id":"m5","name":"Tempe Bacem","qty":6,"price":18000},{"id":"m10","name":"Klepon","qty":4,"price":16000}]'::jsonb, 172000, 17200, 189200, 'Tunai',    now() - interval '3 days 3 hours'),

  -- 4 hari lalu
  ('TX-DEMO-13', 'A5', '[{"id":"m1","name":"Gudeg Komplit","qty":4,"price":45000},{"id":"m2","name":"Ayam Bakar Kecap","qty":2,"price":52000}]'::jsonb, 284000, 28400, 312400, 'Debit',    now() - interval '4 days 2 hours'),
  ('TX-DEMO-14', 'Walk-in','[{"id":"m7","name":"Es Dawet Ayu","qty":5,"price":15000},{"id":"m8","name":"Es Jeruk Peras","qty":3,"price":12000}]'::jsonb, 111000, 11100, 122100, 'E-Wallet', now() - interval '4 days 4 hours'),

  -- 5 hari lalu
  ('TX-DEMO-15', 'A2', '[{"id":"m4","name":"Nasi Liwet Solo","qty":3,"price":42000},{"id":"m9","name":"Kolak Pisang","qty":2,"price":20000}]'::jsonb, 166000, 16600, 182600, 'QRIS',     now() - interval '5 days 1 hour'),
  ('TX-DEMO-16', 'A8', '[{"id":"m3","name":"Soto Ayam Lamongan","qty":4,"price":35000},{"id":"m5","name":"Tempe Bacem","qty":4,"price":18000}]'::jsonb, 212000, 21200, 233200, 'Tunai',    now() - interval '5 days 3 hours'),

  -- 6 hari lalu
  ('TX-DEMO-17', 'A6', '[{"id":"m1","name":"Gudeg Komplit","qty":6,"price":45000},{"id":"m2","name":"Ayam Bakar Kecap","qty":3,"price":52000}]'::jsonb, 426000, 42600, 468600, 'Debit',    now() - interval '6 days 2 hours'),
  ('TX-DEMO-18', 'A4', '[{"id":"m10","name":"Klepon","qty":8,"price":16000},{"id":"m7","name":"Es Dawet Ayu","qty":6,"price":15000}]'::jsonb, 218000, 21800, 239800, 'E-Wallet', now() - interval '6 days 4 hours')
on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────
--  12. VERIFIKASI — jalankan query ini untuk mengecek hasil
-- ─────────────────────────────────────────────────────────────
-- select 'meja'         as tabel, count(*) as rows from public.meja
-- union all
-- select 'menu_items',  count(*) from public.menu_items
-- union all
-- select 'order_menu_items', count(*) from public.order_menu_items
-- union all
-- select 'inventory',   count(*) from public.inventory
-- union all
-- select 'transactions',count(*) from public.transactions;


-- ─────────────────────────────────────────────────────────────
--  SELESAI ✓
--  Tabel  : 5 (meja, menu_items, order_menu_items, inventory, transactions)
--  Trigger: 2 (auto updated_at)
--  Indexes: 3 (created_at, method, table_id pada transactions)
--  Realtime: meja + transactions
--  Seed   : 9 meja, 10 menu, 10 inventory, 18 transaksi demo
-- ─────────────────────────────────────────────────────────────
