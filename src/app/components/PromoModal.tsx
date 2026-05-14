import { rp } from "../data";
import type { Promo } from "../types";

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  promos: Promo[];
  selectedPromo: Promo | null;
  onSelect: (promo: Promo | null) => void;
}

export function PromoModal({ isOpen, onClose, promos, selectedPromo, onSelect }: PromoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <h3 className="font-bold text-lg font-['Poppins']">Pilih Promo</h3>
          <p className="text-xs text-muted-foreground mt-1">Pilih promo yang berlaku untuk transaksi ini</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {promos.filter(p => p.active).map(promo => (
            <button
              key={promo.id}
              onClick={() => { onSelect(promo); onClose(); }}
              className={`py-3 px-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center gap-1 ${selectedPromo?.id === promo.id ? "bg-primary text-white border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
              title={promo.description}
            >
              <span className="font-bold">{promo.name}</span>
              <span className="text-[10px] opacity-80">{promo.type === "percentage" ? `${promo.discount}%` : rp(promo.discount)}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${!selectedPromo ? "bg-secondary border-border text-muted-foreground/30 cursor-not-allowed" : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"}`}
            disabled={!selectedPromo}
          >
            Reset Promo
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
