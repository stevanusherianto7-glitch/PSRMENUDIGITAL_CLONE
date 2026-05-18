import { useState, useEffect } from "react";
import type { InventoryItem } from "../types";

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSave: (data: Omit<InventoryItem, "id">) => void;
}

export function InventoryItemModal({ isOpen, onClose, item, onSave }: InventoryItemModalProps) {
  const [formData, setFormData] = useState<Omit<InventoryItem, "id">>({
    name: "",
    category: "",
    qty: 0,
    unit: "",
    min_stock: 0,
    method: "FIFO",
    exp_date: "",
    stock: 0
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        qty: item.qty,
        unit: item.unit,
        min_stock: item.min_stock,
        method: item.method,
        exp_date: item.exp_date,
        stock: item.stock
      });
    } else {
      setFormData({
        name: "",
        category: "",
        qty: 0,
        unit: "",
        min_stock: 0,
        method: "FIFO",
        exp_date: "",
        stock: 0
      });
    }
  }, [item, isOpen]);

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.exp_date) return;
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/ backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <h3 className="font-bold text-lg font-['Poppins']">{item ? "Edit Bahan Baku" : "Tambah Bahan Baku"}</h3>
          <p className="text-xs text-muted-foreground mt-1">{item ? "Perbarui data bahan baku" : "Tambahkan bahan baku baru ke inventaris"}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nama Bahan</label>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: Ayam Broiler" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Kategori</label>
            <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: Daging / Sayur" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-stock" className="text-xs font-semibold text-muted-foreground">Stok Saat Ini</label>
              <input id="inv-stock" type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value), qty: Number(e.target.value) })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Satuan</label>
              <input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: kg / pcs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-min-stock" className="text-xs font-semibold text-muted-foreground">Minimal Stok</label>
              <input id="inv-min-stock" type="number" value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: Number(e.target.value) })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" />
            </div>
            <div>
              <label htmlFor="inv-method" className="text-xs font-semibold text-muted-foreground">Metode</label>
              <select id="inv-method" value={formData.method} onChange={e => setFormData({ ...formData, method: e.target.value as "FIFO" | "LIFO" })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="FIFO">FIFO</option>
                <option value="LIFO">LIFO</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="inv-exp-date" className="text-xs font-semibold text-muted-foreground">Tanggal Kadaluarsa</label>
            <input id="inv-exp-date" type="date" value={formData.exp_date} onChange={e => setFormData({ ...formData, exp_date: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground">Batal</button>
          <button onClick={handleSubmit} className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-indigo-500">Simpan</button>
        </div>
      </div>
    </div>
  );
}
