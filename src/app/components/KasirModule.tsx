import { useState, useEffect } from "react";
import {
  ShoppingCart, Trash2, Banknote, Smartphone,
  CreditCard, Wallet, CheckCircle2, Minus, Plus,
  ChefHat, Tag, RefreshCw, Save, ExternalLink, Copy,
  Printer, ShoppingBag
} from "lucide-react";
import { rp, menuCategories } from "../data";
import { createOrder } from "../api";
import { PromoModal } from "./PromoModal";
import { PrinterSettingsModal } from "./PrinterSettingsModal";
import { GuestReceipt, KitchenReceipt } from "./ReceiptTemplates";
import { printService } from "../../utils/printService";
import { toast } from "sonner";
import { orderModeConfig } from "../pages/AdminPage";
import type { MenuItem, CartItem, Transaction, Promo, TableData } from "../types";

interface KasirModuleProps {
  menuItems: MenuItem[];
  onTransaction: (tx: Transaction) => Promise<void>;
  promos: Promo[];
  tables: TableData[];
}

export function KasirModule({ menuItems, onTransaction, promos, tables }: KasirModuleProps) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem("pawon_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [cat, setCat] = useState("Semua");

  useEffect(() => {
    localStorage.setItem("pawon_cart", JSON.stringify(cart));
  }, [cart]);
  const [payMethod, setPayMethod] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<"dine-in" | "take-away">("dine-in");
  const [chefNotes, setChefNotes] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [currentTx, setCurrentTx] = useState<Transaction | null>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [printType, setPrintType] = useState<'customer' | 'kitchen' | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>(tables[0]?.id || "");

  const filtered = cat === "Semua" ? menuItems : menuItems.filter(m => m.category === cat);
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  
  const discountAmount = selectedPromo 
    ? (selectedPromo.type === "percentage" 
        ? Math.round(subtotal * (selectedPromo.discount / 100)) 
        : selectedPromo.discount)
    : 0;
    
  const tax = Math.round((subtotal - discountAmount) * 0.1);
  const total = subtotal - discountAmount + tax;

  function addToCart(item: MenuItem) {
    if (!item.available) return;
    setCart(prev => { const ex = prev.find(c => c.id === item.id); return ex ? prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { ...item, qty: 1 }]; });
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  }

  async function processPayment() {
    if (!payMethod || cart.length === 0) return;
    if (!confirm("Proses pembayaran " + (selectedTable ? "untuk meja " + selectedTable : "untuk take-away") + "?")) return;
    setSaving(true);
    const txId = `TX-${Date.now().toString(36).toUpperCase()}`;
    const tx: Transaction = {
      id: txId,
      table_id: orderMode === "take-away" ? null : selectedTable,
      items: cart,
      subtotal,
      discount: selectedPromo?.type === "percentage" ? selectedPromo.discount : undefined,
      discount_amount: discountAmount,
      tax,
      total,
      method: payMethod,
      created_at: new Date().toISOString()
    };
    await onTransaction(tx);
    // Also save as order
    const orderObj = { 
      id: txId, 
      tableId: orderMode === "take-away" ? null : selectedTable, 
      items: cart, 
      subtotal, 
      total, 
      notes: chefNotes, 
      orderMode, 
      type: "kasir",
      created_at: new Date().toISOString()
    };
    try {
      await createOrder(orderObj);
    } catch (e) { console.log("Order create error:", e); }
    setLastTxId(txId);
    setCurrentTx(tx);
    setCurrentOrder(orderObj);
    setSaving(false);
    setPaid(true);
    
    // Auto print if connected
    try {
      await printService.printTransaction(tx);
      await printService.printKitchenReceipt(orderObj);
    } catch (e) {
      console.log("Auto print failed:", e);
    }

    setTimeout(() => { 
      setPaid(false); 
      setCart([]); 
      localStorage.removeItem("pawon_cart"); 
      setPayMethod(null); 
      setLastTxId(null); 
      setCurrentTx(null);
      setCurrentOrder(null);
      setChefNotes(""); 
      setOrderMode("dine-in"); 
    }, 10000);
  }

  async function handlePrintReceipt() {
    if (!currentTx) return;
    try {
      await printService.printTransaction(currentTx);
      toast.success("Struk berhasil dicetak");
    } catch (error) {
      toast.error("Gagal mencetak: " + (error as Error).message);
    }
  }

  async function handlePrintKitchenReceipt() {
    if (!currentOrder) return;
    try {
      await printService.printKitchenReceipt(currentOrder);
      toast.success("Struk dapur berhasil dicetak");
    } catch (error) {
      toast.error("Gagal mencetak: " + (error as Error).message);
    }
  }

  function handlePrintPDF(type: 'customer' | 'kitchen') {
    setPrintType(type);
    setTimeout(() => {
      window.print();
      setPrintType(null);
    }, 100);
  }

  const payMethods = [
    { id: "Tunai", icon: <Banknote size={14} /> },
    { id: "QRIS", icon: <Smartphone size={14} /> },
    { id: "Debit", icon: <CreditCard size={14} /> },
    { id: "E-Wallet", icon: <Wallet size={14} /> },
    { id: "GoFood", icon: <ShoppingBag size={14} className="text-green-500" /> },
    { id: "GrabFood", icon: <ShoppingBag size={14} className="text-emerald-600" /> },
    { id: "ShopeeFood", icon: <ShoppingBag size={14} className="text-orange-500" /> },
  ];

  return (
    <div className="flex gap-4 h-[calc(100vh-160px)]">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
          {menuCategories.map(c => (
            <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0 border transition-all ${cat === c ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>{c}</button>
          ))}
        </div>
        <div className="overflow-y-auto grid grid-cols-2 gap-3 lg:grid-cols-3 auto-rows-max">
          {filtered.map(item => (
            <button key={item.id} onClick={() => addToCart(item)} disabled={!item.available}
              className={`bg-card border rounded-xl overflow-hidden text-left transition-all hover:scale-[1.02] group ${!item.available ? "opacity-40 cursor-not-allowed border-border" : "border-border hover:border-foreground/15"}`}>
              <div className="relative aspect-[3/2] bg-secondary overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {item.tag && <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.tag}</span>}
                {!item.available && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><span className="text-[10px] font-semibold text-muted-foreground">Habis</span></div>}
              </div>
              <div className="p-3">
                <p className="font-semibold text-xs text-foreground leading-tight">{item.name}</p>
                <p className="text-primary font-bold text-sm mt-1 font-['Poppins']">{rp(item.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-72 bg-card border border-border rounded-xl flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Pesanan Baru</h3>
            {cart.length > 0 && <button onClick={() => setCart([])} aria-label="Kosongkan keranjang" className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>}
          </div>
          
          {orderMode === "dine-in" && (
            <div className="mt-3">
              <label htmlFor="table-select" className="text-[10px] text-muted-foreground font-semibold uppercase">Pilih Meja</label>
              <select
                id="table-select"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Pilih Meja --</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>Meja {t.id}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dine-in / Take-away toggle */}
          <div className="flex gap-1.5 mt-3">
            {(["dine-in", "take-away"] as const).map(m => {
              const mcfg = orderModeConfig[m];
              return (
                <button key={m} onClick={() => setOrderMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    orderMode === m ? `${mcfg.bg} ${mcfg.border} ${mcfg.color}` : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  {m === "dine-in" ? "🍽️ Dine In" : "📦 Take Away"}
                </button>
              );
            })}
          </div>
        </div>
        {paid ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 overflow-y-auto">
            <CheckCircle2 size={32} className="text-green-400" />
            <p className="font-semibold text-xs text-green-400">Pembayaran Berhasil!</p>
            {lastTxId && <p className="text-[10px] text-muted-foreground font-mono bg-secondary px-2 py-1 rounded-lg border border-border">{lastTxId}</p>}
            
            <div className="w-full space-y-1.5 mt-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Customer</p>
              <button
                onClick={handlePrintReceipt}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Printer size={10} /> Thermal
              </button>
              <button
                onClick={() => handlePrintPDF('customer')}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                <ExternalLink size={10} /> PDF
              </button>
            </div>

            <div className="w-full space-y-1.5 mt-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Kitchen</p>
              <button
                onClick={handlePrintKitchenReceipt}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Printer size={10} /> Thermal
              </button>
              <button
                onClick={() => handlePrintPDF('kitchen')}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                <ExternalLink size={10} /> PDF
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs gap-2">
                  <ShoppingCart size={24} className="opacity-30" /><p>Pilih item dari menu</p>
                </div>
              ) : cart.map(c => (
                <div key={c.id} className="flex items-center gap-2 bg-secondary rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{rp(c.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(c.id, -1)} aria-label="Kurangi jumlah" className="w-5 h-5 rounded bg-background flex items-center justify-center hover:bg-border"><Minus size={10} /></button>
                    <span className="text-xs font-bold w-4 text-center">{c.qty}</span>
                    <button onClick={() => updateQty(c.id, 1)} aria-label="Tambah jumlah" className="w-5 h-5 rounded bg-primary flex items-center justify-center hover:bg-indigo-500"><Plus size={10} className="text-white" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border space-y-3">
              {/* Catatan Chef */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                  <ChefHat size={10} className="text-orange-400" /> Catatan untuk Chef
                </label>
                <input
                  value={chefNotes}
                  onChange={e => setChefNotes(e.target.value)}
                  placeholder="masak pedas, tanpa bawang..."
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-[11px] focus:outline-none focus:border-orange-400/50 transition-colors placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Tombol Buka Pop-up Promo */}
              <div className="mb-2">
                <button
                  onClick={() => setIsPromoModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                >
                  <Tag size={12} className="text-primary" />
                  {selectedPromo ? `Promo: ${selectedPromo.name}` : "Pilih Promo"}
                </button>
              </div>
              {/* Tombol Pengaturan Printer */}
              <div className="mb-3">
                <button
                  onClick={() => setIsPrinterModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                >
                  <Printer size={12} className="text-primary" />
                  Pengaturan Printer
                </button>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{rp(subtotal)}</span></div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-400 font-medium">
                    <span>Diskon ({selectedPromo?.name})</span>
                    <span>-{rp(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground"><span>PPN 10%</span><span>{rp(tax)}</span></div>
                <div className="flex justify-between font-bold text-sm border-t border-border pt-1.5"><span>Total</span><span className="text-green-400">{rp(total)}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {payMethods.map(m => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition-all ${payMethod === m.id ? "bg-primary border-primary text-white" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                    {m.icon} {m.id}
                  </button>
                ))}
              </div>
              <button onClick={processPayment} disabled={!payMethod || cart.length === 0 || saving || !selectedTable}
                className="w-full py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                {saving ? <><RefreshCw size={14} className="animate-spin" /> Menyimpan...</> : <><Save size={14} /> Proses Pembayaran</>}
              </button>
            </div>
          </>
        )}
      </div>

      <PromoModal
        isOpen={isPromoModalOpen}
        onClose={() => setIsPromoModalOpen(false)}
        promos={promos}
        selectedPromo={selectedPromo}
        onSelect={setSelectedPromo}
      />

      {isPrinterModalOpen && (
        <PrinterSettingsModal onClose={() => setIsPrinterModalOpen(false)} />
      )}

      {/* Render Receipt untuk Print Browser (PDF) */}
      {printType === 'customer' && currentTx && (
        <div className="receipt-print-wrapper">
          <GuestReceipt tx={currentTx} />
        </div>
      )}
      {printType === 'kitchen' && currentOrder && (
        <div className="receipt-print-wrapper">
          <KitchenReceipt order={currentOrder} />
        </div>
      )}
    </div>
  );
}
