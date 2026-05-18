import { useState } from "react";
import { Plus } from "lucide-react";
import { rp } from "../data";
import type { Promo } from "../types";

interface PromoModuleProps {
  promos: Promo[];
  onTogglePromo: (id: string) => void;
  onAddPromo: (promo: Promo) => void;
}

export function PromoModule({ promos, onTogglePromo, onAddPromo }: PromoModuleProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPromo, setNewPromo] = useState<Omit<Promo, "id" | "active">>({
    name: "",
    description: "",
    discount: 0,
    type: "percentage",
    code: "",
    min_order: 0,
    valid_until: ""
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Manajemen Promo</h3>
          <p className="text-muted-foreground text-xs mt-0.5">{promos.filter(p => p.active).length} promo aktif</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"><Plus size={14} /> Buat Promo</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {promos.map(promo => (
          <div key={promo.id} className={`bg-card border rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${promo.active ? "border-border" : "border-border opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-sm text-foreground">{promo.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${promo.active ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-secondary border-border text-muted-foreground"}`}>
                    {promo.active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{promo.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-lg text-primary font-['Poppins']">
                  {promo.type === "percentage" ? `${promo.discount}%` : rp(promo.discount)}
                </p>
                <p className="text-[10px] text-muted-foreground">{promo.type === "percentage" ? "diskon" : "potongan"}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div>
                {promo.code && (
                  <span className="text-xs font-mono bg-primary/5 border border-dashed border-primary/30 px-3 py-1 rounded-lg text-primary font-bold">{promo.code}</span>
                )}
                {promo.min_order && (
                  <p className="text-[10px] text-muted-foreground mt-1">Min. order {rp(promo.min_order)}</p>
                )}
                {promo.valid_until && (
                  <p className="text-[10px] text-muted-foreground">s/d {promo.valid_until}</p>
                )}
              </div>
              <button
                onClick={() => onTogglePromo(promo.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${promo.active ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"}`}
              >
                {promo.active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Buat Promo */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/ backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="font-bold text-lg font-['Poppins']">Buat Promo Baru</h3>
              <p className="text-xs text-muted-foreground mt-1">Tambahkan promo baru untuk pelanggan</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nama Promo</label>
                <input type="text" value={newPromo.name} onChange={e => setNewPromo({ ...newPromo, name: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200" placeholder="Misal: Promo Keluarga" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Deskripsi</label>
                <input type="text" value={newPromo.description} onChange={e => setNewPromo({ ...newPromo, description: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200" placeholder="Misal: Diskon untuk makan bersama keluarga" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promo-type" className="text-xs font-semibold text-muted-foreground">Tipe</label>
                  <select id="promo-type" value={newPromo.type} onChange={e => setNewPromo({ ...newPromo, type: e.target.value as "percentage" | "fixed" })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Diskon</label>
                  <input type="number" value={newPromo.discount} onChange={e => setNewPromo({ ...newPromo, discount: Number(e.target.value) })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200" placeholder="Misal: 10 atau 15000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Kode Promo (Opsional)</label>
                  <input type="text" value={newPromo.code} onChange={e => setNewPromo({ ...newPromo, code: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200" placeholder="Misal: KELUARGA" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Min. Order (Opsional)</label>
                  <input type="number" value={newPromo.min_order} onChange={e => setNewPromo({ ...newPromo, min_order: Number(e.target.value) })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200" placeholder="Misal: 100000" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Berlaku Sampai (Opsional)</label>
                <input type="text" value={newPromo.valid_until} onChange={e => setNewPromo({ ...newPromo, valid_until: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200" placeholder="Misal: 31 Des 2026" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground">Batal</button>
              <button 
                onClick={() => {
                  if (!newPromo.name || !newPromo.discount) return;
                  const promo: Promo = {
                    id: `PROMO-${Date.now().toString(36).toUpperCase()}`,
                    ...newPromo,
                    active: true
                  };
                  onAddPromo(promo);
                  setIsCreateModalOpen(false);
                  setNewPromo({ name: "", description: "", discount: 0, type: "percentage", code: "", min_order: 0, valid_until: "" });
                }}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-indigo-500"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
