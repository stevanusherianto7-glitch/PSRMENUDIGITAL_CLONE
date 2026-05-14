import { projectId, publicAnonKey } from "../../utils/supabase/info";
import type { Order, CartItem, OrderType, OrderMode } from "./types";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-203e170b`;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${publicAnonKey}`,
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res;
  } catch (e) {
    if (retries > 0) {
      console.warn(`Fetch failed, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2); // Exponential backoff
    }
    throw e;
  }
}

export async function fetchOrders(status?: string, tableId?: string): Promise<Order[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (tableId) params.set("tableId", tableId);
  try {
    const res = await fetchWithRetry(`${BASE}/orders?${params}`, { headers });
    const data = await res.json();
    return data.orders || [];
  } catch (e) {
    console.error("Failed to fetch orders after retries:", e);
    throw e;
  }
}

export async function createOrder(payload: {
  tableId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  notes?: string;
  orderMode: OrderMode;
  type: OrderType;
}): Promise<Order> {
  try {
    const res = await fetchWithRetry(`${BASE}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.order;
  } catch (e) {
    console.error("Failed to create order after retries:", e);
    throw e;
  }
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order> {
  try {
    const res = await fetchWithRetry(`${BASE}/orders/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    return data.order;
  } catch (e) {
    console.error(`Failed to update order ${id} after retries:`, e);
    throw e;
  }
}

export async function deleteOrder(id: string): Promise<void> {
  try {
    await fetchWithRetry(`${BASE}/orders/${id}`, { method: "DELETE", headers });
  } catch (e) {
    console.error(`Failed to delete order ${id} after retries:`, e);
    throw e;
  }
}

export async function clearDoneOrders(): Promise<void> {
  try {
    await fetchWithRetry(`${BASE}/orders`, { method: "DELETE", headers });
  } catch (e) {
    console.error("Failed to clear orders after retries:", e);
    throw e;
  }
}