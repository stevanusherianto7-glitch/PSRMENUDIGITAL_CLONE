import { useState, useEffect } from "react";
import { X, CheckCircle2, Minus, Plus } from "lucide-react";
import { rp } from "../data";
import type { CartItem } from "../types";

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalCart: CartItem[];
  onApply: (splitCart: CartItem[]) => void;
}

export function SplitBillModal({ isOpen, onClose, originalCart, onApply }: SplitBillModalProps) {
  const [splitItems, setSplitItems] = useState<CartItem[]>([]);

  // Initialize split items when modal opens
  useEffect(() => {
    if (isOpen) {
      setSplitItems(originalCart.map(item => ({ ...item, qty: 0 })));
    }
  }, [isOpen, originalCart]);

  if (!isOpen) return null;

  const updateQty = (id: string, delta: number) => {
    setSplitItems(prev => prev.map(item => {
      if (item.id === id) {
        const orig = originalCart.find(o => o.id === id);
        const maxQty = orig ? orig.qty : 0;
        const newQty = Math.max(0, Math.min(maxQty, item.qty + delta));
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const selectAll = () => {
    setSplitItems(originalCart.map(item => ({ ...item })));
  };

  const totalSelected = splitItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleApply = () => {
    const selected = splitItems.filter(item => item.qty > 0);
    onApply(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#F5EFE6] p-6 pb-5 relative shrink-0 border-b border-[#EADDCF]/50">
          <button onClick={onClose} className="absolute top-6 right-6 text-[#A67C52] hover:text-[#5D4A41] transition-colors">
            <X size={20} />
          </button>
          <h3 className="font-serif font-bold text-[13px] text-[#5D4A41] uppercase tracking-[0.15em] leading-tight pr-8">Pilih Menu Split Bill</h3>
          <p className="text-[9px] text-[#D9774B] font-bold uppercase tracking-widest mt-1.5">Pilih item yang akan dibayar sekarang</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex justify-end mb-3">
            <button onClick={selectAll} className="text-[9px] font-bold text-[#D9774B] uppercase tracking-widest hover:text-[#C56539] transition-colors">
              PILIH SEMUA
            </button>
          </div>
          
          <div className="space-y-3 pb-2">
            {splitItems.map(item => {
              const orig = originalCart.find(o => o.id === item.id);
              const origQty = orig ? orig.qty : 0;
              return (
                <div key={item.id} className="border border-[#D9774B]/60 rounded-[1.5rem] p-4 bg-white flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 mt-0.5">
                      <p className="text-[11px] font-bold text-[#5D4A41] leading-snug">{item.name}</p>
                      <p className="text-[10px] font-bold text-[#D9774B] mt-1">{rp(item.price)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[8px] font-bold text-[#A67C52] uppercase tracking-widest">Pesanan Asli: {origQty}</span>
                      <div className="flex items-center gap-3 bg-[#F5EFE6] rounded-full px-3 py-1.5 border border-[#EADDCF]/50">
                        <button onClick={() => updateQty(item.id, -1)} className="text-[#A67C52] hover:text-[#5D4A41]"><Minus size={14} /></button>
                        <span className="text-xs font-bold w-4 text-center text-[#5D4A41]">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="text-[#A67C52] hover:text-[#5D4A41]"><Plus size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#EADDCF] bg-white shrink-0">
          <div className="flex justify-between items-center mb-5">
            <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">Total Dipilih</span>
            <span className="text-[17px] font-black text-[#D9774B] tracking-tighter">{rp(totalSelected)}</span>
          </div>
          <button 
            onClick={handleApply}
            disabled={totalSelected === 0}
            className="w-full py-3.5 rounded-2xl bg-[#D9774B] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#C56539] disabled:opacity-50 disabled:hover:bg-[#D9774B] transition-all flex justify-center items-center gap-2 shadow-sm"
          >
            <CheckCircle2 size={16} /> Terapkan Split Bill
          </button>
        </div>
      </div>
    </div>
  );
}
