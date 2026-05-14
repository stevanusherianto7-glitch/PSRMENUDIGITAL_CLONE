import { createClient } from '@supabase/supabase-js';

/**
 * ──────────────────────────────────────────────────────────
 *  Kedai Elvera 57 — Supabase Client
 *  Project: https://ywqatzkkvbzkjnoexvux.supabase.co
 * ──────────────────────────────────────────────────────────
 *
 *  SCHEMA SQL — jalankan di Supabase SQL Editor:
 *
 *  -- Meja (Tables)
 *  create table if not exists meja (
 *    id text primary key,
 *    seat integer not null,
 *    status text not null default 'available'
 *      check (status in ('available','occupied','service','reserved')),
 *    pax integer,
 *    total bigint,
 *    duration text,
 *    orders text[],
 *    updated_at timestamptz default now()
 *  );
 *
 *  -- Menu Items
 *  create table if not exists menu_items (
 *    id text primary key,
 *    name text not null,
 *    category text not null,
 *    price bigint not null,
 *    image text,
 *    available boolean not null default true,
 *    tag text,
 *    created_at timestamptz default now()
 *  );
 *
 *  -- Inventory
 *  create table if not exists inventory (
 *    id text primary key,
 *    name text not null,
 *    qty numeric not null,
 *    unit text not null,
 *    exp_date date not null,
 *    category text not null,
 *    method text not null check (method in ('FIFO','LIFO')),
 *    stock numeric not null,
 *    min_stock numeric not null,
 *    updated_at timestamptz default now()
 *  );
 *
 *  -- Transactions
 *  create table if not exists transactions (
 *    id text primary key,
 *    table_id text,
 *    items jsonb not null default '[]',
 *    subtotal bigint not null,
 *    tax bigint not null,
 *    total bigint not null,
 *    method text not null,
 *    created_at timestamptz default now()
 *  );
 *
 *  -- Enable Realtime
 *  alter publication supabase_realtime add table meja;
 *  alter publication supabase_realtime add table transactions;
 *
 *  -- Disable RLS (demo mode)
 *  alter table meja disable row level security;
 *  alter table menu_items disable row level security;
 *  alter table inventory disable row level security;
 *  alter table transactions disable row level security;
 */

// Using credentials from auto-generated config file
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseKey = publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
