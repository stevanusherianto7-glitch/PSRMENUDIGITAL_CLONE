-- Migration to add order_id to transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS order_id text;
COMMENT ON COLUMN public.transactions.order_id IS 'ID Order referensi dari tabel orders';
