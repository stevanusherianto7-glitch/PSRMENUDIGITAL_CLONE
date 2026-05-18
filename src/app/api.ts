/**
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI SELURUH OPERASI CRUD ORDER & TRANSAKSI LANGSUNG KE SUPABASE.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN PESANAN TIDAK MASUK ATAU DATA HILANG. ⚠️
 *
 * v2.1 — Direct Supabase (Robust Edition: Automatic Retry, Offline Queue, Camel/Snake Mapping)
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

// ─── DATA TRANSFORMERS (CAMEL/SNAKE MAPPING) ─────────────────────────────────

/**
 * Maps frontend schema to database schema.
 * Handles migration from camelCase to snake_case transparently.
 */
export function toDatabaseOrder(order: Partial<Order>): any {
  if (!order) return null;
  const { tableId, orderMode, ...rest } = order;
  return {
    ...rest,
    // Strictly use snake_case for Supabase schema
    table_id: tableId,
    order_mode: orderMode,
  };
}

/**
 * Maps raw database payload to standardized frontend type.
 */
export function toFrontendOrder(dbData: any): Order {
  if (!dbData) return null as any;
  const { table_id, tableId, order_mode, orderMode, ...rest } = dbData;
  return {
    ...rest,
    tableId: tableId || table_id || "",
    orderMode: orderMode || order_mode || "dine-in",
  } as Order;
}

// ─── CONNECTION RETRY & OFFLINE QUEUE UTILS ─────────────────────────────────

const OFFLINE_QUEUE_KEY = "PSRM_OFFLINE_ORDERS";

export interface OfflineAction {
  id: string;
  type: "create" | "update";
  payload: any;
  timestamp: number;
}

/**
 * Executes a Supabase query/operation with exponential backoff and jitter.
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      if (attempt >= retries || (typeof navigator !== "undefined" && !navigator.onLine)) {
        throw error;
      }
      // Exponential Backoff: delay * 2^attempt + Jitter (random variance up to 30%)
      const backoffDelay = delay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * backoffDelay;
      const finalDelay = backoffDelay + jitter;
      console.warn(
        `[API Connection] Attempt ${attempt} failed. Retrying in ${Math.round(
          finalDelay
        )}ms... Error: ${error.message || error}`
      );
      await new Promise((res) => setTimeout(res, finalDelay));
    }
  }
  throw new Error("Max retries reached");
}

export function getOfflineQueue(): OfflineAction[] {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to read offline queue:", e);
    return [];
  }
}

export function saveToOfflineQueue(action: Omit<OfflineAction, "id" | "timestamp">) {
  try {
    const queue = getOfflineQueue();
    const newAction: OfflineAction = {
      ...action,
      id: `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      timestamp: Date.now(),
    };
    queue.push(newAction);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log("[Offline Queue] Saved action locally:", newAction);
  } catch (e) {
    console.error("Failed to write to offline queue:", e);
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/**
 * Triggers background synchronization of offline-queued orders.
 */
export async function syncOfflineOrders(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`[Offline Sync] Found ${queue.length} pending actions. Synchronizing...`);

  // Copy and clear the queue first to prevent parallel race conditions
  clearOfflineQueue();

  const failedSyncs: OfflineAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === "create") {
        await createOrder(action.payload, true); // skipQueue = true
        console.log(`[Offline Sync] Created order from queue:`, action.payload.id);
      } else if (action.type === "update") {
        await updateOrder(action.payload.id, action.payload.patch, true); // skipQueue = true
        console.log(`[Offline Sync] Updated order from queue:`, action.payload.id);
      }
    } catch (e: any) {
      console.error(`[Offline Sync] Sync failed for item:`, e.message || e);
      failedSyncs.push(action);
    }
  }

  // Restore failed sync actions back to the queue
  if (failedSyncs.length > 0) {
    try {
      const currentQueue = getOfflineQueue();
      const mergedQueue = [...failedSyncs, ...currentQueue];
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(mergedQueue));
      console.warn(`[Offline Sync] ${failedSyncs.length} actions failed and returned to queue.`);
    } catch (e) {
      console.error("Failed to restore failed sync actions:", e);
    }
  } else {
    console.log("[Offline Sync] Synchronized all actions successfully.");
  }
}

