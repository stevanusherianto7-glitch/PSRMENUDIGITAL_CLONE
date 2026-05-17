/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI MODUL DAPUR/WAITER/BAR DENGAN TTS REALTIME DAN STATUS ORDER MANAGEMENT.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN PESANAN TIDAK TERPROSES ATAU TTS MATI. ⚠️
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChefHat, Clock, CheckCircle2, XCircle,
  RefreshCw, LogOut, Bell, Flame, Bike, ShoppingBag,
  AlertTriangle, Volume2, VolumeX, Utensils, Package
} from "lucide-react";

// Menggunakan string path untuk logo agar tidak error di Vite
import { rp, BRAND_NAME, APP_LOGO as logoImg } from "../data";
import { fetchOrders, updateOrder } from "../api";
import { useTTS, preloadVoices } from "../hooks/useTTS";
import type { Order, OrderStatus, UserSession } from "../types";

type Tab = "kitchen" | "bar" | "waiter";

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: { label: "Antrian", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: <Clock size={14} /> },
  cooking: { label: "Dimasak", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: <Flame size={14} /> },
  ready: { label: "Siap Antar", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: <ShoppingBag size={14} /> },
  served: { label: "Selesai", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: <CheckCircle2 size={14} /> },
  cancelled: { label: "Dibatal", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: <XCircle size={14} /> },
};

