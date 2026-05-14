import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCent, ChefHat, Clock, Flame, LogOut, RefreshCw, UtensilsCrossed } from "lucide-react";
import { fetchOrders, updateOrder } from "../api";
import type { Order } from "../types";

type KitchenFilter = "pending" | "in-progress" | "ready";

const statusColors: Record<KitchenFilter, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  "in-progress": "bg-blue-100 text-blue-800 border-blue-300",
  ready: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const statusDot: Record<KitchenFilter, string> = {
  pending: "bg-amber-500",
  "in-progress": "bg-blue-500",
  ready: "bg-emerald-500",
};

const statusLabel: Record<KitchenFilter, string> = {
  pending: "Menunggu",
  "in-progress": "Dimasak",
  ready: "Siap Saji",
};

const statusIcon: Record<KitchenFilter, typeof Clock> = {
  pending: Clock,
  "in-progress": Flame,
  ready: UtensilsCrossed,
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function timeSince(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "Baru saja";
  if (diff < 60) return `${diff} menit lalu`;
  return `${Math.floor(diff / 60)} jam ${diff % 60} menit`;
}

export default function KitchenPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<KitchenFilter>("pending");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!autoRefresh) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load, autoRefresh]);

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => o.status === filter)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders, filter],
  );

  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === "pending").length,
      "in-progress": orders.filter((o) => o.status === "in-progress").length,
      ready: orders.filter((o) => o.status === "ready").length,
    }),
    [orders],
  );

  const advanceStatus = async (order: Order) => {
    const next: Record<string, string> = {
      pending: "in-progress",
      "in-progress": "ready",
    };
    const target = next[order.status];
    if (!target) return;
    try {
      const updated = await updateOrder(order.id, { status: target as Order["status"] });
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      console.error("Failed to update order", err);
    }
  };

  const revertStatus = async (order: Order) => {
    const prev: Record<string, string> = {
      "in-progress": "pending",
      ready: "in-progress",
    };
    const target = prev[order.status];
    if (!target) return;
    try {
      const updated = await updateOrder(order.id, { status: target as Order["status"] });
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      console.error("Failed to revert order", err);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("kitchen_auth");
    navigate("/login");
  };

  const filters: KitchenFilter[] = ["pending", "in-progress", "ready"];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <ChefHat className="w-7 h-7 text-orange-600" />
            <h1 className="text-xl font-bold text-gray-800">Layar Dapur</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-orange-600 w-4 h-4"
              />
              Auto
            </label>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="sticky top-[57px] z-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex gap-1 px-4 py-2">
          {filters.map((f) => {
            const Icon = statusIcon[f];
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? `${statusColors[f]} border shadow-sm`
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {statusLabel[f]}
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    active ? "bg-white/60" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="text-sm">Memuat pesanan...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <BadgeCent className="w-12 h-12" />
            <p className="text-lg font-medium">Tidak ada pesanan</p>
            <p className="text-sm">
              Pesanan dengan status &ldquo;{statusLabel[filter]}&rdquo; akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAdvance={advanceStatus}
                onRevert={revertStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OrderCard({
  order,
  onAdvance,
  onRevert,
}: {
  order: Order;
  onAdvance: (o: Order) => void;
  onRevert: (o: Order) => void;
}) {
  const status = order.status as KitchenFilter;
  return (
    <div
      className={`rounded-xl border-2 p-4 flex flex-col gap-3 shadow-sm transition-all hover:shadow-md ${
        statusColors[status] ?? "bg-white border-gray-200"
      }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${statusDot[status] ?? "bg-gray-400"}`} />
          <span className="font-bold text-gray-800">Meja {order.tableId}</span>
        </div>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(order.createdAt)}
        </span>
      </div>

      {/* Items */}
      <div className="bg-white/60 rounded-lg p-3 space-y-1.5 flex-1">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.qty}× {item.name}
            </span>
          </div>
        ))}
        {order.notes && (
          <p className="text-xs text-orange-700 mt-2 italic border-t border-orange-200 pt-2">
            Catatan: {order.notes}
          </p>
        )}
      </div>

      {/* Time since */}
      <p className="text-xs text-gray-500">{timeSince(order.createdAt)}</p>

      {/* Actions */}
      <div className="flex gap-2">
        {order.status !== "ready" && (
          <button
            onClick={() => onAdvance(order)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
          >
            {order.status === "pending" ? (
              <>
                <Flame className="w-4 h-4" /> Masak
              </>
            ) : (
              <>
                <UtensilsCrossed className="w-4 h-4" /> Siap Saji
              </>
            )}
          </button>
        )}
        {order.status !== "pending" && (
          <button
            onClick={() => onRevert(order)}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-white/70 hover:bg-white text-gray-600 border border-gray-300 transition-colors"
          >
            Kembali
          </button>
        )}
      </div>
    </div>
  );
}