// Auto-register online sync event listener in browser contexts
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("[Network] Connection recovered. Initiating background sync...");
    syncOfflineOrders().catch((err) => console.error("Auto-sync failed:", err));
  });
}

// ─── ORDER ID GENERATOR ─────────────────────────────────────────────────────
function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

// ─── ORDERS CRUD ─────────────────────────────────────────────────────────────

/**
 * Fetch orders, optionally filter by status and/or tableId.
 */
export async function fetchOrders(status?: string, tableId?: string): Promise<Order[]> {
  try {
    return await executeWithRetry(async () => {
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
      if (error) throw error;
      return (data || []).map(toFrontendOrder);
    });
  } catch (error: any) {
    console.error("fetchOrders error:", error.message || error);
    
    // Fallback: Read local create actions from offline queue so user sees their own unsynced orders
    const queue = getOfflineQueue();
    const localOrders = queue
      .filter((q) => q.type === "create")
      .map((q) => q.payload as Order);
    
    if (localOrders.length > 0) {
      console.info("[Offline Fallback] Blending offline orders into fetch results.");
      return localOrders;
    }
    throw error;
  }
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

  try {
    return await executeWithRetry(async () => {
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (status) {
        query = query.eq("status", status);
      }

      // Bypass browser cache for GET requests
      query = query.neq("id", `dummy-${Date.now()}`);

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        data: (data || []).map(toFrontendOrder),
        total: count || 0,
        page,
        limit,
      };
    });
  } catch (error: any) {
    console.error("fetchPaginatedOrders error:", error.message || error);
    throw error;
  }
}

/**
 * Create a new order.
 */
