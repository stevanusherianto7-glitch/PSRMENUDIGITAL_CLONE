import { useState } from "react";
import {
  Plus, Search, Edit2, Trash2, XCircle, AlertTriangle, Clock, CheckCircle2,
  Download, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { InventoryItemModal } from "./InventoryItemModal";
import type { InventoryItem } from "../types";
import { exportInventoryPDF } from "../../utils/exportUtils";

interface InventarisModuleProps {
  inventory: InventoryItem[];
  logs: any[];
  onAdd: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export function getExpiryStatus(expDate: string) {
  const exp = new Date(expDate); const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  if (diff <= 0) return { label: "Kadaluarsa", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: <XCircle size={12} /> };
  if (diff <= 2) return { label: `${diff}h lagi`, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: <AlertTriangle size={12} /> };
  if (diff <= 7) return { label: `${diff}h lagi`, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: <Clock size={12} /> };
  return { label: `${diff}h lagi`, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: <CheckCircle2 size={12} /> };
}

export function InventarisModule({ inventory, logs, onAdd, onUpdate, onDelete }: InventarisModuleProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilterState] = useState<"all" | "critical" | "warning">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const openModal = (item?: InventoryItem) => {
    setEditingItem(item || null);
    setIsModalOpen(true);
  };

  const handleSave = (data: Omit<InventoryItem, "id">) => {
    if (editingItem) {
      onUpdate({ ...editingItem, ...data });
    } else {
      onAdd({
        id: `INV-${Date.now().toString(36).toUpperCase()}`,
        ...data,
        qty: data.stock
      });
    }
  };

  const getStatus = (item: InventoryItem) => {
    const exp = new Date(item.exp_date); const now = new Date(); now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
    if (diff <= 0) return "expired"; if (diff <= 2) return "critical"; if (diff <= 7) return "warning"; return "ok";
  };

  const filtered = inventory.filter(item => {
    const s = getStatus(item);
    if (filter === "critical" && s !== "critical" && s !== "expired") return false;
    if (filter === "warning" && s !== "warning") return false;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  const expiredCount = inventory.filter(i => getStatus(i) === "expired").length;
  const criticalCount = inventory.filter(i => getStatus(i) === "critical").length;
  const warningCount = inventory.filter(i => getStatus(i) === "warning").length;

  return (
    <div className="space-y-4">
      {/* Ramped down Alert Banner */}
      {(expiredCount > 0 || criticalCount > 0) && (
        <div className="bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">
            {expiredCount > 0 && <span>{expiredCount} EXPIRED</span>}
            {expiredCount > 0 && criticalCount > 0 && <span className="mx-1 opacity-30">|</span>}
            {criticalCount > 0 && <span>{criticalCount} KRITIS (≤2h)</span>}
          </p>
        </div>
      )}
      
      {/* Slim Mini-Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { val: expiredCount, label: "Kadaluarsa", color: "text-red-500", bg: "bg-red-500/5" },
          { val: criticalCount, label: "Kritis", color: "text-orange-500", bg: "bg-orange-500/5" },
          { val: warningCount, label: "Perhatian", color: "text-yellow-500", bg: "bg-yellow-500/5" },
          { val: inventory.length, label: "Total", color: "text-foreground", bg: "bg-secondary/30" },
        ].map(m => (
          <div key={m.label} className={`border border-border/60 rounded-xl p-2.5 flex items-center gap-3 ${m.bg}`}>
            <span className={`text-lg font-black ${m.color} font-['Poppins'] leading-none`}>{m.val}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 leading-tight">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Action Row: Search, Filter, and Add Button merged */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari bahan..." className="w-full bg-card border border-border/60 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:border-primary/40 transition-all shadow-sm" />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 bg-secondary/50 border border-border/60 rounded-xl p-1 shadow-inner">
            {(["all", "critical", "warning"] as const).map(f => (
              <button key={f} onClick={() => setFilterState(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${filter === f ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {f === "all" ? "Semua" : f === "critical" ? "Kritis" : "Alert"}
              </button>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-2 bg-secondary/50 border border-border/60 rounded-xl px-3 py-1 shadow-inner">
            <Calendar size={14} className="text-muted-foreground" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-[10px] font-bold outline-none text-foreground w-28"
              title="Tanggal Mulai"
            />
            <span className="text-muted-foreground text-[10px]">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-[10px] font-bold outline-none text-foreground w-28"
              title="Tanggal Selesai"
            />
          </div>
          <button 
            onClick={() => exportInventoryPDF(filtered, startDate, endDate)}
            className="flex items-center gap-2 bg-secondary border border-border/60 text-foreground px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary/80 transition-all shadow-sm whitespace-nowrap"
          >
            <Download size={14} /> PDF
          </button>
          <button onClick={() => openModal()} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"><Plus size={14} /> Tambah</button>
        </div>
      </div>

      {/* Mobile-First Card List (Responsive) */}
      <div className="grid grid-cols-1 gap-3 sm:hidden pb-10">
        {filtered.map(item => {
          const exp = getExpiryStatus(item.exp_date);
          const lowStock = item.stock < item.min_stock;
          return (
            <div key={item.id} className="bg-card border border-border/60 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-primary/20 transition-all shadow-sm active:scale-[0.98]">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground leading-none mb-1">{item.category}</p>
                  <h4 className="font-black text-sm text-foreground leading-tight truncate">{item.name}</h4>
                </div>
                <div className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${exp.bg} ${exp.color}`}>
                  {exp.label}
                </div>
              </div>

              <div className="flex items-end justify-between border-t border-border/40 pt-3">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sisa Stok</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-black font-['Poppins'] ${lowStock ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]" : "text-foreground"}`}>
                      {item.stock}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">{item.unit}</span>
                  </div>
                  {lowStock && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Stok Rendah</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2 py-1 border border-border/40">
                    <Edit2 size={12} className="text-muted-foreground" onClick={() => openModal(item)} />
                    <div className="w-[1px] h-3 bg-border/60" />
                    <Trash2 size={12} className="text-red-400" onClick={() => onDelete(item.id)} />
                  </div>
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Exp: {item.exp_date}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View Card Grid (hidden on mobile) */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
        {filtered.map(item => {
          const exp = getExpiryStatus(item.exp_date);
          const lowStock = item.stock < item.min_stock;
          return (
            <div key={item.id} className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-primary/20 transition-all shadow-sm hover:shadow-md">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground leading-none mb-1">{item.category}</p>
                    <h4 className="font-black text-sm text-foreground leading-tight truncate" title={item.name}>{item.name}</h4>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50 mt-0.5">{item.id}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${exp.bg} ${exp.color} flex items-center gap-1`}>
                    {exp.icon} {exp.label}
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sisa Stok</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black font-poppins ${lowStock ? "text-red-500" : "text-foreground"}`}>
                      {item.stock}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">{item.unit}</span>
                  </div>
                  {lowStock && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Stok Rendah</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border/40 pt-3 flex items-center justify-between">
                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  Exp: {item.exp_date}
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openModal(item)} 
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    onClick={() => onDelete(item.id)} 
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label="Hapus"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <InventoryItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={editingItem}
        onSave={handleSave}
      />
    </div>
  );
}
