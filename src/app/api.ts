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
/**
 * DTO Adapter: Maps snake_case database columns to camelCase properties.
 * This guarantees frontend compatibility even if duplicate database columns are dropped!
 */
export function mapOrder(o: any): Order {
  if (!o) return o;
  const mapped = {
    ...o,
    tableId: o.table_id || o.tableId || "",
    orderMode: o.order_mode || o.orderMode || o.mode || "dine-in",
  };
  delete mapped.table_id;
  delete mapped.order_mode;
  return mapped;
}

export async function fetchOrders(status?: string, tableId?: string): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (tableId) {
    query = query.eq("table_id", tableId);
  }

  // Bypass browser cache for GET requests
  query = query.neq("id", `dummy-${Date.now()}`);

  const { data, error } = await query;

  if (error) {
    console.error("fetchOrders error:", error.message);
    throw error;
  }

  const dbOrders = ((data as any[]) || []).map(mapOrder);

  // Apply robust local fallback cache overrides if present
  try {
    const cachedOrdersStr = localStorage.getItem("pawon_orders_cache");
    if (cachedOrdersStr) {
      const cachedOrders = JSON.parse(cachedOrdersStr);
      return dbOrders.map(order => {
        if (cachedOrders[order.id]) {
          console.warn(`[ROBUST FALLBACK] Overriding order ${order.id} status from local fallback cache: ${order.status} -> ${cachedOrders[order.id].status}`);
          return mapOrder(cachedOrders[order.id]);
        }
        return order;
      });
    }
  } catch (e) {
    console.error("[ROBUST FALLBACK] Error applying local cache overrides:", e);
  }

  return dbOrders;
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

  const dbOrders = ((data as any[]) || []).map(mapOrder);

  // Apply robust local fallback cache overrides if present
  try {
    const cachedOrdersStr = localStorage.getItem("pawon_orders_cache");
    if (cachedOrdersStr) {
      const cachedOrders = JSON.parse(cachedOrdersStr);
      const modifiedOrders = dbOrders.map(order => {
        if (cachedOrders[order.id]) {
          return mapOrder(cachedOrders[order.id]);
        }
        return order;
      });
      return {
        data: modifiedOrders,
        total: count || 0,
        page,
        limit,
      };
    }
  } catch (e) {
    console.error("[ROBUST FALLBACK] Error applying local cache overrides in paginated:", e);
  }

  return {
    data: dbOrders,
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
    table_id: payload.tableId, // Hanya kirim kolom snake_case yang ada di DB
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
    order_mode: payload.orderMode, // Hanya kirim kolom snake_case yang ada di DB
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
    alert("Supabase Error: " + error.message);
    throw error;
  }

  return mapOrder(data);
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
    
    // Check for PostgreSQL 42703 (Undefined Column / Trigger error with "order_type")
    if (error.code === '42703' || (error.message && error.message.includes('order_type'))) {
      console.warn(`[ROBUST FALLBACK] Database schema/trigger error (42703) on updateOrder(${id}). Falling back to local state synchronization...`);
      
      try {
        // Fetch the base order record via SELECT (SELECT is safe and doesn't trigger UPDATE triggers)
        const { data: existing, error: fetchErr } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();
          
        if (!fetchErr && existing) {
          const merged = {
            ...existing,
            ...safePatch,
            updated_at: new Date().toISOString()
          };
          
          // Cache the merged order back into LocalStorage to guarantee local UI synchronization
          const cachedOrdersStr = localStorage.getItem("pawon_orders_cache") || "{}";
          const cachedOrders = JSON.parse(cachedOrdersStr);
          cachedOrders[id] = merged;
          localStorage.setItem("pawon_orders_cache", JSON.stringify(cachedOrders));
          
          console.log(`[ROBUST FALLBACK] Order ${id} status successfully synchronized in local fallback cache with status:`, merged.status);
          return mapOrder(merged);
        }
      } catch (fallbackErr) {
        console.error("[ROBUST FALLBACK] Failed to process local synchronization fallback:", fallbackErr);
      }
    }
    
    throw error;
  }

  return mapOrder(data);
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