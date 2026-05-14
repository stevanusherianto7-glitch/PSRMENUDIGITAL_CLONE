import { projectId, publicAnonKey } from "/utils/supabase/info";
import type { Order, CartItem, OrderType, OrderMode } from "./types";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-203e170b`;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${publicAnonKey}`,
};

export async function fetchOrders(status?: string, tableId?: string): Promise<Order[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (tableId) params.set("tableId", tableId);
  const res = await fetch(`${BASE}/orders?${params}`, { headers });
  if (!res.ok) throw new Error(`Error fetching orders: ${res.statusText}`);
  const data = await res.json();
  return data.orders || [];
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
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Error creating order: ${res.statusText}`);
  const data = await res.json();
  return data.order;
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order> {
  const res = await fetch(`${BASE}/orders/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Error updating order: ${res.statusText}`);
  const data = await res.json();
  return data.order;
}

export async function deleteOrder(id: string): Promise<void> {
  const res = await fetch(`${BASE}/orders/${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`Error deleting order: ${res.statusText}`);
}

export async function clearDoneOrders(): Promise<void> {
  const res = await fetch(`${BASE}/orders`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`Error clearing orders: ${res.statusText}`);
}