const orderModeConfig = {
  "dine-in": { label: "Dine In", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", icon: <Utensils size={11} /> },
  "take-away": { label: "Take Away", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: <Package size={11} /> },
};

export default function WaiterPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("kitchen");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // ─── TTS — panggil setiap kali 'orders' berubah ───────────────────────────
  const { speak } = useTTS(orders, ttsEnabled);

  useEffect(() => {
    try {
      const s = localStorage.getItem("pawon_session");
      if (!s) { navigate("/"); return; }
      const parsed = JSON.parse(s) as UserSession;
      setSession(parsed);
      
      // Redirect manager/owner to admin page
      if (parsed.role === "manager" || parsed.role === "owner") {
        navigate("/admin");
        return;
      }

      // Set tab based on role for other users
      if (parsed.role === "waiter") {
        setTab("waiter");
      }

      preloadVoices();
    } catch (e) {
      console.error("Failed to parse session from localStorage", e);
      localStorage.removeItem("pawon_session");
      navigate("/");
    }
  }, [navigate]);

  const loadOrders = useCallback(async () => {
    try {
      const all = await fetchOrders();
      const active = all.filter(o => o.status !== "served" && o.status !== "cancelled");
      setOrders(active);
    } catch (e) {
      console.log("Error loading orders:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  async function handleStatusChange(order: Order, newStatus: OrderStatus) {
    setUpdating(order.id);
    try {
      const updated = await updateOrder(order.id, { status: newStatus });
      setOrders(prev => {
        if (newStatus === "served" || newStatus === "cancelled") {
          return prev.filter(o => o.id !== order.id);
        }
        return prev.map(o => o.id === order.id ? updated : o);
      });
      // TTS notifikasi saat pesanan siap antar
      if (newStatus === "ready" && ttsEnabled) {
        speak(`Pesanan meja ${order.tableId} siap untuk diantarkan.`);
      }
      if (newStatus === "served" && ttsEnabled) {
        speak(`Pesanan meja ${order.tableId} sudah disajikan. Terima kasih.`);
      }
    } catch (e) {
      console.log("Error updating order:", e);
    }
    setUpdating(null);
  }

  async function handleCancel(order: Order) {
    if (!confirm(`Batalkan pesanan ${order.id}?`)) return;
    setUpdating(order.id);
    try {
      await updateOrder(order.id, { status: "cancelled" });
      setOrders(prev => prev.filter(o => o.id !== order.id));
      if (ttsEnabled) speak(`Pesanan meja ${order.tableId} telah dibatalkan.`);
    } catch (e) {
      console.log("Error cancelling:", e);
    }
    setUpdating(null);
  }

  function logout() {
    localStorage.removeItem("pawon_session");
    navigate("/");
  }

  const kitchenOrders = orders.filter(o => (o.status === "pending" || o.status === "cooking") && o.items.some(i => i.category === "Makanan" || i.category === "Snack"));
  const barOrders = orders.filter(o => (o.status === "pending" || o.status === "cooking") && o.items.some(i => i.category === "Minuman"));
  const waiterOrders = orders.filter(o => o.status === "ready");
  const displayOrders = tab === "kitchen" ? kitchenOrders : tab === "bar" ? barOrders : waiterOrders;

  function elapsed(created_at: string) {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000);
    return diff < 1 ? "baru saja" : `${diff} mnt`;
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 flex flex-col font-poppins selection:bg-primary/30">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center px-6 gap-4 z-50 flex-shrink-0">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <img src={logoImg} alt={BRAND_NAME} className="relative w-10 h-10 rounded-xl object-cover ring-1 ring-white/10" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-black text-lg tracking-tight text-white truncate leading-none">
            {session.role === "kitchen" ? "KITCHEN PRO" : session.role === "waiter" ? "SERVICE HUB" : "OPERATIONS"}
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {session.name} @ {BRAND_NAME}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* TTS Toggle */}
          <button
            onClick={() => setTtsEnabled(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${ttsEnabled
                ? "bg-primary/10 border-primary/30 text-primary glow-primary"
                : "bg-white/5 border-white/10 text-slate-500"
              }`}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
              Voice {ttsEnabled ? "Active" : "Muted"}
            </span>
          </button>

          <button onClick={loadOrders} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin text-primary" : "text-slate-400"} />
          </button>

          <button onClick={logout} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Tabs - Advanced Modern Look */}
      <div className="px-6 py-4 bg-black/20 z-40">
        <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md max-w-2xl mx-auto">
          {[
            { id: "kitchen", label: "DAPUR", icon: ChefHat, count: kitchenOrders.length, color: "from-orange-500 to-red-500" },
            { id: "bar", label: "BAR", icon: ShoppingBag, count: barOrders.length, color: "from-blue-500 to-indigo-600" },
            { id: "waiter", label: "DELIVERY", icon: Bike, count: waiterOrders.length, color: "from-emerald-500 to-teal-600" },
          ].filter(t => {
            if (session?.role === "manager" || session?.role === "owner") return true;
            if (session?.role === "kitchen") return t.id === "kitchen" || t.id === "bar";
            if (session?.role === "waiter") return t.id === "waiter";
            return false;
          }).map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as Tab)}
                className={`flex-1 relative flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-500 ${isActive ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                {isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${t.color} rounded-xl shadow-lg opacity-90 animate-in zoom-in duration-300`}></div>
                )}
                <Icon size={18} className="relative z-10" />
                <span className="relative z-10 text-[10px] font-black tracking-[0.1em] uppercase hidden sm:inline">{t.label}</span>
                {t.count > 0 && (
                  <span className={`relative z-10 w-5 h-5 flex items-center justify-center rounded-md text-[9px] font-black ${isActive ? "bg-white/20" : "bg-white/5"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 p-6 overflow-y-auto z-10 custom-scrollbar">
        {loading && orders.length === 0 ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 glass-card rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Utensils size={40} className="opacity-20" />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight uppercase">Antrean Kosong</h3>
            <p className="text-sm mt-2 font-medium opacity-60">Sistem akan memberitahu saat pesanan baru masuk</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 items-start">
            {displayOrders.map(order => {
              const cfg = statusConfig[order.status];
              const isNew = Date.now() - new Date(order.created_at).getTime() < 60000;
              return (
                <div
                  key={order.id}
                  className={`glass-card rounded-3xl overflow-hidden group transition-all duration-500 hover:translate-y-[-4px] hover:glow-primary border-white/5 ${isNew ? "ring-2 ring-primary/40" : ""}`}
                >
                  {/* Card Header */}
                  <div className={`px-6 py-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-br ${isNew ? "from-primary/10 to-transparent" : "from-white/5 to-transparent"}`}>
                    <div className="flex flex-col">
                      <span className="text-[28px] font-black text-white leading-none tracking-tighter">
                        MEJA {order.tableId}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`w-2 h-2 rounded-full ${isNew ? "bg-primary animate-ping" : "bg-slate-600"}`} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{elapsed(order.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <div className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${
                        order.type === "guest" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                        order.type === "waiter" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      }`}>
                        {order.type === "guest" ? "GUEST SCAN" : order.type === "waiter" ? "WAITER POS" : "CASHIER"}
                      </div>
                      <span className="text-[9px] font-mono text-slate-600 font-bold">{order.id}</span>
                    </div>
                  </div>

                  {/* Mode Badge */}
                  <div className="px-6 py-3 flex items-center gap-2">
                    {(() => {
                      const mode = (order.orderMode || "dine-in") as keyof typeof orderModeConfig;
                      const mcfg = orderModeConfig[mode] || orderModeConfig["dine-in"];
                      return (
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${mcfg.bg} ${mcfg.border} ${mcfg.color}`}>
                          {mode === "dine-in" ? <Utensils size={10} /> : <Package size={10} />}
                          {mcfg.label}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Items List */}
                  <div className="px-6 py-4 space-y-3">
                    {order.items.filter(item => {
                      if (tab === "kitchen") return item.category === "Makanan" || item.category === "Snack";
                      if (tab === "bar") return item.category === "Minuman";
                      return true;
                    }).map((item, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
                          {item.qty}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm font-bold text-white leading-tight uppercase tracking-tight line-clamp-2">
                            {item.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">{rp(item.price * item.qty)}</p>
                        </div>
                      </div>
                    ))}

                    {order.notes && (
                      <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                          <ChefHat size={32} />
                        </div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1.5">Note Pelanggan:</p>
                        <p className="text-[11px] text-orange-200/80 font-bold leading-relaxed">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-6 pt-2 space-y-3">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grand Total</span>
                      <span className="text-lg font-black text-green-400 font-['Poppins']">{rp(order.total)}</span>
                    </div>

                    <div className="flex gap-3">
                      {(tab === "kitchen" || tab === "bar") && order.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleCancel(order)}
                            className="w-14 h-12 flex items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                          >
                            <XCircle size={20} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(order, "cooking")}
                            disabled={!!updating}
                            className="flex-1 h-12 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                          >
                            {updating === order.id ? <RefreshCw size={18} className="animate-spin" /> : <Flame size={18} />}
                            Mulai Proses
                          </button>
                        </>
                      )}

                      {(tab === "kitchen" || tab === "bar") && order.status === "cooking" && (
                        <button
                          onClick={() => handleStatusChange(order, "ready")}
                          disabled={!!updating}
                          className="flex-1 h-12 rounded-2xl bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                          {updating === order.id ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                          Selesai & Antarkan
                        </button>
                      )}

                      {tab === "waiter" && order.status === "ready" && (
                        <button
                          onClick={() => handleStatusChange(order, "served")}
                          disabled={!!updating}
                          className="flex-1 h-12 rounded-2xl bg-green-500 text-white text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                        >
                          {updating === order.id ? <RefreshCw size={18} className="animate-spin" /> : <Utensils size={18} />}
                          Sajikan ke Meja
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modern Status Footer */}
      <footer className="h-20 border-t border-white/5 bg-black/60 backdrop-blur-xl px-6 flex items-center gap-6 overflow-x-auto no-scrollbar z-50 pb-safe">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Live</span>
        </div>

        <div className="flex items-center gap-4 border-l border-white/10 pl-6">
          <div className="flex items-center gap-2">
            <ChefHat size={14} className="text-orange-500" />
            <span className="text-[10px] font-bold text-white">{kitchenOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingBag size={14} className="text-blue-500" />
            <span className="text-[10px] font-bold text-white">{barOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Bike size={14} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-white">{waiterOrders.length}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
          <span>{new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>
      </footer>
    </div>
  );
}