export async function createOrder(
  payload: {
    tableId: string;
    items: CartItem[];
    subtotal: number;
    total: number;
    notes?: string;
    orderMode: OrderMode;
    type: OrderType;
  },
  skipQueue = false
): Promise<Order> {
  const order: Order = {
    id: generateOrderId(),
    tableId: payload.tableId,
    items: payload.items.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      qty: c.qty,
      category: c.category,
      notes: c.notes || "",
      image: c.image || "",
      available: c.available ?? true,
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

  try {
    return await executeWithRetry(async () => {
      const dbPayload = toDatabaseOrder(order);
      const { data, error } = await supabase
        .from("orders")
        .insert(dbPayload)
        .select()
        .single();

      if (error) throw error;
      return toFrontendOrder(data);
    });
  } catch (error: any) {
    console.error("createOrder error:", error.message || error);
    
    if (!skipQueue) {
      console.warn("[Offline Queue] Storing order locally due to network failure.");
      saveToOfflineQueue({
        type: "create",
        payload: order,
      });
      // Return order to front-end immediately so UI renders in pending state
      return order;
    }
    throw error;
  }
}

/**
 * Update an existing order (e.g., change status).
 */
export async function updateOrder(
  id: string,
  patch: Partial<Order>,
  skipQueue = false
): Promise<Order> {
  const { id: _, created_at: __, ...safePatch } = patch as any;
  const dbPatch = toDatabaseOrder(safePatch);

  try {
    return await executeWithRetry(async () => {
      const { data, error } = await supabase
        .from("orders")
        .update({
          ...dbPatch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return toFrontendOrder(data);
    });
  } catch (error: any) {
    console.error(`updateOrder(${id}) error:`, error.message || error);
    
    if (!skipQueue) {
      console.warn(`[Offline Queue] Failed to update order ${id}. Storing action locally.`);
      saveToOfflineQueue({
        type: "update",
        payload: { id, patch },
      });
      return {
        id,
        ...patch,
        updated_at: new Date().toISOString(),
      } as unknown as Order;
    }
    throw error;
  }
}

/**
 * Delete an order by ID.
 */
export async function deleteOrder(id: string): Promise<void> {
  try {
    await executeWithRetry(async () => {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    });
  } catch (error: any) {
    console.error(`deleteOrder(${id}) error:`, error.message || error);
    throw error;
  }
}

// ─── TRANSACTIONS CRUD ───────────────────────────────────────────────────────

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

  try {
    return await executeWithRetry(async () => {
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
      if (error) throw error;

      return {
        data: (data as Transaction[]) || [],
        total: count || 0,
        page,
        limit,
      };
    });
  } catch (error: any) {
    console.error("fetchTransactions error:", error.message || error);
    throw error;
  }
}

/**
 * Create a new transaction in Supabase with automatic retry protection.
 */
export async function createTransaction(tx: Transaction): Promise<Transaction> {
  try {
    return await executeWithRetry(async () => {
      // 1. Simpan ke tabel transactions (utama)
      const { error: txError } = await supabase.from("transactions").insert({
        id: tx.id,
        table_id: tx.table_id || null,
        items: tx.items,
        subtotal: tx.subtotal,
        discount: tx.discount || null,
        discount_amount: tx.discount_amount || 0,
        tax: tx.tax,
        total: tx.total,
        method: tx.method,
        created_at: tx.created_at
      });

      if (txError) throw txError;

      // 2. Simpan ke tabel transaction_items (untuk real-time reporting)
      const itemRows = tx.items.map(item => ({
        transaction_id: tx.id,
        menu_item_id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        total: item.price * item.qty,
        created_at: tx.created_at
      }));

      const { error: itemsError } = await supabase.from("transaction_items").insert(itemRows);
      if (itemsError) throw itemsError;

      return tx;
    });
  } catch (error: any) {
    console.error(`createTransaction(${tx.id}) error:`, error.message || error);
    throw error;
  }
}


// ─── CENTRALIZED REAL-TIME OBSERVER ──────────────────────────────────────────

// ─── CENTRALIZED REAL-TIME OBSERVER (SINGLETON PATTERN) ──────────────────────────────────────────

// Singleton instance to prevent multiple subscriptions
let ordersRealtimeChannel: any = null;
let ordersRealtimeUnsubscribe: (() => void) | null = null;

/**
 * Centralized Real-time Subscription Observer for the orders table.
 * Handles dynamic event binding, format translation, and auto-cleanup.
 * Uses singleton pattern to prevent duplicate subscriptions.
 *
 * @returns A function to unsubscribe/close the channel.
 */
export function subscribeToOrders(
  onEvent: (event: "INSERT" | "UPDATE" | "DELETE", record: Order) => void
): () => void {
  console.log("[Supabase Realtime] Establishing subscription channel for orders...");

  // If channel already exists, unsubscribe first to prevent duplicates
  if (ordersRealtimeUnsubscribe) {
    console.log("[Supabase Realtime] Unsubscribing existing channel before creating new one...");
    ordersRealtimeUnsubscribe();
    ordersRealtimeChannel = null;
    ordersRealtimeUnsubscribe = null;
  }

  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(`orders-realtime-observer-${uniqueId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      (payload) => {
        const eventType = payload.eventType;
        const newRecord = payload.new;
        const oldRecord = payload.old;

        console.log(`[Supabase Realtime] Received event: ${eventType}`, payload);

        if (eventType === "INSERT") {
          onEvent("INSERT", toFrontendOrder(newRecord));
        } else if (eventType === "UPDATE") {
          onEvent("UPDATE", toFrontendOrder(newRecord));
        } else if (eventType === "DELETE") {
          // Deleted record only returns ID, so we build a stub order representation
          onEvent("DELETE", { id: (oldRecord as any)?.id || (payload as any).old?.id || 0 } as Order);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Supabase Realtime] Channel status: ${status}`);
    });

  // Store the unsubscribe function
  ordersRealtimeUnsubscribe = () => {
    console.log("[Supabase Realtime] Unsubscribing and removing orders channel...");
    supabase.removeChannel(channel);
    ordersRealtimeChannel = null;
    ordersRealtimeUnsubscribe = null;
  };

  return ordersRealtimeUnsubscribe;
}