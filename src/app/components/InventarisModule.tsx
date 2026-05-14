import { useState } from "react";
import {
  Plus, Search, Edit2, Trash2, XCircle, AlertTriangle, Clock, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { InventoryItemModal } from "./InventoryItemModal";
import type { InventoryItem } from "../types";

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
    <div className="space-y-5">
      {(expiredCount > 0 || criticalCount > 0) && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-red-400">Perhatian: </span>
            <span className="text-muted-foreground">
              {expiredCount > 0 && <span>{expiredCount} bahan <strong>kadaluarsa</strong>, </span>}
              {criticalCount > 0 && <span>{criticalCount} bahan <strong>kritis (≤2 hari)</strong></span>}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-4 gap-3 flex-1 mr-4">
          {[
            { val: expiredCount, label: "Kadaluarsa", color: "text-red-400", border: "border-red-500/20" },
            { val: criticalCount, label: "Kritis (≤2h)", color: "text-orange-400", border: "border-orange-500/20" },
            { val: warningCount, label: "Perlu Perhatian", color: "text-yellow-400", border: "border-yellow-500/20" },
            { val: inventory.length, label: "Total Item", color: "text-foreground", border: "border-border" },
          ].map(m => (
            <div key={m.label} className={`bg-card border ${m.border} rounded-xl p-4`}>
              <p className={`text-xl font-bold ${m.color} font-['Poppins']`}>{m.val}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-colors h-fit"><Plus size={14} /> Tambah Bahan</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari bahan baku..." className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary/50 transition-colors" />
        </div>
        {(["all", "critical", "warning"] as const).map(f => (
          <button key={f} onClick={() => setFilterState(f)} className={`px-3 py-2.5 rounded-lg text-xs border transition-colors ${filter === f ? "bg-primary border-primary text-white" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "Semua" : f === "critical" ? "Kritis" : "Perhatian"}
          </button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {["Nama Bahan", "Kategori", "Stok", "Metode", "Tgl Exp.", "Status", "Aksi"].map(h => (
                <th key={h} className={`text-left text-muted-foreground p-4 font-medium ${h === "Stok" ? "text-right" : ""} ${h === "Aksi" ? "text-center" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const exp = getExpiryStatus(item.exp_date);
              const lowStock = item.stock < item.min_stock;
              return (
                <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-semibold text-foreground">{item.name}</td>
                  <td className="p-4 text-muted-foreground">{item.category}</td>
                  <td className="p-4 text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`font-mono font-semibold cursor-pointer ${lowStock ? "text-red-400" : "text-foreground"}`}>{item.stock} {item.unit}</span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover text-popover-foreground border border-border p-3 shadow-xl max-w-xs">
                          <div className="space-y-2">
                            <p className="font-semibold text-xs text-primary">Riwayat Belanja</p>
                            {logs && logs.filter((l: any) => l.inventory_id === item.id && l.type === 'in').length > 0 ? (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {logs
                                  .filter((l: any) => l.inventory_id === item.id && l.type === 'in')
                                  .map((log: any) => (
                                    <div key={log.id} className="flex justify-between gap-4 text-[10px]">
                                      <span className="text-muted-foreground">{format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}</span>
                                      <span className="font-bold text-emerald-400">+{log.quantity} {item.unit}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">Belum ada riwayat belanja</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {lowStock && <span className="ml-2 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">Stok Rendah</span>}
                  </td>
                  <td className="p-4"><span className="text-[10px] font-mono bg-secondary border border-border px-2 py-0.5 rounded">{item.method}</span></td>
                  <td className="p-4 font-mono text-muted-foreground">{item.exp_date}</td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-[11px] font-semibold border ${exp.bg} ${exp.color}`}>{exp.icon} {exp.label}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openModal(item)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Edit2 size={12} /></button>
                      <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Hapus"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
