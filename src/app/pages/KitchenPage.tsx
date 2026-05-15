import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, Clock, Flame, LogOut, RefreshCw, UtensilsCrossed, CheckCircle2, ShoppingBag, Database, Bell } from "lucide-react";
import { fetchOrders, updateOrder } from "../api";
import { rp } from "../data";
import type { Order, OrderStatus } from "../types";

// Menggunakan string path untuk logo agar tidak error di Vite
const logoImg = "/imports/logo_kedai_Elvera57.png";

type KitchenFilter = "pending" | "cooking" | "ready";

const statusConfig: Record<KitchenFilter, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: { label: "Menunggu", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: <Clock size={14} /> },
  cooking: { label: "Dimasak", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: <Flame size={14} /> },
  ready: { label: "Siap Saji", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: <UtensilsCrossed size={14} /> },
};

const orderModeConfig = {
  "dine-in": { label: "Dine In", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", icon: <Clock size={11} /> },
  "take-away": { label: "Take Away", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: <Clock size={11} /> },
};

function formatTime(iso: string) {
  if (!iso) return "Invalid Date";
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function timeSince(iso: string) {
  if (!iso) return "NaN jam NaN menit";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "baru saja";
  if (diff < 60) return `${diff} menit lalu`;
  return `${Math.floor(diff / 60)} jam ${diff % 60} menit`;
}

export default function KitchenPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<KitchenFilter>("pending");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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
        .sort((a, b) => new Date(a.created_at || a.createdAt).getTime() - new Date(b.created_at || b.createdAt).getTime()),
    [orders, filter],
  );

  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === "pending").length,
      cooking: orders.filter((o) => o.status === "cooking").length,
      ready: orders.filter((o) => o.status === "ready").length,
    }),
    [orders],
  );

  const advanceStatus = async (order: Order) => {
    const next: Record<string, string> = {
      pending: "cooking",
      cooking: "ready",
    };
    const target = next[order.status];
    if (!target) return;
    setUpdating(order.id);
    try {
      const updated = await updateOrder(order.id, { status: target as Order["status"] });
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      console.error("Failed to update order", err);
    } finally {
      setUpdating(null);
    }
  };

  const revertStatus = async (order: Order) => {
    const prev: Record<string, string> = {
      cooking: "pending",
      ready: "cooking",
    };
    const target = prev[order.status];
    if (!target) return;
    setUpdating(order.id);
    try {
      const updated = await updateOrder(order.id, { status: target as Order["status"] });
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      console.error("Failed to revert order", err);
    } finally {
      setUpdating(null);
    }
  };

  const handleCancel = async (order: Order) => {
    if (!confirm(`Batalkan pesanan ${order.id}?`)) return;
    setUpdating(order.id);
    try {
      await updateOrder(order.id, { status: "cancelled" });
      setOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (e) {
      console.log("Error cancelling:", e);
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("kitchen_auth");
    navigate("/");
  };

  const filters: KitchenFilter[] = ["pending", "cooking", "ready"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0 sticky top-0 z-30">
        <img src={logoImg} alt="Kedai Elvera 57" className="w-8 h-8 rounded-lg object-cover" />
        <div className="flex-1">
          <p className="font-bold text-sm text-foreground font-poppins">
            Layar Dapur · Kedai Elvera 57
          </p>
          <p className="text-xs text-muted-foreground">Dapur</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="text-muted-foreground hover:text-foreground transition-colors p-2"
            aria-label="Segarkan pesanan"
          >
            <RefreshCw size={15} />
          </button>
          
          <label className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border bg-secondary border-border text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-primary w-3 h-3"
            />
            <span className="hidden sm:inline">Auto</span>
          </label>

          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-red-400 transition-colors p-2 flex items-center gap-1.5 text-xs font-semibold"
            aria-label="Logout"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card/50 sticky top-14 z-20">
        {filters.map((f) => {
          const cfg = statusConfig[f];
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                active ? `border-primary ${cfg.color}` : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {cfg.icon}
              {cfg.label}
              {counts[f] > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  {counts[f]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                <div className="h-10 bg-secondary border-b border-border"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-secondary rounded w-1/4"></div>
                  <div className="h-3 bg-secondary rounded w-3/4"></div>
                  <div className="h-3 bg-secondary rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <CheckCircle2 size={40} className="opacity-20" />
            <p className="text-sm font-semibold">
              Tidak ada pesanan {statusConfig[filter].label}
            </p>
            <p className="text-xs">Pesanan baru akan muncul otomatis</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${filtered.length >= 2 ? "lg:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {filtered.map((order) => {
              const cfg = statusConfig[filter];
              const createdAtStr = order.created_at || order.createdAt;
              const isNew = createdAtStr && (Date.now() - new Date(createdAtStr).getTime() < 60000);
              return (
                <div
                  key={order.id}
                  className={`bg-card border rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    cfg.border
                  } ${isNew ? "ring-1 ring-yellow-500/30" : ""}`}
                >
                  {/* Order header */}
                  <div className={`flex items-center gap-2 px-4 py-3 ${cfg.bg} border-b ${cfg.border}`}>
                    <span className={`relative flex items-center justify-center ${cfg.color}`}>
                      {isNew && (
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"></span>
                      )}
                      <span className="relative">{cfg.icon}</span>
                    </span>
                    <span className={`text-sm font-bold ${cfg.color}`}>Meja {order.tableId}</span>
                    {isNew && (
                      <span className="ml-1 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/20 animate-pulse">
                        BARU
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} /> {timeSince(createdAtStr)}
                      </span>
                    </div>
                  </div>

                  {/* Type badge + ID */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        order.type === "guest"
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : order.type === "waiter"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      }`}>
                        {order.type === "guest" ? "Scan Mandiri" : order.type === "waiter" ? "Via Waiter" : "Kasir"}
                      </span>
                      {/* Dine-in / Take-away badge */}
                      {(() => {
                        const mode = (order.orderMode || "dine-in") as keyof typeof orderModeConfig;
                        const mcfg = orderModeConfig[mode] || orderModeConfig["dine-in"];
                        return (
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${mcfg.bg} ${mcfg.border} ${mcfg.color}`}>
                            {mcfg.icon} {mcfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{order.id}</span>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3 space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {item.qty}
                        </span>
                        <span className="text-foreground font-medium text-xs flex-1">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{rp(item.price * item.qty)}</span>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="flex items-start gap-1.5 mt-2 p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <ChefHat size={12} className="text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-semibold text-orange-400 mb-0.5">Catatan Chef</p>
                          <p className="text-[11px] text-orange-300">{order.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="px-4 pb-3 border-t border-border pt-2.5 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{order.items.reduce((s, i) => s + i.qty, 0)} item</span>
                    <span className="font-bold text-sm text-green-400">{rp(order.total)}</span>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4">
                    {filter === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancel(order)}
                          disabled={!!updating}
                          className="flex-none py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => advanceStatus(order)}
                          disabled={!!updating}
                          className="flex-1 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {updating === order.id ? <RefreshCw size={12} className="animate-spin" /> : <Flame size={12} />}
                          Mulai Masak
                        </button>
                      </div>
                    )}
                    {filter === "cooking" && (
                      <button
                        onClick={() => advanceStatus(order)}
                        disabled={!!updating}
                        className="w-full py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {updating === order.id ? <RefreshCw size={12} className="animate-spin" /> : <UtensilsCrossed size={12} />}
                        Selesai Masak — Siap Antar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Status bar */}
      <div className="border-t border-border bg-card/50 px-4 py-2.5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live — update tiap 5 detik
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={10} /> {counts.pending} menunggu
        </span>
        <span className="flex items-center gap-1.5">
          <Flame size={10} /> {counts.cooking} dimasak
        </span>
        <span className="flex items-center gap-1.5">
          <UtensilsCrossed size={10} /> {counts.ready} siap saji
        </span>
      </div>
    </div>
  );
}