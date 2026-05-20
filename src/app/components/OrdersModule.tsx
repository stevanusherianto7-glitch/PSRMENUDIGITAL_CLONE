import React, { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, ChefHat, Clock, Flame, ShoppingBag, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { rp } from "../data";
import type { Order, OrderStatus } from "../types";
import { printService } from "../../utils/printService";
import { getOrderDuration } from "../api";

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
    <div className="space-y-5 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Monitor Pesanan Realtime</h3>
          <p className="text-muted-foreground text-xs mt-0.5">{orders.length} total pesanan aktif</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-lg transition-all active:scale-95 bg-card shadow-sm">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Status filter — Uiverse-inspired premium cards */}
      <div className="flex flex-wrap justify-center gap-3">
        {(["all", "pending", "cooking", "ready", "served"] as const).map(s => {
          const isActive = filter === s;
          const label = s === "all" ? "Semua" : orderStatusConfig[s as OrderStatus].label;
          const icon = s === "all" ? <ShoppingBag size={18} /> : React.cloneElement(orderStatusConfig[s as OrderStatus].icon as React.ReactElement, { size: 18 });
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`order-filter-card flex flex-col items-center gap-2 min-w-[100px] flex-1 max-w-[140px] ${isActive ? "active" : ""}`}
            >
              <div className="card-icon">{icon}</div>
              <span className="card-label">{label}</span>
              <span className="card-count">{counts[s]}</span>
            </button>
          );
        })}
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
            const duration = getOrderDuration(order);
            const isOvertime = order.status !== "served" && order.status !== "cancelled" && duration >= 15;
            return (
              <div 
                key={order.id} 
                onClick={order.status === "served" && onNavigateToKasir ? () => onNavigateToKasir(order.id) : undefined}
                className={`bg-card border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg text-left w-full ${
                  isOvertime 
                    ? "border-red-500/50 ring-2 ring-red-500/20" 
                    : order.status === "pending" 
                      ? "border-yellow-500/30 ring-2 ring-yellow-400/25" 
                      : "border-border/60"
                } ${order.status === "served" ? "cursor-pointer ring-2 ring-transparent hover:ring-primary/50" : ""}`}
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
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-muted-foreground font-black font-mono bg-secondary px-1.5 py-0.5 rounded-lg">{new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                      {(() => {
                        if (order.status === "served") {
                          return (
                            <span className="text-[8px] bg-green-500/10 border border-green-500/20 text-green-400 font-black px-1.5 py-0.5 rounded-lg uppercase tracking-tighter">
                              Selesai {duration}m
                            </span>
                          );
                        } else if (order.status !== "cancelled") {
                          const badgeClass = isOvertime
                            ? "bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse font-extrabold"
                            : duration >= 10
                              ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-bold"
                              : "bg-primary/10 border border-primary/20 text-primary font-bold";
                          return (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-lg uppercase tracking-tighter ${badgeClass}`}>
                              Proses {duration}m
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <span className="text-green-500 font-black text-sm">{rp(order.total)}</span>
                  </div>
                  {order.status !== "served" && order.status !== "cancelled" && (
                    <div className="pt-3 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          printService.printKitchen(order);
                        }}
                        className="flex-1 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black rounded-xl hover:bg-orange-500/20 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                         <ChefHat size={12} /> CETAK ULANG DAPUR
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
