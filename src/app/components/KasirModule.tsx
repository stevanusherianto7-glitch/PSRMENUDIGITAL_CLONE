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

import { SplitBillModal } from "./SplitBillModal";
import { TambahItemModal } from "./TambahItemModal";
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
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [isTambahItemOpen, setIsTambahItemOpen] = useState(false);
  const [originalCartForSplit, setOriginalCartForSplit] = useState<CartItem[]>([]);
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
        discount: selectedPromo ? (selectedPromo.type === "percentage" ? selectedPromo.discount : (subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0)) : undefined,
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
          {(orders || []).filter(o => o.status === "served").map(order => {
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
                  <div className="pt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        printService.printKitchen(order);
                      }}
                      className="flex-1 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black rounded-xl hover:bg-orange-500/20 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                       <ChefHat size={12} /> CETAK ULANG DAPUR
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {(orders || []).filter(o => o.status === "served").length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center opacity-50">
              <CheckCircle2 size={40} className="text-muted-foreground mb-4" />
              <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Antrean Kosong</p>
              <p className="text-xs text-muted-foreground mt-1">Belum ada pesanan yang siap dibayar</p>
            </div>
          )}
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
          className="fixed inset-0 bg-black/40 dark:bg-black/ backdrop-blur-sm z-[50] animate-in fade-in duration-300 md:hidden"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Checkout Drawer / Sidebar */}
      {cart.length > 0 && (
        <div className={`fixed inset-y-0 right-0 h-full w-full sm:w-[400px] lg:w-[420px] bg-[#FDF8F5] shadow-2xl z-[60] transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCartOpen ? "translate-x-0" : "translate-x-full"} md:relative md:translate-x-0 md:shadow-none md:border-l md:border-[#EADDCF] flex flex-col h-[calc(100vh-160px)] animate-in slide-in-from-right duration-500 rounded-tl-3xl md:rounded-none`}>
          {/* Header */}
          <div className="p-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-4 bg-[#F5EFE6] px-4 py-3 rounded-2xl w-full">
              <div className="p-2 bg-[#EADDCF] rounded-xl text-[#A67C52]">
                <ShoppingCart size={18} />
              </div>
              <div>
                <h3 className="font-bold text-xs text-[#5D4A41] uppercase tracking-widest">Pengelola Tagihan</h3>
                <p className="text-[9px] text-[#A67C52] font-semibold uppercase tracking-tighter mt-0.5">Siap diproses pembayaran</p>
              </div>
            </div>
            <button onClick={() => setIsCartOpen(false)} className="p-2 ml-2 hover:bg-[#EADDCF] rounded-xl text-[#A67C52] transition-all md:hidden">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar px-6 pb-6">
            {paid ? (
              // Success Screen
              <div className="flex-1 flex flex-col items-center pt-8 pb-4 text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-200 mb-6">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <h4 className="font-serif text-lg text-[#5D4A41] uppercase tracking-wider mb-2">Transaksi Berhasil</h4>
                <p className="text-[10px] text-[#A67C52] font-medium mb-8">Struk telah dimasukkan ke antrean cetak</p>

                {lastTxId && (
                  <div className="bg-[#F5EFE6] px-6 py-2.5 rounded-xl border border-[#EADDCF] mb-8">
                    <p className="text-[8px] font-bold text-[#A67C52] uppercase tracking-[0.2em] mb-1">Kode Transaksi</p>
                    <p className="text-[10px] font-mono font-bold text-[#D9774B] tracking-widest">{lastTxId}</p>
                  </div>
                )}

                <div className="w-full flex flex-col gap-4 text-left">
                  <p className="text-[9px] font-bold text-[#A67C52] uppercase tracking-widest ml-1">Layanan Cetak Ulang</p>
                  <button onClick={(e) => handlePrintReceipt(e)} className="w-full py-3.5 rounded-2xl bg-[#D9774B] text-white text-[10px] font-bold uppercase tracking-widest shadow-md hover:bg-[#C56539] transition-all flex justify-center items-center gap-2">
                    <Printer size={14} /> Struk Pelanggan
                  </button>
                  <div className="flex gap-3">
                    <button onClick={(e) => handlePrintKitchenReceipt(e)} className="flex-1 py-3 rounded-2xl bg-[#E85D04] text-white text-[9px] font-bold uppercase tracking-widest shadow-md hover:bg-[#D05303] transition-all flex justify-center items-center gap-2">
                      <ChefHat size={14} /> Struk Dapur
                    </button>
                    <button onClick={(e) => handlePrintClosingReport(e)} className="flex-1 py-3 rounded-2xl bg-[#A67C52] text-white text-[9px] font-bold uppercase tracking-widest shadow-md hover:bg-[#8B6844] transition-all flex justify-center items-center gap-2">
                      <Save size={14} /> Laporan Closing Shift
                    </button>
                  </div>

                  <div className="flex items-center gap-4 my-2">
                    <div className="h-[1px] flex-1 bg-[#EADDCF]"></div>
                    <span className="text-[8px] font-bold text-[#A67C52] uppercase tracking-widest whitespace-nowrap">Ekspor Dokumen Digital</span>
                    <div className="h-[1px] flex-1 bg-[#EADDCF]"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handlePrintPDF('customer')} className="py-2.5 bg-white border border-[#EADDCF] rounded-xl text-[8px] font-bold text-[#A67C52] uppercase tracking-widest hover:bg-[#F5EFE6] transition-all">Struk PDF Pelanggan</button>
                    <button onClick={() => handlePrintPDF('kitchen')} className="py-2.5 bg-white border border-[#EADDCF] rounded-xl text-[8px] font-bold text-[#A67C52] uppercase tracking-widest hover:bg-[#F5EFE6] transition-all">Struk PDF Dapur</button>
                    <button onClick={() => handlePrintClosingReport(null as any)} className="col-span-2 py-2.5 bg-white border border-[#EADDCF] rounded-xl text-[8px] font-bold text-[#A67C52] uppercase tracking-widest hover:bg-[#F5EFE6] transition-all">Struk PDF Laporan Closing Shift</button>
                  </div>
                </div>

                <button onClick={() => { setPaid(false); setCart([]); setCurrentPayingOrderId(null); setIsCartOpen(false); }} className="mt-8 text-[10px] font-bold text-[#D9774B] uppercase tracking-[0.2em] hover:scale-105 transition-transform flex items-center gap-1">
                  <span className="text-sm">←</span> Beranda Utama
                </button>
              </div>
            ) : (
              // Checkout Screen
              <>
                {/* Inputs */}
                <div className="space-y-4 mb-6 border-b border-[#EADDCF] pb-6">
                  {orderMode === "dine-in" && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-[#A67C52] uppercase tracking-[0.2em] ml-1">Meja Pelayanan</label>
                      <div className="relative group">
                        <select
                          value={selectedTable}
                          onChange={(e) => setSelectedTable(e.target.value)}
                          className="w-full bg-white border border-[#EADDCF] rounded-2xl px-4 py-3 text-xs font-bold text-[#5D4A41] focus:outline-none focus:border-[#D9774B] transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled>-- PILIH NOMOR MEJA --</option>
                          {tables.map(t => <option key={t.id} value={t.id}>MEJA {t.id}</option>)}
                        </select>
                        <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A67C52] pointer-events-none" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-[#A67C52] uppercase tracking-[0.2em] ml-1">Tipe Layanan</label>
                    <div className="flex w-full bg-white border border-[#EADDCF] rounded-2xl overflow-hidden p-1">
                      {(["dine-in", "take-away"] as const).map(m => (
                        <button key={m} onClick={() => setOrderMode(m)} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${orderMode === m ? "bg-[#FDF8F5] text-[#D9774B] shadow-sm" : "text-[#A67C52] hover:bg-[#F5EFE6]"}`}>
                          {m === "dine-in" ? "Dine In" : "Take Away"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cart Items List */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">Daftar Pesanan</h4>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setOriginalCartForSplit([...cart]); setIsSplitBillOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EADDCF] rounded-full text-[9px] font-bold text-[#A67C52] hover:bg-[#F5EFE6] transition-all">
                        <ExternalLink size={10} /> SPLIT BILL
                      </button>
                      <button onClick={() => setIsTambahItemOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5EFE6] text-[#D9774B] rounded-full text-[9px] font-bold hover:bg-[#EADDCF] transition-all">
                        <Plus size={10} /> TAMBAH ITEM
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {cart.length === 0 ? (
                      <p className="text-xs text-center text-[#A67C52] py-4">Keranjang Kosong</p>
                    ) : cart.map(c => (
                      <div key={c.id} className="flex items-center gap-3 bg-white border border-[#EADDCF] rounded-3xl p-2.5 shadow-sm">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0">
                          <img src={menuItems.find(m => m.id === c.id)?.image || c.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&q=80"} alt={c.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-[#5D4A41] uppercase tracking-tight line-clamp-1">{c.name}</p>
                          <p className="text-[10px] font-bold text-[#D9774B] mt-0.5">{rp(c.price)}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-[#F5EFE6] border border-[#EADDCF] rounded-full px-2 py-1 mr-1">
                          <button onClick={() => updateQty(c.id, -1)} className="text-[#A67C52] hover:text-[#5D4A41] p-0.5"><Minus size={12} /></button>
                          <span className="text-[10px] font-bold w-3 text-center text-[#5D4A41]">{c.qty}</span>
                          <button onClick={() => updateQty(c.id, 1)} className="text-[#A67C52] hover:text-[#5D4A41] p-0.5"><Plus size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voucher & Totals */}
                <div className="bg-[#F5EFE6] p-5 rounded-[2rem] space-y-4 mt-auto">
                  <button onClick={() => setIsPromoModalOpen(true)} className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#EADDCF] rounded-2xl text-[10px] font-bold text-[#A67C52]">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-[#D9774B]" />
                      <span className="uppercase tracking-widest">{selectedPromo ? selectedPromo.name : "Terapkan Voucher"}</span>
                    </div>
                    <Plus size={14} />
                  </button>
                  
                  <div className="space-y-2.5 px-2">
                    <div className="flex justify-between text-[10px] text-[#A67C52] font-bold uppercase tracking-widest">
                      <span>Total Kotor</span><span>{rp(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[10px] text-red-500 font-bold uppercase tracking-widest">
                        <span>Potongan</span><span>-{rp(discountAmount)}</span>
                      </div>
                    )}
                    <div className="border-t border-[#EADDCF] my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#5D4A41]">TOTAL</span>
                      <span className="text-sm font-black text-[#D9774B]">{rp(total)}</span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="pt-2">
                    <p className="text-[9px] font-bold text-[#A67C52] uppercase tracking-[0.2em] text-center mb-3">Metode Pembayaran</p>
                    <div className="grid grid-cols-4 gap-2">
                      {payMethods.map(m => (
                        <button key={m.id} onClick={() => setPayMethod(m.id)} className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl border transition-all bg-white ${payMethod === m.id ? "border-[#D9774B] shadow-sm ring-1 ring-[#D9774B]" : "border-[#EADDCF] hover:border-[#D9774B]/50"}`}>
                          <div className={payMethod === m.id ? "text-[#D9774B]" : "text-[#A67C52]"}>{m.icon}</div>
                          <span className={`text-[8px] font-bold uppercase tracking-tighter ${payMethod === m.id ? "text-[#D9774B]" : "text-[#A67C52]"}`}>{m.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => { if (!payMethod || cart.length === 0 || saving || (orderMode === 'dine-in' && !selectedTable)) return; setShowPayConfirm(true); }} disabled={!payMethod || cart.length === 0 || saving || (orderMode === 'dine-in' && !selectedTable)} className="w-full py-4 mt-2 rounded-2xl bg-[#EADDCF] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#D9774B] disabled:opacity-50 disabled:hover:bg-[#EADDCF] transition-all flex items-center justify-center gap-2">
                     {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                     {saving ? "MEMPROSES..." : "PROSES BAYAR"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Konfirmasi Pembayaran Modal */}
      {showPayConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setShowPayConfirm(false)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-[#F5EFE6] p-6 pb-5 relative">
              <button onClick={() => setShowPayConfirm(false)} className="absolute top-6 right-6 text-[#A67C52] hover:text-[#5D4A41] transition-colors">
                <X size={20} />
              </button>
              <h3 className="font-serif font-bold text-lg text-[#5D4A41] tracking-wide mb-1">Konfirmasi Pembayaran</h3>
              <p className="text-[10px] text-[#A67C52] font-bold uppercase tracking-widest">Selesaikan Transaksi Sekarang</p>
            </div>

            {/* Content */}
            <div className="p-6 pb-2">
              <div className="bg-[#FDF8F5] border border-[#EADDCF] rounded-[1.5rem] p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">Total Bayar</span>
                  <span className="text-xl font-black text-[#D9774B]">{rp(total)}</span>
                </div>
                <div className="h-[1px] w-full bg-[#EADDCF]" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">Metode</span>
                  <span className="text-[10px] font-black text-[#5D4A41] uppercase bg-white px-2 py-1 rounded-md border border-[#EADDCF]">{payMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">Layanan</span>
                  <span className="text-[10px] font-black text-[#5D4A41] uppercase">{orderMode === "dine-in" ? `Meja ${selectedTable}` : "Take Away"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">Total Item</span>
                  <span className="text-[10px] font-black text-[#5D4A41]">{cart.reduce((sum, item) => sum + item.qty, 0)} Item</span>
                </div>
              </div>

              {payMethod === "Debit" && (
                <div className="mt-4 bg-[#EBF5FF] border border-[#BEE3F8] rounded-[1.5rem] p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#3182CE]/10 flex items-center justify-center shrink-0">
                    <Wallet size={16} className="text-[#3182CE]" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-[#2B6CB0] uppercase tracking-widest mb-1">Instruksi Pembayaran</h4>
                    <p className="text-[10px] text-[#4299E1] font-medium leading-relaxed">
                      Silakan arahkan pelanggan untuk melakukan *tap* atau gesek kartu ke mesin EDC yang tersedia.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 flex gap-3">
              <button
                onClick={() => setShowPayConfirm(false)}
                className="w-1/3 py-3.5 rounded-2xl bg-[#F5EFE6] text-[#A67C52] text-[10px] font-bold uppercase tracking-widest hover:bg-[#EADDCF] hover:text-[#5D4A41] transition-all shadow-sm"
              >
                Batal
              </button>
              <button
                onClick={processPayment}
                disabled={saving}
                className="w-2/3 py-3.5 rounded-2xl bg-green-500 text-white text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-green-600 active:scale-95 disabled:opacity-50 disabled:hover:bg-green-500 transition-all flex items-center justify-center gap-2"
              >
                {saving ? "Memproses..." : <><CheckCircle2 size={16} /> Ya, Proses</>}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <SplitBillModal 
        isOpen={isSplitBillOpen}
        onClose={() => setIsSplitBillOpen(false)}
        originalCart={originalCartForSplit}
        onApply={(splitCart) => {
          setCart(splitCart);
          toast.success("Bill berhasil di-split", { position: 'bottom-center' });
        }}
      />

      <TambahItemModal
        isOpen={isTambahItemOpen}
        onClose={() => setIsTambahItemOpen(false)}
        menuItems={menuItems}
        onAddItem={(item) => {
          setCart(prev => {
            const existing = prev.find(p => p.id === item.id);
            if (existing) return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
            return [...prev, { ...item, qty: 1 }];
          });
          toast.success(`${item.name} ditambahkan`, { position: 'bottom-center' });
        }}
      />

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
