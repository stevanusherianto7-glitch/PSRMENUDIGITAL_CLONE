import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check
app.get("/make-server-203e170b/health", (c) => {
  return c.json({ status: "ok" });
});

// ─── ORDERS API ────────────────────────────────────────────────────────────────

// GET /orders - Get all orders, optionally filter by status or tableId
app.get("/make-server-203e170b/orders", async (c) => {
  try {
    const status = c.req.query("status");
    const tableId = c.req.query("tableId");
    const orders = await kv.getByPrefix("order:");
    let filtered = orders.filter((o: any) => o !== null);
    if (status) {
      filtered = filtered.filter((o: any) => o.status === status);
    }
    if (tableId) {
      filtered = filtered.filter((o: any) => o.tableId === tableId);
    }
    // Sort by created_at desc
    filtered.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return c.json({ orders: filtered });
  } catch (err) {
    console.log("Error fetching orders:", err);
    return c.json({ error: `Failed to fetch orders: ${err}` }, 500);
  }
});

// POST /orders - Create new order
app.post("/make-server-203e170b/orders", async (c) => {
  try {
    const body = await c.req.json();
    const id = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const order = {
      id,
      tableId: body.tableId,
      items: body.items || [],
      subtotal: body.subtotal || 0,
      total: body.total || 0,
      notes: body.notes || "",
      orderMode: body.orderMode || "dine-in",   // "dine-in" | "take-away"
      status: "pending",
      type: body.type || "guest", // "guest" | "waiter" | "kasir"
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await kv.set(`order:${id}`, order);
    return c.json({ order }, 201);
  } catch (err) {
    console.log("Error creating order:", err);
    return c.json({ error: `Failed to create order: ${err}` }, 500);
  }
});

// PUT /orders/:id - Update order (e.g., change status)
app.put("/make-server-203e170b/orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`order:${id}`);
    if (!existing) {
      return c.json({ error: "Order not found" }, 404);
    }
    const updated = {
      ...existing,
      ...body,
      id, // ensure id doesn't change
      updated_at: new Date().toISOString(),
    };
    await kv.set(`order:${id}`, updated);
    return c.json({ order: updated });
  } catch (err) {
    console.log("Error updating order:", err);
    return c.json({ error: `Failed to update order: ${err}` }, 500);
  }
});

// DELETE /orders/:id - Delete/archive order
app.delete("/make-server-203e170b/orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`order:${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error deleting order:", err);
    return c.json({ error: `Failed to delete order: ${err}` }, 500);
  }
});

// DELETE /orders - Clear all served/cancelled orders
app.delete("/make-server-203e170b/orders", async (c) => {
  try {
    const orders = await kv.getByPrefix("order:");
    const toDelete = orders.filter(
      (o: any) => o && (o.status === "served" || o.status === "cancelled")
    );
    for (const o of toDelete) {
      await kv.del(`order:${o.id}`);
    }
    return c.json({ deleted: toDelete.length });
  } catch (err) {
    console.log("Error clearing orders:", err);
    return c.json({ error: `Failed to clear orders: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);