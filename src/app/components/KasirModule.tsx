/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI LOGIKA PEMBAYARAN DAN PEMBUATAN STRUK (RECEIPT) PAWON SALAM.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN KERUGIAN FINANSIAL DAN GAGAL CETAK STRUK. ⚠️
 */

import { useState, useEffect, useRef } from "react";
import {
  ShoppingCart, Trash2, Banknote, Smartphone,
  CreditCard, Wallet, CheckCircle2, Minus, Plus,
  ChefHat, Tag, RefreshCw, Save, ExternalLink, Copy,
  Printer, ShoppingBag, X, Clock, Flame, XCircle, AlertTriangle
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
  const [printerConnected, setPrinterConnected] = useState(printService.getIsConnected());
  const [showPayConfirm, setShowPayConfirm] = useState(false);

  // Listen to printer connection status changes
  useEffect(() => {
    const unsub = printService.onConnectionChange((connected) => {
      setPrinterConnected(connected);
    });
    return unsub;
  }, []);

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
    setShowPayConfirm(false);
    
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

      // 5. AUTO PRINT (Sesuai Alur POS Profesional)
      // Jalankan di background agar UI tidak freeze
      printService.printAll(tx).catch(e => console.log("Auto print failed:", e));

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
            className={`ml-auto px-4 py-2 rounded-xl border transition-all flex items-center justify-center gap-2 ${
              printerConnected
                ? "bg-green-500/10 border-green-500/30 text-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)] hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                : "bg-card border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span className="relative">
              <Printer size={16} />
              {printerConnected && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
              )}
            </span>
            {printerConnected && <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline">Online</span>}
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
        className={`fixed bottom-[calc(2rem+var(--safe-area-bottom))] right-6 left-6 md:left-auto z-40 flex md:hidden items-center justify-between px-8 py-4 rounded-3xl bg-primary text-white shadow-[0_20px_50px_rgba(232,119,34,0.4)] hover:scale-105 active:scale-95 transition-all animate-in zoom-in duration-500 ${cart.length === 0 ? "scale-0" : "scale-100"
          }`}
      >
        <div className="flex flex-col items-start leading-tight pr-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Payment</span>
          <span className="text-xl font-black font-['Poppins']">{rp(total)}</span>
        </div>
        <div className="flex items-center gap-4 border-l border-white/20 pl-6 h-10">
          <span className="text-sm font-black uppercase tracking-[0.2em]">Bayar</span>
          <div className="bg-white text-primary text-[11px] font-black w-7 h-7 rounded-xl flex items-center justify-center shadow-lg">
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
        <div className={`fixed inset-y-0 right-0 h-full w-full sm:w-[400px] lg:w-[420px] bg-black/60 backdrop-blur-3xl border-l border-white/5 shadow-2xl z-[60] transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCartOpen ? "translate-x-0" : "translate-x-full"
          } md:relative md:translate-x-0 md:shadow-none md:border md:rounded-3xl md:z-10 flex flex-col h-[calc(100vh-160px)] animate-in slide-in-from-right duration-500`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-2xl shadow-lg shadow-primary/10">
              <ShoppingCart size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white uppercase tracking-widest">Billing Hub</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-1">Ready for checkout</p>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-6 border-b border-white/5 bg-transparent space-y-4">
            {orderMode === "dine-in" && (
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Service Table</label>
                <div className="relative group">
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#0a0a0c]">-- SELECT TABLE --</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.id} className="bg-[#0a0a0c]">TABLE {t.id}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <Clock size={14} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {(["dine-in", "take-away"] as const).map(m => {
                const isActive = orderMode === m;
                return (
                  <button key={m} onClick={() => setOrderMode(m)}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${isActive ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                      }`}>
                    {m === "dine-in" ? "Dine In" : "Take Away"}
                  </button>
                );
              })}
            </div>
          </div>

          {paid ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center animate-bounce border border-green-500/20">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <div className="space-y-2">
                <h4 className="font-black text-2xl text-white uppercase tracking-tighter">Transaction Success</h4>
                <p className="text-xs text-slate-500 font-medium">Receipt has been added to the print queue</p>
              </div>

              {lastTxId && (
                <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">TX Ref ID</p>
                  <p className="text-xs font-mono font-black text-primary tracking-widest">{lastTxId}</p>
                </div>
              )}

              <div className="w-full flex flex-col gap-5 pt-4">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left ml-1">Reprint Service</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button type="button" onClick={(e) => handlePrintReceipt(e)} className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                      <Printer size={18} /> Customer Receipt
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={(e) => handlePrintKitchenReceipt(e)} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all">
                        <ChefHat size={16} /> Kitchen
                      </button>
                      <button type="button" onClick={(e) => handlePrintClosingReport(e)} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
                        <Save size={16} /> Closing
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <div className="h-[1px] flex-1 bg-white/5"></div>
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Digital Export</span>
                  <div className="h-[1px] flex-1 bg-white/5"></div>
                </div>

                <div className="grid grid-cols-2 gap-3 opacity-60">
                   <button onClick={() => handlePrintPDF('customer')} className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">PDF Client</button>
                   <button onClick={() => handlePrintPDF('kitchen')} className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">PDF Master</button>
                </div>
              </div>

              <button
                onClick={() => {
                  setPaid(false);
                  setCart([]);
                  setCurrentPayingOrderId(null);
                  setIsCartOpen(false);
                }}
                className="mt-6 text-xs font-black text-primary uppercase tracking-[0.2em] hover:scale-110 transition-transform"
              >
                ← Terminal Home
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-6">
                    <div className="w-20 h-20 bg-white/2 rounded-full border-2 border-dashed border-white/5 flex items-center justify-center">
                      <ShoppingCart size={32} className="opacity-20" />
                    </div>
                    <p className="font-black text-xs uppercase tracking-[0.3em] opacity-30">Cart Empty</p>
                  </div>
                ) : cart.map(c => (
                  <div key={c.id} className="flex items-center gap-4 bg-white/2 border border-white/5 rounded-3xl p-3 group hover:border-primary/30 transition-all duration-500">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10">
                      <img src={c.image} alt={c.name} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white leading-tight uppercase tracking-tight line-clamp-1">{c.name}</p>
                      <p className="text-[10px] text-primary font-black mt-1 font-mono tracking-tighter">{rp(c.price)}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
                      <button onClick={() => updateQty(c.id, -1)} className="text-slate-500 hover:text-red-500 transition-colors"><Minus size={14} /></button>
                      <span className="text-xs font-black w-4 text-center text-white">{c.qty}</span>
                      <button onClick={() => updateQty(c.id, 1)} className="text-slate-500 hover:text-primary transition-colors"><Plus size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-white/5 bg-white/2 space-y-5 rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
                <div className="space-y-4">
                  <button onClick={() => setIsPromoModalOpen(true)} className="w-full h-12 flex items-center justify-between px-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 hover:text-white transition-all group">
                    <div className="flex items-center gap-3">
                      <Tag size={14} className="text-primary group-hover:scale-110 transition-transform" />
                      <span className="uppercase tracking-widest">{selectedPromo ? selectedPromo.name : "Apply Voucher"}</span>
                    </div>
                    <Plus size={14} />
                  </button>

                  <div className="space-y-2 bg-black/40 p-5 rounded-3xl border border-white/5">
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest"><span>Gross Total</span><span>{rp(subtotal)}</span></div>
                    {discountAmount > 0 && <div className="flex justify-between text-[10px] text-red-400 font-black italic uppercase tracking-widest"><span>Promo Discount</span><span>-{rp(discountAmount)}</span></div>}
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest"><span>Tax (10%)</span><span>{rp(tax)}</span></div>
                    <div className="flex justify-between font-black text-xl border-t border-white/5 pt-4 mt-2 text-white font-['Poppins'] tracking-tighter"><span>TOTAL</span><span className="text-primary">{rp(total)}</span></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] text-center">Settlement Method</p>
                  <div className="grid grid-cols-4 gap-2">
                    {payMethods.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setPayMethod(m.id)}
                        className={`flex flex-col items-center justify-center gap-2 py-3 rounded-2xl border transition-all duration-300 ${payMethod === m.id ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105 glow-primary" : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                          }`}
                      >
                        <div className={`${payMethod === m.id ? "text-white" : "text-slate-400"}`}>{m.icon}</div>
                        <span className="text-[8px] font-black uppercase tracking-tighter">{m.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => {
                    if (!payMethod || cart.length === 0 || saving || (orderMode === 'dine-in' && !selectedTable)) return;
                    setShowPayConfirm(true);
                  }} disabled={!payMethod || cart.length === 0 || saving || (orderMode === 'dine-in' && !selectedTable)}
                  className="w-full py-4.5 rounded-2xl bg-primary text-white text-[11px] font-black hover:bg-primary/90 disabled:opacity-20 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/40 uppercase tracking-[0.2em] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? "Finalizing..." : "Execute Payment"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}

      {/* Payment Confirmation Dialog */}
      {showPayConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowPayConfirm(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border text-center">
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={28} className="text-primary" />
              </div>
              <h3 className="font-black text-base text-foreground">Konfirmasi Pembayaran</h3>
              <p className="text-xs text-muted-foreground mt-1">Pastikan data sudah benar sebelum memproses</p>
            </div>
            <div className="px-6 py-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Total</span>
                <span className="font-black text-lg text-primary">{rp(total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Metode</span>
                <span className="font-black text-foreground uppercase">{payMethod}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Meja</span>
                <span className="font-black text-foreground">{orderMode === "take-away" ? "Take Away" : selectedTable || "-"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Item</span>
                <span className="font-black text-foreground">{cart.reduce((s, c) => s + c.qty, 0)} pcs</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={() => setShowPayConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-border text-xs font-black text-muted-foreground hover:text-foreground transition-colors"
              >
                Batal
              </button>
              <button
                onClick={processPayment}
                className="flex-1 py-3 rounded-xl bg-green-500 text-white text-xs font-black shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> Ya, Proses
              </button>
            </div>
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
