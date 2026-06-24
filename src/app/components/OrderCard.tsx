import React from "react";
import { Clock, Flame, ShoppingBag, CheckCircle2, XCircle, Utensils, Package, ChefHat, RefreshCw } from "lucide-react";
import { rp } from "../data";
import { getOrderDuration } from "../api";
import { printService } from "../../utils/printService";
import type { Order, OrderStatus } from "../types";

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

export interface OrderCardProps {
  order: Order;
  tab?: "kitchen" | "bar" | "waiter" | "all";
  updating?: string | null;
  selectedBatchMenu?: string | null;
  setSelectedBatchMenu?: (menuName: string | null) => void;
  activeItemsSummary?: { name: string; totalQty: number; tables: { tableId: string; qty: number; orderId: string; }[] }[];
  handleCancel?: (order: Order) => void;
  handleStatusChange?: (order: Order, status: OrderStatus) => void;
  onClick?: (order: Order) => void;
}

export function OrderCard({
  order,
  tab = "kitchen",
  updating = null,
  selectedBatchMenu = null,
  setSelectedBatchMenu,
  activeItemsSummary = [],
  handleCancel,
  handleStatusChange,
  onClick,
}: OrderCardProps) {
  const cfg = statusConfig[order.status] || statusConfig.pending;
  const isNew = Date.now() - new Date(order.created_at).getTime() < 60000;
  
  const containsSelectedBatch = selectedBatchMenu 
    ? order.items.some(item => item.name === selectedBatchMenu && ((tab === "kitchen" && (item.category === "Makanan" || item.category === "Snack")) || (tab === "bar" && item.category === "Minuman")))
    : false;
      
  const isFocusMode = !!selectedBatchMenu;
  const cardHighlightClass = isFocusMode
    ? containsSelectedBatch
      ? "ring-2 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.02] border-amber-500 z-10 relative"
      : "opacity-40 grayscale-[15%] transition-all duration-300"
    : isNew 
      ? "ring-1 ring-yellow-500/30" 
      : "";

  function elapsed(created_at: string) {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000);
    return diff < 1 ? "baru saja" : `${diff} menit lalu`;
  }

  return (
    <div
      onClick={() => onClick && onClick(order)}
      className={`bg-card border rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${cfg.border} ${cardHighlightClass} ${onClick ? "cursor-pointer" : ""}`}
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
        }).map((item, i) => {
          const itemSummary = activeItemsSummary.find(s => s.name === item.name);
          const totalQtyActive = itemSummary ? itemSummary.totalQty : item.qty;
          const isMultiple = itemSummary ? itemSummary.tables.length > 1 : false;
          const isItemFocused = selectedBatchMenu === item.name;

          return (
            <div 
              key={i} 
              className={`flex items-center gap-2 p-1 rounded-lg transition-colors ${
                isItemFocused ? "bg-amber-500/10 text-amber-300 font-semibold" : ""
              }`}
            >
              <span className="w-6 h-6 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {item.qty}
              </span>
              <span className="text-foreground font-medium text-xs flex-1">{item.name}</span>
              
              {/* Badge Kumulatif jika menu dipesan di meja lain */}
              {isMultiple && (tab === "kitchen" || tab === "bar") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (setSelectedBatchMenu) {
                      setSelectedBatchMenu(isItemFocused ? null : item.name);
                    }
                  }}
                  className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                    isItemFocused
                      ? "bg-amber-500 border-amber-500 text-black hover:bg-amber-600 shadow-sm"
                      : "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
                  }`}
                  title={`Ada total ${totalQtyActive} porsi ${item.name} di antrean dapur. Klik untuk sorot.`}
                >
                  <Flame size={9} className={isItemFocused ? "animate-pulse" : ""} />
                  <span>Total {totalQtyActive}x</span>
                </button>
              )}
              
              <span className="text-xs text-muted-foreground">{rp(item.price * item.qty)}</span>
            </div>
          );
        })}
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
      {(handleCancel || handleStatusChange) && (
        <div className="px-4 pb-4 flex gap-2">
          {(tab === "kitchen" || tab === "bar") && order.status === "pending" && (
            <>
              {handleCancel && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCancel(order); }}
                  disabled={!!updating}
                  className="flex-none py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  Tolak
                </button>
              )}
              {handleStatusChange && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleStatusChange(order, "cooking"); }}
                  disabled={!!updating}
                  className="flex-1 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {updating === order.id ? <RefreshCw size={12} className="animate-spin" /> : tab === "kitchen" ? <Flame size={12} /> : <ShoppingBag size={12} />}
                  {tab === "kitchen" ? "Mulai Masak" : "Mulai Buat"}
                </button>
              )}
            </>
          )}
          {(tab === "kitchen" || tab === "bar") && order.status === "cooking" && handleStatusChange && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange(order, "ready"); }}
              disabled={!!updating}
              className="flex-1 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {updating === order.id ? <RefreshCw size={12} className="animate-spin" /> : <ShoppingBag size={12} />}
              {tab === "kitchen" ? "Selesai Masak — Siap Antar" : "Selesai Buat — Siap Antar"}
            </button>
          )}
          {tab === "waiter" && order.status === "ready" && handleStatusChange && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange(order, "served"); }}
              disabled={!!updating}
              className="flex-1 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {updating === order.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Sudah Disajikan ke Meja {order.tableId}
            </button>
          )}
          {(tab === "kitchen" || tab === "bar") && (order.status === "pending" || order.status === "cooking") && (
            <button
              onClick={(e) => { e.stopPropagation(); printService.printKitchen(order); }}
              className="flex-none py-2 px-3 rounded-lg bg-secondary border border-border text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors"
              title="Cetak Tiket Fisik"
            >
              <ChefHat size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
