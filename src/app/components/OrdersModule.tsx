import React, { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, ChefHat, Clock, Flame, ShoppingBag, XCircle } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { rp } from "../data";
import type { Order, OrderStatus } from "../types";
import { orderModeConfig } from "../pages/AdminPage";

const orderStatusConfig: Record<OrderStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: { label: "Antrian", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: <Clock size={12} /> },
  cooking: { label: "Dimasak", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: <Flame size={12} /> },
  ready: { label: "Siap Antar", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: <ShoppingBag size={12} /> },
  served: { label: "Selesai", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: <CheckCircle2 size={12} /> },
  cancelled: { label: "Dibatal", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: <XCircle size={12} /> },
};

interface OrdersModuleProps {
  orders: Order[];
  onRefresh: () => void;
  connected: boolean;
}

export const OrdersModule = ({ orders, onRefresh, connected }: OrdersModuleProps) => {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Subscribe to real-time updates
  useEffect(() => {
    if (connected) {
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('Real-time change:', payload);
            // Refresh orders when any change occurs
            onRefresh();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [connected, onRefresh]);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const counts: Record<string, number> = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    cooking: orders.filter(o => o.status === "cooking").length,
    ready: orders.filter(o => o.status === "ready").length,
    served: orders.filter(o => o.status === "served").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Monitor Pesanan Realtime</h3>
          <p className="text-muted-foreground text-xs mt-0.5">{orders.length} total pesanan aktif</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-lg transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "cooking", "ready", "served"] as const).map(s => {
          const cfg = s === "all" ? { color: "text-foreground", bg: "bg-secondary", border: "border-border" } : orderStatusConfig[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === s ? `${cfg.bg} ${cfg.border} ${cfg.color}` : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s !== "all" && <span>{orderStatusConfig[s as OrderStatus].icon}</span>}
              {s === "all" ? "Semua" : orderStatusConfig[s as OrderStatus].label}
              {counts[s] > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === s ? "bg-foreground/10" : "bg-secondary"}`}>{counts[s]}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 bg-card border border-border rounded-xl">
          <CheckCircle2 size={32} className="opacity-20" />
          <p className="text-sm">Tidak ada pesanan</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map(order => {
            const cfg = orderStatusConfig[order.status];
            return (
              <div key={order.id} className={`bg-card border rounded-xl overflow-hidden ${cfg.border}`}>
                <div className={`flex items-center gap-2 px-4 py-3 ${cfg.bg} border-b ${cfg.border}`}>
                  <span className={cfg.color}>{cfg.icon}</span>
                  <span className={`text-sm font-bold ${cfg.color}`}>Meja {order.tableId}</span>
                  <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    order.type === "guest" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : order.type === "waiter" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  }`}>
                    {order.type === "guest" ? "Scan" : order.type === "waiter" ? "Waiter" : "Kasir"}
                  </span>
                  {(() => {
                    const mode = (order.orderMode || "dine-in") as keyof typeof orderModeConfig;
                    const mcfg = orderModeConfig[mode] || orderModeConfig["dine-in"];
                    return <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${mcfg.bg} ${mcfg.border} ${mcfg.color}`}>{mode === "dine-in" ? "🍽️" : "📦"} {mcfg.label}</span>;
                  })()}
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">{order.id}</span>
                </div>
                <div className="p-4 space-y-1.5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
                      <span className="font-semibold">{rp(item.price * item.qty)}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <div className="flex items-start gap-1.5 mt-1 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                      <ChefHat size={11} className="text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-semibold text-orange-400">Catatan Chef</p>
                        <p className="text-[11px] text-orange-300">{order.notes}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-green-400">{rp(order.total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
