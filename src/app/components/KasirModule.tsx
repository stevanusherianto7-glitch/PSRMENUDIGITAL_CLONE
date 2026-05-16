/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI LOGIKA PEMBAYARAN DAN PEMBUATAN STRUK (RECEIPT) PAWON SALAM.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN KERUGIAN FINANSIAL DAN GAGAL CETAK STRUK. ⚠️
 */

import { useState, useEffect } from "react";
import {
  ShoppingCart, Trash2, Banknote, Smartphone,
  CreditCard, Wallet, CheckCircle2, Minus, Plus,
  ChefHat, Tag, RefreshCw, Save, ExternalLink, Copy,
  Printer, ShoppingBag, X, Clock, Flame, XCircle
} from "lucide-react";
import { rp, menuCategories } from "../data";

const orderModeConfig = {
  "dine-in":   { label: "Dine In",   color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20" },
  "take-away": { label: "Take Away", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
} as const;
import { createOrder, deleteOrder } from "../api";
import { PromoModal } from "./PromoModal";
import { PrinterSettingsModal } from "./PrinterSettingsModal";
import { GuestReceipt, KitchenReceipt } from "./ReceiptTemplates";
import { printService } from "../../utils/printService";
import { toast } from "sonner";
import type { MenuItem, CartItem, Transaction, Promo, TableData, Order, OrderStatus } from "../types";



interface KasirModuleProps {
  menuItems: MenuItem[];
  onTransaction: (tx: Transaction) => Promise<void>;
  promos: Promo[];
  tables: TableData[];
  orders: Order[];
  autoSelectOrderId?: string | null;
  onClearAutoSelect?: () => void;
}

export function KasirModule({ menuItems, onTransaction, promos, tables, orders, autoSelectOrderId, onClearAutoSelect }: KasirModuleProps) {
  const orderStatusConfig: Record<OrderStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    pending: { label: "Antrian", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: <Clock size={12} /> },
    cooking: { label: "Dimasak", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: <Flame size={12} /> },
    ready: { label: "Siap Antar", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: <ShoppingBag size={12} /> },
    served: { label: "Selesai", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: <CheckCircle2 size={12} /> },
    cancelled: { label: "Dibatal", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: <XCircle size={12} /> },
  };

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem("pawon_cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error("Failed to parse cart from localStorage", e);
      return [];
    }
  });
  
  useEffect(() => {
    if (autoSelectOrderId && orders) {
      const targetOrder = orders.find(o => o.id === autoSelectOrderId);
      if (targetOrder) {
        setCart(targetOrder.items);
        setSelectedTable(targetOrder.tableId || "");
        setCurrentPayingOrderId(targetOrder.id);
        toast.success(`Memuat bill ${targetOrder.tableId ? 'Meja ' + targetOrder.tableId : 'Take Away'}`, { duration: 800, position: 'bottom-center', style: { fontSize: '10px', fontWeight: 'bold' } });
        if (onClearAutoSelect) onClearAutoSelect();
      }
    }
  }, [autoSelectOrderId, orders, onClearAutoSelect]);

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
  const [currentPayingOrderId, setCurrentPayingOrderId] = useState<string | null>(null);

  const mockOrders: Order[] = [
    {
      id: "O-1001",
      tableId: "A1",
      items: [
        { id: "m1", name: "GULAI MANGUT SEMARANG", price: 35000, qty: 1, available: true, category: "Makanan", image: "" },
        { id: "m12", name: "ES TEH", price: 5000, qty: 1, available: true, category: "Minuman", image: "" }
      ],
      subtotal: 40000,
      total: 40000,
      orderMode: "dine-in",
      status: "served",
      type: "guest",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "O-1002",
      tableId: "A4",
      items: [
        { id: "m4", name: "TAHU GIMBAL SEMARANG", price: 25000, qty: 2, available: true, category: "Makanan", image: "" },
        { id: "m11", name: "NIPIS MADU", price: 12000, qty: 2, available: true, category: "Minuman", image: "" }
      ],
      subtotal: 74000,
      total: 74000,
      orderMode: "dine-in",
      status: "served",
      type: "waiter",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: "Pedas sedang"
    }
  ];
  const activeBills = orders && orders.length > 0
    ? orders
      .filter(o => o.status === "served")
      .map(o => ({
        id: o.id,
        table: o.tableId,
        mode: o.orderMode,
        items: o.items,
        total: o.total,
        name: `Pesanan ${o.id}`
      }))
    : mockActiveBills;

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const discountAmount = selectedPromo
    ? (selectedPromo.type === "percentage"
      ? Math.round(subtotal * (selectedPromo.discount / 100))
      : selectedPromo.discount)
    : 0;

  const tax = Math.round((subtotal - discountAmount) * 0.1);
  const total = subtotal - discountAmount + tax;



  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  }

  async function processPayment() {
    if (!payMethod || cart.length === 0) return;
    
    setSaving(true);
    try {
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

      // 1. Simpan Transaksi & Detail ke Database (Latar Belakang)
      onTransaction(tx).catch(err => {
        console.error("Database save failed in background:", err);
        toast.error("Data gagal simpan ke cloud, silahkan cek koneksi.");
      });
      
      // 3. Hapus antrean (Latar Belakang)
      if (currentPayingOrderId) {
        deleteOrder(currentPayingOrderId).catch(e => console.log("Order delete error:", e));
      }

      // 4. Update UI seketika
      setLastTxId(txId);
      setCurrentTx(tx);
      setCurrentOrder({ ...tx, type: "kasir", orderMode, tableId: tx.table_id });
      setPaid(true);

    } catch (err) {
      toast.error("Gagal memproses transaksi. Silahkan coba lagi.");
      console.error("Payment error:", err);
    } finally {
      // Pastikan tombol aktif kembali
      setSaving(false);
    }

    setTimeout(() => {
      setPaid(false);
      setCart([]);
      localStorage.removeItem("pawon_cart");
      setPayMethod(null);
      setLastTxId(null);
      setCurrentTx(null);
      setCurrentOrder(null);
      setCurrentPayingOrderId(null);
      setChefNotes("");
      setOrderMode("dine-in");
    }, 60000);
  }

  async function handlePrintReceipt(e: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentTx) {
      toast.error("Data struk tidak ditemukan atau sudah dibersihkan.");
      return;
    }
    try {
      await printService.printTransaction(currentTx);
      toast.success("Struk berhasil dicetak");
    } catch (error) {
      toast.error("Gagal mencetak: " + (error as Error).message);
    }
  }

  async function handlePrintKitchenReceipt(e: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentOrder) {
      toast.error("Data pesanan tidak ditemukan.");
      return;
    }
    try {
      // Perbaikan nama fungsi agar sesuai dengan printService.ts
      await printService.printKitchen(currentOrder as any);
      toast.success("Struk dapur berhasil dicetak");
    } catch (error) {
      toast.error("Gagal mencetak: " + (error as Error).message);
    }
  }

  async function handlePrintClosingReport(e: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await printService.printClosingReport();
      toast.success("Laporan closing berhasil dicetak");
    } catch (error) {
      toast.error("Gagal mencetak laporan: " + (error as Error).message);
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
      {/* Active Bills Area */}
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        {/* Title for Kasir Bills */}
        <div className="flex items-center mb-4">
          <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-xs uppercase tracking-wider">
            Antrean Pembayaran (Siap Cetak)
          </div>
          
          <button
            onClick={() => setIsPrinterModalOpen(true)}
            title="Pengaturan Printer Bluetooth"
            className="ml-auto px-4 py-2 rounded-xl bg-card border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all flex items-center justify-center"
          >
            <Printer size={16} />
          </button>
        </div>

        {/* Grid of Active Bills */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 pb-24 p-2 custom-scrollbar content-start">
          {(orders && orders.length > 0 ? orders : mockOrders).filter(o => o.status === "served").map(order => {
            const cfg = orderStatusConfig[order.status];
            return (
              <div
                role="button"
                key={order.id}
                onClick={() => {
                  setCart(order.items);
                  setSelectedTable(order.tableId || "");
                  setCurrentPayingOrderId(order.id);
                  toast.success(`Memuat bill Meja ${order.tableId}`, { duration: 800, position: 'bottom-center', style: { fontSize: '10px', fontWeight: 'bold' } });
                }}
                className={`bg-card border border-border/60 rounded-2xl transition-all duration-300 hover:shadow-lg text-left w-full h-auto min-h-[160px] flex flex-col cursor-pointer relative ${currentPayingOrderId === order.id ? "ring-2 ring-primary shadow-lg shadow-primary/20 z-10" : "hover:border-primary/30"
                  }`}
              >
                <div className={`flex items-center gap-2 px-3 py-2.5 ${cfg.bg} border-b ${cfg.border} rounded-t-2xl`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`relative flex items-center justify-center ${cfg.color} flex-shrink-0`}>
                      <span className="relative">{cfg.icon}</span>
                    </span>
                    <span className={`text-[11px] font-black uppercase whitespace-nowrap ${cfg.color}`}>Meja {order.tableId}</span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg border uppercase tracking-tighter ${order.type === "guest" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : order.type === "waiter" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      }`}>
                      {order.type === "guest" ? "Scan" : order.type === "waiter" ? "Waiter" : "Kasir"}
                    </span>
                    {(() => {
                      const mode = (order.orderMode || "dine-in") as keyof typeof orderModeConfig;
                      const mcfg = orderModeConfig[mode] || orderModeConfig["dine-in"];
                      return <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg border uppercase tracking-tighter whitespace-nowrap ${mcfg.bg} ${mcfg.border} ${mcfg.color}`}>{mcfg.label}</span>;
                    })()}
                  </div>

                  <div className="ml-auto text-right min-w-0">
                    <p className="text-[9px] text-muted-foreground font-black font-mono truncate">{order.id}</p>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs items-center gap-4">
                      <span className="text-muted-foreground font-bold truncate">{item.name} <span className="text-foreground ml-1">×{item.qty}</span></span>
                      <span className="font-black flex-shrink-0">{rp(item.price * item.qty)}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/15">
                      <ChefHat size={12} className="text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Instruksi Khusus</p>
                        <p className="text-[11px] text-orange-300 font-bold leading-tight mt-0.5">{order.notes}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground font-black font-mono bg-secondary px-1.5 py-0.5 rounded-lg">{new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-green-500 font-black text-sm">{rp(order.total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button: Lanjut Bayar (Only visible on mobile) */}
      <button
        onClick={() => setIsCartOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex md:hidden items-center gap-3 px-6 py-3 rounded-full bg-primary text-white shadow-xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all animate-in zoom-in duration-300 ${cart.length === 0 ? "scale-0" : "scale-100"
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

      {/* Checkout Drawer Overlay (Only on mobile) */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] animate-in fade-in duration-300 md:hidden"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Checkout Drawer / Sidebar */}
      {cart.length > 0 && (
        <div className={`fixed inset-y-0 right-0 h-full w-full sm:w-[380px] lg:w-[400px] bg-card border-l border-border shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out ${isCartOpen ? "translate-x-0" : "translate-x-full"
          } md:relative md:translate-x-0 md:shadow-none md:border md:rounded-2xl md:z-10 flex flex-col h-[calc(100vh-160px)] animate-in slide-in-from-right duration-300`}>
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
            className="p-1.5 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors md:hidden"
            title="Tutup keranjang"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
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
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black border transition-all ${orderMode === m ? `${mcfg.bg} ${mcfg.border} ${mcfg.color} shadow-sm` : "bg-secondary border-border text-muted-foreground hover:bg-secondary/80"
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

              <div className="w-full flex flex-col gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left ml-1">Cetak Ulang Struk</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={(e) => handlePrintReceipt(e)} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-primary text-white text-[8px] font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                      <Printer size={14} /> <span>STRUK BELANJA</span>
                    </button>
                    <button type="button" onClick={(e) => handlePrintKitchenReceipt(e)} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-orange-500 text-white text-[8px] font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                      <ChefHat size={14} /> <span>STRUK DAPUR</span>
                    </button>
                    <button type="button" onClick={(e) => handlePrintClosingReport(e)} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-600 text-white text-[8px] font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all">
                      <Save size={14} /> <span>LAPORAN CLOSING</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="h-[1px] flex-1 bg-border/50"></div>
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Opsi Lain</span>
                  <div className="h-[1px] flex-1 bg-border/50"></div>
                </div>

                <div className="grid grid-cols-2 gap-2 opacity-60">
                   <button onClick={() => handlePrintPDF('customer')} className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-[9px] font-black hover:bg-secondary transition-all"><ExternalLink size={12} /> PDF Customer</button>
                   <button onClick={() => handlePrintPDF('kitchen')} className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-[9px] font-black hover:bg-secondary transition-all"><ExternalLink size={12} /> PDF Dapur</button>
                </div>
              </div>

              <button
                onClick={() => {
                  setPaid(false);
                  setCart([]);
                  setCurrentPayingOrderId(null);
                  setIsCartOpen(false);
                }}
                className="mt-2 text-xs font-black text-primary hover:scale-105 transition-transform"
              >
                ← Kembali ke Menu
              </button>
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 p-4 space-y-3">
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
                      <button onClick={() => updateQty(c.id, -1)} className="p-0.5 hover:text-red-500 transition-colors" title="Kurangi jumlah"><Minus size={12} /></button>
                      <span className="text-xs font-black w-3 text-center">{c.qty}</span>
                      <button onClick={() => updateQty(c.id, 1)} className="p-0.5 hover:text-primary transition-colors" title="Tambah jumlah"><Plus size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-card space-y-3">
                <div className="space-y-2">


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
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border transition-all ${payMethod === m.id ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-secondary border-border text-muted-foreground hover:bg-border"
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
    )}

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
