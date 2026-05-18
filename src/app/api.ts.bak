/**
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI SELURUH OPERASI CRUD ORDER & TRANSAKSI LANGSUNG KE SUPABASE.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN PESANAN TIDAK MASUK ATAU DATA HILANG. ⚠️
 *
 * v2.0 — Direct Supabase (menggantikan Edge Function + KV Store)
 * Alasan migrasi:
 *   - Edge Function menyimpan order di kv_store (bukan tabel relasional)
 *   - Sering gagal / cold start lambat → pesanan hilang
 *   - Tidak bisa query efisien (filter, sort, pagination)
 *   - Supabase Realtime tidak bisa subscribe ke kv_store
 */

import { supabase } from "../lib/supabase";
import type {
  Order,
  CartItem,
  OrderType,
  OrderMode,
  OrderStatus,
  Transaction,
  PaginatedResponse,
} from "./types";

// ─── ORDER ID GENERATOR ─────────────────────────────────────────────────────
function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

/**
 * Fetch orders, optionally filter by status and/or tableId.
 */
export async function fetchOrders(status?: string, tableId?: string): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (tableId) {
    query = query.eq("tableId", tableId);
  }

  // Bypass browser cache for GET requests
  query = query.neq("id", `dummy-${Date.now()}`);

  const { data, error } = await query;

  if (error) {
    console.error("fetchOrders error:", error.message);
    throw error;
  }

  return (data as Order[]) || [];
}

/**
 * Fetch paginated orders for Admin/Kasir modules.
 */
export async function fetchPaginatedOrders(
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<PaginatedResponse<Order>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("fetchPaginatedOrders error:", error.message);
    throw error;
  }

  return {
    data: (data as Order[]) || [],
    total: count || 0,
    page,
    limit,
  };
}

/**
 * Create a new order.
 */
export async function createOrder(payload: {
  tableId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  notes?: string;
  orderMode: OrderMode;
  type: OrderType;
}): Promise<Order> {
  const order = {
    id: generateOrderId(),
    tableId: payload.tableId,
    items: payload.items.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      qty: c.qty,
      category: c.category,
    })),
    subtotal: payload.subtotal,
    total: payload.total,
    notes: payload.notes || "",
    orderMode: payload.orderMode,
    status: "pending" as OrderStatus,
    type: payload.type,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();

  if (error) {
    console.error("createOrder error:", error.message);
    throw error;
  }

  return data as Order;
}

/**
 * Update an existing order (e.g., change status).
 */
export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order> {
  // Sanitize: prevent overwriting id or created_at
  const { id: _, created_at: __, ...safePatch } = patch as any;

  const { data, error } = await supabase
    .from("orders")
    .update({
      ...safePatch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`updateOrder(${id}) error:`, error.message);
    throw error;
  }

  return data as Order;
}

/**
 * Delete an order by ID.
 */
export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`deleteOrder(${id}) error:`, error.message);
    throw error;
  }
}

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────

/**
 * Fetch paginated transactions with optional date range filter.
 */
export async function fetchTransactions(
  page: number = 1,
  limit: number = 50,
  dateRange?: { from?: Date; to?: Date }
): Promise<PaginatedResponse<Transaction>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (dateRange?.from) {
    query = query.gte("created_at", dateRange.from.toISOString());
  }
  if (dateRange?.to) {
    query = query.lte("created_at", dateRange.to.toISOString());
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("fetchTransactions error:", error.message);
    throw error;
  }

  return {
    data: (data as Transaction[]) || [],
    total: count || 0,
    page,
    limit,
  };
}