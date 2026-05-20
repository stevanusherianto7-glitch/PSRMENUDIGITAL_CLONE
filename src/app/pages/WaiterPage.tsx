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
  AlertTriangle, Volume2, VolumeX, Utensils, Package, Trash2, Key
} from "lucide-react";

// Menggunakan string path untuk logo agar tidak error di Vite
import { rp, BRAND_NAME, APP_LOGO as logoImg } from "../data";
import { fetchOrders, updateOrder, deleteOrder, getOrderDuration } from "../api";
import { supabase } from "../../lib/supabase";
import { useTTS, preloadVoices } from "../hooks/useTTS";
import { printService } from "../../utils/printService";
import type { Order, OrderStatus, UserSession } from "../types";
import { ErrorBoundary } from "../components/ErrorBoundary";

type Tab = "kitchen" | "bar" | "waiter";

export function getDailyVerificationPIN() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  const seed = (y * 10000) + (m * 100) + d;
  const x = Math.sin(seed) * 10000;
  const pin = Math.floor((x - Math.floor(x)) * 9000) + 1000;
  return pin.toString();
}

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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ─── TTS — panggil setiap kali 'orders' berubah ───────────────────────────
  const { speak } = useTTS(orders, ttsEnabled, !loading);

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
      // Filter: hanya order HARI INI & belum selesai/dibatalkan.
      // Order lebih dari 4 jam dianggap basi dan dilewati.
      const now = Date.now();
      const timeWindow = now - (24 * 60 * 60 * 1000); // 24 jam
      const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 jam

      const active = all.filter(o => {
        if (o.status === "served" || o.status === "cancelled") return false;
        const dateStr = o.created_at || "";
        const createdAt = new Date(dateStr.includes('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`).getTime();
        // Harus dalam window 24 jam DAN belum lewat 4 jam
        return createdAt >= timeWindow && (now - createdAt) < MAX_AGE_MS;
      });
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
    // 1. Optimistic UI update: remove or update the order in local state immediately
    setOrders(prev => {
      if (newStatus === "served" || newStatus === "cancelled") {
        return prev.filter(o => o.id !== order.id);
      }
      return prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o);
    });

    setUpdating(order.id);
    try {
      // 2. Perform backend database update
      const patch: Partial<Order> = { status: newStatus };
      if (newStatus === "served") {
        patch.served_at = new Date().toISOString();
      }
      const updated = await updateOrder(order.id, patch);
      
      // 3. Sync the final updated order object if it is still in the active list
      if (newStatus !== "served" && newStatus !== "cancelled") {
        setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
      }
      
      // TTS notifications
      if (newStatus === "ready" && ttsEnabled) {
        speak(`Pesanan meja ${order.tableId} siap untuk diantarkan.`);
      }
      if (newStatus === "served" && ttsEnabled) {
        speak(`Pesanan meja ${order.tableId} sudah disajikan. Terima kasih.`);
      }
    } catch (e) {
      console.log("Error updating order, reverting optimistic update:", e);
      // Graceful rollback: reload all active orders from backend
      loadOrders();
    } finally {
      setUpdating(null);
    }
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

  async function handleResetAll() {
    setResetting(true);
    try {
      // Hapus langsung dari Supabase DB agar tidak muncul lagi saat polling
      const ids = orders.map(o => o.id);
      const { error } = await supabase
        .from("orders")
        .delete()
        .in("id", ids);
      
      if (error) {
        console.error("Supabase delete error:", error);
        // Fallback: coba satu per satu via API
        for (const o of orders) {
          await deleteOrder(o.id).catch(() => {});
        }
      }
      setOrders([]);
      setShowResetConfirm(false);
      if (ttsEnabled) speak("Semua pesanan telah direset.");
    } catch (e) {
      console.error("Reset error:", e);
    }
    setResetting(false);
  }

  const kitchenOrders = orders.filter(o => (o.status === "pending" || o.status === "cooking") && o.items.some(i => i.category === "Makanan" || i.category === "Snack"));
  const barOrders = orders.filter(o => (o.status === "pending" || o.status === "cooking") && o.items.some(i => i.category === "Minuman"));
  const waiterOrders = orders.filter(o => o.status === "ready");
  const displayOrders = tab === "kitchen" ? kitchenOrders : tab === "bar" ? barOrders : waiterOrders;

  function elapsed(created_at: string) {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000);
    return diff < 1 ? "baru saja" : `${diff} menit lalu`;
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Fixed Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
        <img src={logoImg} alt={BRAND_NAME} className="w-8 h-8 rounded-lg object-cover" />
        <div className="flex-1">
          <p className="font-bold text-sm text-foreground font-poppins">
            {session.role === "kitchen" ? "Dapur" : session.role === "waiter" ? "Pelayan" : "Manager/Owner"} · {BRAND_NAME}
          </p>
          <p className="text-xs text-muted-foreground">{session.name}</p>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono font-bold text-[10px] uppercase tracking-wider" title="Berikan PIN ini kepada tamu jika mereka tidak dapat melakukan validasi GPS otomatis">
          <Key size={11} className="animate-pulse" />
          <span className="text-[8px] uppercase font-black tracking-widest mr-0.5 text-slate-400 hidden xs:inline">PIN:</span>
          <span>{getDailyVerificationPIN()}</span>
        </div>

        {/* TTS Toggle */}
        <button
          onClick={() => setTtsEnabled(v => !v)}
          title={ttsEnabled ? "Matikan suara notifikasi" : "Aktifkan suara notifikasi"}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${ttsEnabled
              ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
              : "bg-secondary border-border text-muted-foreground hover:text-foreground"
            }`}
        >
          {ttsEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          <span className="hidden sm:inline">{ttsEnabled ? "Suara On" : "Suara Off"}</span>
        </button>

        <button onClick={loadOrders} className="text-muted-foreground hover:text-foreground transition-colors p-2" aria-label="Segarkan pesanan">
          <RefreshCw size={15} />
        </button>
        {orders.length > 0 && (
          <>
            <div className="relative">
              <Bell size={15} className="text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {orders.length}
              </span>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              title="Reset semua pesanan"
              className="text-muted-foreground hover:text-red-400 transition-colors p-2"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
        <button onClick={logout} className="text-muted-foreground hover:text-red-400 transition-colors p-2" aria-label="Logout">
          <LogOut size={15} />
        </button>
      </header>

      {/* TTS info banner — tampil hanya sekali saat pertama */}
      {ttsEnabled && (
        <div className="sticky top-14 z-40 bg-green-500/5 border-b border-green-500/10 px-4 py-2 flex items-center gap-2 text-xs text-green-400">
          <Volume2 size={11} />
          <span>Notifikasi suara aktif — sistem akan membacakan pesanan baru otomatis</span>
        </div>
      )}

      {/* Tabs */}
      <div className={`sticky ${ttsEnabled ? "top-[88px]" : "top-14"} z-40 flex border-b border-border bg-card/90 backdrop-blur-sm`}>
        {[
          { id: "kitchen", label: "Dapur", icon: ChefHat, count: kitchenOrders.length, color: "text-orange-400" },
          { id: "bar", label: "Bar", icon: ShoppingBag, count: barOrders.length, color: "text-indigo-400" },
          { id: "waiter", label: "Siap Antar", icon: Bike, count: waiterOrders.length, color: "text-blue-400" },
        ].filter(t => {
          if (session?.role === "manager" || session?.role === "owner") return true;
          if (session?.role === "kitchen") return t.id === "kitchen" || t.id === "bar";
          if (session?.role === "waiter") return t.id === "waiter";
          return false;
        }).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-all ${tab === t.id ? `border-primary ${t.color}` : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon size={16} />
              {t.label}
              {t.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab === t.id ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <main className="flex-1 p-4 overflow-y-auto pb-16">
        <ErrorBoundary>
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
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <CheckCircle2 size={40} className="opacity-20" />
            <p className="text-sm font-semibold">
              {tab === "kitchen" ? "Tidak ada pesanan masuk" : "Tidak ada pesanan siap antar"}
            </p>
            <p className="text-xs">Pesanan baru akan muncul dan dibacakan otomatis</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${displayOrders.length >= 2 ? "lg:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {displayOrders.map(order => {
              const cfg = statusConfig[order.status];
              const isNew = Date.now() - new Date(order.created_at).getTime() < 60000;
              return (
                <div
                  key={order.id}
                  className={`bg-card border rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${cfg.border} ${isNew ? "ring-1 ring-yellow-500/30" : ""
                    }`}
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
                      {(() => {
                        const duration = getOrderDuration(order);
                        const isOvertime = duration >= 15;
                        const durationColor = isOvertime
                          ? "text-red-400 font-extrabold animate-pulse"
                          : duration >= 10
                            ? "text-yellow-400 font-bold"
                            : "text-green-400 font-semibold";
                        return (
                          <span className={`text-xs flex items-center gap-1.5 ${durationColor}`}>
                            <Clock size={11} className={isOvertime ? "text-red-400 animate-spin" : ""} />
                            <span>{duration} mnt</span>
                            <span className="text-[10px] text-muted-foreground">({elapsed(order.created_at)})</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Type badge + ID */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${order.type === "guest"
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
                    {order.items.filter(item => {
                      if (tab === "kitchen") return item.category === "Makanan" || item.category === "Snack";
                      if (tab === "bar") return item.category === "Minuman";
                      return true;
                    }).map((item, i) => (
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
                  <div className="px-4 pb-4 flex gap-2">
                    {(tab === "kitchen" || tab === "bar") && order.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleCancel(order)}
                          disabled={!!updating}
                          className="flex-none py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => handleStatusChange(order, "cooking")}
                          disabled={!!updating}
                          className="flex-1 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {updating === order.id ? <RefreshCw size={12} className="animate-spin" /> : tab === "kitchen" ? <Flame size={12} /> : <ShoppingBag size={12} />}
                          {tab === "kitchen" ? "Mulai Masak" : "Mulai Buat"}
                        </button>
                      </>
                    )}
                    {(tab === "kitchen" || tab === "bar") && order.status === "cooking" && (
                      <button
                        onClick={() => handleStatusChange(order, "ready")}
                        disabled={!!updating}
                        className="flex-1 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {updating === order.id ? <RefreshCw size={12} className="animate-spin" /> : <ShoppingBag size={12} />}
                        {tab === "kitchen" ? "Selesai Masak — Siap Antar" : "Selesai Buat — Siap Antar"}
                      </button>
                    )}
                    {tab === "waiter" && order.status === "ready" && (
                      <button
                        onClick={() => handleStatusChange(order, "served")}
                        disabled={!!updating}
                        className="flex-1 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {updating === order.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Sudah Disajikan ke Meja {order.tableId}
                      </button>
                    )}
                    {(tab === "kitchen" || tab === "bar") && (order.status === "pending" || order.status === "cooking") && (
                      <button
                        onClick={() => printService.printKitchen(order)}
                        className="flex-none py-2 px-3 rounded-lg bg-secondary border border-border text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors"
                        title="Cetak Tiket Fisik"
                      >
                        <ChefHat size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </ErrorBoundary>
      </main>

      {/* Fixed Status bar */}
      <div className="sticky bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-sm px-4 py-2.5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live — update tiap 5 detik
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={10} /> {kitchenOrders.length} di dapur
        </span>
        <span className="flex items-center gap-1.5">
          <Bike size={10} /> {waiterOrders.length} siap antar
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {ttsEnabled ? <Volume2 size={10} className="text-green-400" /> : <VolumeX size={10} />}
          {ttsEnabled ? "TTS aktif" : "TTS mati"}
        </span>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/ backdrop-blur-sm p-4" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border text-center">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h3 className="font-bold text-base text-foreground">Reset Semua Pesanan?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ini akan menghapus <span className="font-bold text-red-400">{orders.length} pesanan</span> aktif dari sistem.
              </p>
            </div>
            <div className="px-6 py-3 bg-red-500/5 border-b border-border">
              <p className="text-[11px] text-red-400 font-semibold text-center">
                ⚠️ Tindakan ini tidak dapat dibatalkan. Gunakan hanya jika pesanan basi/nyangkut.
              </p>
            </div>
            <div className="px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleResetAll}
                disabled={resetting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resetting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {resetting ? "Mereset..." : "Ya, Reset Semua"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
