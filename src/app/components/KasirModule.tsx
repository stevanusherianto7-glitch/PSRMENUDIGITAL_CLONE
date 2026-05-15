import { useState, useEffect } from "react";
import {
  ShoppingCart, Trash2, Banknote, Smartphone,
  CreditCard, Wallet, CheckCircle2, Minus, Plus,
  ChefHat, Tag, RefreshCw, Save, ExternalLink, Copy,
  Printer, ShoppingBag, X
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
  const [isCartOpen, setIsCartOpen] = useState(false);
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
    <div className="relative h-full lg:h-[calc(100vh-160px)] flex flex-col md:flex-row gap-6">
      {/* Sidebar Kategori */}
      <div className="w-full md:w-40 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 custom-scrollbar">
        <p className="hidden md:block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Kategori</p>
        {menuCategories.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-2.5 rounded-xl text-[11px] font-bold text-left transition-all flex-shrink-0 md:flex-shrink ${
              cat === c 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-card border border-border/60 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Menu Area */}
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-24 custom-scrollbar content-start">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => {
                addToCart(item);
                toast.success(`${item.name}`, { duration: 800, position: 'bottom-center', style: { fontSize: '10px', fontWeight: 'bold' } });
              }}
              disabled={!item.available}
              className={`bg-card border border-border/60 rounded-xl overflow-hidden text-left transition-all active:scale-95 group shadow-sm flex flex-col h-full ${
                !item.available ? "opacity-40 cursor-not-allowed grayscale" : "hover:border-primary/30 hover:shadow-md"
              }`}
            >
              <div className="relative w-full h-0 pb-[75%] bg-secondary overflow-hidden">
                <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                {item.tag && (
                  <span className="absolute top-1.5 left-1.5 bg-primary/90 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest shadow-lg">
                    {item.tag}
                  </span>
                )}
                {!item.available && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] bg-white/90 px-2 py-1 rounded-lg">HABIS</span>
                  </div>
                )}
              </div>
              <div className="p-2.5 flex-1 flex flex-col gap-1">
                <p className="font-bold text-[11px] text-foreground leading-tight line-clamp-2 h-[2rem] group-hover:text-primary transition-colors uppercase tracking-tight">{item.name}</p>
                <p className="text-primary font-black text-xs mt-auto font-['Poppins']">{rp(item.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Action Button: Lanjut Bayar */}
      <button
        onClick={() => setIsCartOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-3 px-6 py-3 rounded-full bg-primary text-white shadow-xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all animate-in zoom-in duration-300 ${
          cart.length === 0 ? "scale-0" : "scale-100"
        }`}
      >
        <div className="flex flex-col items-start leading-tight border-r border-white/20 pr-3">
          <span className="text-[8px] font-black uppercase tracking-widest opacity-80">Total</span>
          <span className="text-sm font-black font-['Poppins']">{rp(total)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider">Bayar</span>
          <div className="bg-white text-primary text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-inner">
            {cart.reduce((s, c) => s + c.qty, 0)}
          </div>
        </div>
      </button>

      {/* Checkout Drawer Overlay */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] animate-in fade-in duration-300"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Checkout Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-card border-l border-border shadow-2xl z-[60] flex flex-col transition-transform duration-500 ease-out transform ${
        isCartOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-black text-sm text-foreground">Pesanan Baru</h3>
              <p className="text-[10px] text-muted-foreground">Selesaikan pembayaran</p>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-card space-y-3">
            {orderMode === "dine-in" && (
              <div>
                <label htmlFor="table-select" className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Meja Pelanggan</label>
                <select
                  id="table-select"
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all appearance-none"
                >
                  <option value="">-- Pilih Meja --</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>Meja {t.id}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              {(["dine-in", "take-away"] as const).map(m => {
                const mcfg = orderModeConfig[m];
                return (
                  <button key={m} onClick={() => setOrderMode(m)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black border transition-all ${
                      orderMode === m ? `${mcfg.bg} ${mcfg.border} ${mcfg.color} shadow-sm` : "bg-secondary border-border text-muted-foreground hover:bg-secondary/80"
                    }`}>
                    {m === "dine-in" ? "🍽️ Dine In" : "📦 Take Away"}
                  </button>
                );
              })}
            </div>
          </div>

          {paid ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5 text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <div>
                <h4 className="font-black text-xl text-foreground">Sukses!</h4>
                <p className="text-xs text-muted-foreground mt-1">Struk telah dikirim ke antrean cetak</p>
              </div>
              {lastTxId && (
                <div className="bg-secondary px-4 py-2 rounded-xl border border-border">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">ID</p>
                  <p className="text-xs font-mono font-black text-primary">{lastTxId}</p>
                </div>
              )}

              <div className="w-full grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Customer</p>
                  <button onClick={handlePrintReceipt} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-white text-[10px] font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"><Printer size={12} /> Thermal</button>
                  <button onClick={() => handlePrintPDF('customer')} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary border border-border text-[10px] font-black hover:bg-border transition-all"><ExternalLink size={12} /> PDF</button>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Kitchen</p>
                  <button onClick={handlePrintKitchenReceipt} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"><ChefHat size={12} /> Thermal</button>
                  <button onClick={() => handlePrintPDF('kitchen')} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary border border-border text-[10px] font-black hover:bg-border transition-all"><ExternalLink size={12} /> PDF</button>
                </div>
              </div>

              <button
                onClick={() => {
                  setPaid(false);
                  setCart([]);
                  setIsCartOpen(false);
                }}
                className="mt-2 text-xs font-black text-primary hover:scale-105 transition-transform"
              >
                ← Kembali ke Menu
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 opacity-30">
                    <div className="p-6 bg-secondary rounded-full border-2 border-dashed border-border"><ShoppingCart size={32} /></div>
                    <div className="text-center">
                      <p className="font-black text-xs uppercase tracking-widest">Keranjang Kosong</p>
                    </div>
                  </div>
                ) : cart.map(c => (
                  <div key={c.id} className="flex items-center gap-3 bg-secondary/30 border border-border/40 rounded-2xl p-2.5 group hover:border-primary/20 transition-all">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-card border border-border shadow-sm">
                      <img src={c.image} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-foreground leading-snug line-clamp-1">{c.name}</p>
                      <p className="text-xs text-primary font-black mt-0.5 font-['Poppins']">{rp(c.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-2 py-1 shadow-sm">
                      <button onClick={() => updateQty(c.id, -1)} className="p-0.5 hover:text-red-500 transition-colors"><Minus size={12} /></button>
                      <span className="text-xs font-black w-3 text-center">{c.qty}</span>
                      <button onClick={() => updateQty(c.id, 1)} className="p-0.5 hover:text-primary transition-colors"><Plus size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-card space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <ChefHat size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
                      <input
                        value={chefNotes}
                        onChange={e => setChefNotes(e.target.value)}
                        placeholder="Catatan Chef..."
                        className="w-full bg-secondary border border-border rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                    <button onClick={() => setIsPrinterModalOpen(true)} className="p-2 bg-secondary border border-border rounded-xl text-indigo-400 hover:text-indigo-500 transition-colors" title="Printer Settings">
                      <Printer size={16} />
                    </button>
                  </div>

                  <button onClick={() => setIsPromoModalOpen(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary border border-border text-[10px] font-black text-muted-foreground hover:text-foreground transition-all">
                    <Tag size={12} className="text-primary" /> {selectedPromo ? selectedPromo.name : "Pilih Promo"}
                  </button>
                </div>

                <div className="space-y-1.5 bg-secondary/20 p-3 rounded-2xl border border-border/50">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-bold"><span>Subtotal</span><span>{rp(subtotal)}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-[10px] text-red-500 font-bold italic"><span>Diskon</span><span>-{rp(discountAmount)}</span></div>}
                  <div className="flex justify-between text-[10px] text-muted-foreground font-bold"><span>PPN (10%)</span><span>{rp(tax)}</span></div>
                  <div className="flex justify-between font-black text-sm border-t border-border/50 pt-2 mt-1"><span>TOTAL</span><span className="text-primary font-['Poppins']">{rp(total)}</span></div>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Metode Pembayaran</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {payMethods.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setPayMethod(m.id)}
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border transition-all ${
                          payMethod === m.id ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-secondary border-border text-muted-foreground hover:bg-border"
                        }`}
                      >
                        {m.icon}
                        <span className="text-[8px] font-black uppercase tracking-tighter">{m.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={processPayment} disabled={!payMethod || cart.length === 0 || saving || (orderMode === 'dine-in' && !selectedTable)}
                  className="w-full py-3.5 rounded-2xl bg-primary text-white text-xs font-black hover:bg-primary/90 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 uppercase tracking-widest">
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Memproses..." : "Konfirmasi & Bayar"}
                </button>
              </div>
            </>
          )}
        </div>
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
