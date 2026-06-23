import { useState, useMemo } from "react";
import { X, Search, ShoppingBag, Plus } from "lucide-react";
import { rp, menuCategories } from "../data";
import type { MenuItem } from "../types";

interface TambahItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onAddItem: (item: MenuItem) => void;
}

export function TambahItemModal({ isOpen, onClose, menuItems, onAddItem }: TambahItemModalProps) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Semua");

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = cat === "Semua" || item.category === cat;
      return matchSearch && matchCat;
    });
  }, [menuItems, search, cat]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#F5EFE6] p-6 pb-5 relative shrink-0 flex items-start gap-4 border-b border-[#EADDCF]/50">
          <div className="p-3 bg-white border border-[#EADDCF] rounded-2xl shrink-0">
            <ShoppingBag size={20} className="text-[#D9774B]" />
          </div>
          <div className="pt-1">
            <h3 className="font-bold text-[13px] text-[#5D4A41] uppercase tracking-[0.15em] leading-tight pr-8">Menu Tambahan</h3>
            <p className="text-[9px] text-[#D9774B] font-bold uppercase tracking-widest mt-1">Pilih item untuk ditambahkan ke tagihan</p>
          </div>
          <button onClick={onClose} className="absolute top-6 right-6 text-[#A67C52] hover:text-[#5D4A41] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 border-b border-[#EADDCF] shrink-0 bg-white">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A67C52]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari menu (ex: Kerupuk)..."
                className="w-full bg-white border border-[#EADDCF] rounded-2xl pl-10 pr-4 py-3 text-[11px] font-bold text-[#5D4A41] focus:outline-none focus:border-[#D9774B] transition-all placeholder:text-[#A67C52]/50 placeholder:font-normal"
              />
            </div>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="bg-white border border-[#EADDCF] rounded-2xl px-4 py-3 text-[11px] font-bold text-[#5D4A41] focus:outline-none focus:border-[#D9774B] transition-all cursor-pointer w-[110px] shrink-0"
            >
              {menuCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#FDF8F5]">
          {filteredItems.length === 0 ? (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-[#A67C52] opacity-60">
              <ShoppingBag size={32} className="mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Menu Tidak Ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white border border-[#EADDCF] rounded-[1.5rem] p-3 flex items-center gap-4 hover:border-[#D9774B]/50 transition-colors shadow-sm">
                  <div className="w-14 h-14 rounded-[1rem] overflow-hidden shrink-0 border border-[#EADDCF] bg-[#F5EFE6]">
                    <img src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&q=80"} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[#5D4A41] line-clamp-1">{item.name}</p>
                    <p className="text-[10px] font-bold text-[#D9774B] mt-1">{rp(item.price)}</p>
                  </div>
                  <button 
                    onClick={() => onAddItem(item)}
                    className="w-10 h-10 flex items-center justify-center bg-[#F5EFE6] text-[#D9774B] hover:bg-[#D9774B] hover:text-white rounded-xl transition-all shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
