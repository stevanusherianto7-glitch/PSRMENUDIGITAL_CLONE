import React, { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, ChefHat, Clock, Flame, ShoppingBag, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { rp } from "../data";
import type { Order, OrderStatus } from "../types";

const orderModeConfig = {
  "dine-in":   { label: "Dine In",   color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20" },
  "take-away": { label: "Take Away", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
} as const;

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
  onNavigateToKasir?: (orderId: string) => void;
}

export const OrdersModule = ({ orders, onRefresh, connected, onNavigateToKasir }: OrdersModuleProps) => {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

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
        <button onClick={onRefresh} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-lg transition-all active:scale-95 bg-card shadow-sm">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex justify-center gap-2 w-full max-w-lg">
          {(["all", "pending", "cooking"] as const).map(s => {
            const cfg = s === "all" ? { color: "text-foreground", bg: "bg-secondary", border: "border-border" } : orderStatusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black border transition-all duration-300 transform uppercase tracking-tighter ${filter === s
                    ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-md scale-[1.05]`
                    : "bg-card border-border text-muted-foreground hover:bg-secondary/50"
                  }`}
              >
                <div className="text-sm">{s === "all" ? <ShoppingBag size={14} /> : orderStatusConfig[s as OrderStatus].icon}</div>
                <div className="truncate w-full text-center">{s === "all" ? "Semua" : orderStatusConfig[s as OrderStatus].label}</div>
                {counts[s] > 0 && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${filter === s ? "bg-foreground/10" : "bg-secondary"}`}>{counts[s]}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex justify-center gap-2 w-full max-w-[66%] sm:max-w-xs">
          {(["ready", "served"] as const).map(s => {
            const cfg = orderStatusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black border transition-all duration-300 transform uppercase tracking-tighter ${filter === s
                    ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-md scale-[1.05]`
                    : "bg-card border-border text-muted-foreground hover:bg-secondary/50"
                  }`}
              >
                <div className="text-sm">{orderStatusConfig[s as OrderStatus].icon}</div>
                <div className="truncate w-full text-center">{orderStatusConfig[s as OrderStatus].label}</div>
                {counts[s] > 0 && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${filter === s ? "bg-foreground/10" : "bg-secondary"}`}>{counts[s]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 bg-card border border-border rounded-xl">
          <CheckCircle2 size={32} className="opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest">Tidak ada pesanan</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map(order => {
            const cfg = orderStatusConfig[order.status];
            return (
              <div 
                key={order.id} 
                onClick={order.status === "served" && onNavigateToKasir ? () => onNavigateToKasir(order.id) : undefined}
                className={`bg-card border border-border/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg text-left w-full ${order.status === "pending" ? "ring-2 ring-yellow-400/30" : ""} ${order.status === "served" ? "cursor-pointer ring-2 ring-transparent hover:ring-primary/50" : ""}`}
              >
                <div className={`flex items-center gap-2 px-3 py-2.5 ${cfg.bg} border-b ${cfg.border}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`relative flex items-center justify-center ${cfg.color} flex-shrink-0`}>
                      {order.status === "pending" && (
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"></span>
                      )}
                      <span className="relative">{cfg.icon}</span>
                    </span>
                    <span className={`text-[11px] font-black uppercase whitespace-nowrap ${cfg.color}`}>Meja {order.tableId}</span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg border uppercase tracking-tighter ${order.type === "guest" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : order.type === "waiter" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      }`}>
                      {order.type === "guest" ? "Scan" : order.type === "waiter" ? "Waiter" : "Kasir"}
                    </span>
                    {(() => {
                      const mode = (order.orderMode || "dine-in") as keyof typeof orderModeConfig;
                      const mcfg = orderModeConfig[mode] || orderModeConfig["dine-in"];
                      return <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg border uppercase tracking-tighter whitespace-nowrap ${mcfg.bg} ${mcfg.border} ${mcfg.color}`}>{mcfg.label}</span>;
                    })()}
                  </div>

                  <div className="ml-auto text-right min-w-0">
                    <p className="text-[9px] text-muted-foreground font-black font-mono truncate">{order.id}</p>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs items-center gap-4">
                      <span className="text-muted-foreground font-bold truncate">{item.name} <span className="text-foreground ml-1">×{item.qty}</span></span>
                      <span className="font-black flex-shrink-0">{rp(item.price * item.qty)}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/15">
                      <ChefHat size={12} className="text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Instruksi Khusus</p>
                        <p className="text-[11px] text-orange-300 font-bold leading-tight mt-0.5">{order.notes}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground font-black font-mono bg-secondary px-1.5 py-0.5 rounded-lg">{new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-green-500 font-black text-sm">{rp(order.total)}</span>
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
