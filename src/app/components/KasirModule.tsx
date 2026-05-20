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
  Printer, ShoppingBag, X, Clock, Flame, XCircle, AlertTriangle,
  Calendar, CalendarCheck, Users
} from "lucide-react";
import { rp, menuCategories, APP_LOGO } from "../data";
import { supabase } from "../../lib/supabase";

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
        setOrderMode((targetOrder.orderMode || "dine-in") as "dine-in" | "take-away");
        setIsCartOpen(true);
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
  const [processedOrderIds, setProcessedOrderIds] = useState<string[]>([]);

  // Listen to printer connection status changes
  useEffect(() => {
    const unsub = printService.onConnectionChange((connected) => {
      setPrinterConnected(connected);
    });
    return unsub;
  }, []);

  // --- Reservations Real-time Notification States ---
  const [reservations, setReservations] = useState<any[]>([]);
  const [showReservationsModal, setShowReservationsModal] = useState(false);

  useEffect(() => {
    let activeChannel: any = null;

    async function setupReservations() {
      try {
        const { data, error } = await supabase
          .from("reservations")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) {
          if (error.code === "PGRST205") {
            console.warn("[ROBUST FALLBACK] Table 'reservations' is missing in DB schema. Skipping realtime subscription.");
            return;
          }
          throw error;
        }
        
        if (data) setReservations(data);

        // Only subscribe if table exists
        activeChannel = supabase
          .channel("kasir-reservations-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "reservations" },
            (payload) => {
              if (payload.eventType === "INSERT") {
                setReservations((prev) => [payload.new, ...prev]);
                if (payload.new.status === "pending") {
                  toast.info(`Reservasi Baru: ${payload.new.name} (${payload.new.type})`, {
                    position: "top-right",
                    duration: 5000,
                  });
                  if ("speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(`Ada reservasi baru atas nama ${payload.new.name}`);
                    utterance.lang = "id-ID";
                    
                    const rate = parseFloat(localStorage.getItem("pawon_tts_rate") || "0.95");
                    const pitch = parseFloat(localStorage.getItem("pawon_tts_pitch") || "1.15");
                    const preferredVoiceName = localStorage.getItem("pawon_tts_voice_name") || "";
                    
                    utterance.rate = rate;
                    utterance.pitch = pitch;
                    
                    const voices = window.speechSynthesis.getVoices();
                    let selectedVoice = preferredVoiceName 
                      ? voices.find(v => v.name === preferredVoiceName)
                      : null;
                    if (!selectedVoice) {
                      const idVoices = voices.filter(v => v.lang === "id-ID" || v.lang.startsWith("id"));
                      selectedVoice = idVoices.find(v => 
                        v.name.includes("Gadis") || 
                        v.name.includes("Google") || 
                        v.name.toLowerCase().includes("female")
                      ) || idVoices[0];
                    }
                    if (selectedVoice) {
                      utterance.voice = selectedVoice;
                    }
                    
                    window.speechSynthesis.speak(utterance);
                  }
                }
              } else if (payload.eventType === "UPDATE") {
                setReservations((prev) =>
                  prev.map((r) => (r.id === payload.new.id ? payload.new : r))
                );
              } else if (payload.eventType === "DELETE") {
                setReservations((prev) => prev.filter((r) => r.id === payload.old.id));
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.warn("Failed to fetch reservations in KasirModule:", err);
      }
    }

    setupReservations();

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, []);

  async function handleUpdateReservationStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Reservasi berhasil di-${newStatus === "approved" ? "setujui" : "tolak"}`);
    } catch (err) {
      console.error("Failed to update reservation status:", err);
      toast.error("Gagal mengupdate status reservasi. Coba lagi.");
    }
  }

  const pendingReservations = reservations.filter((r) => r.status === "pending");

  const mockOrders: Order[] = [
    {
      id: "O-1001",
      tableId: "A1",
      items: [
        { id: "menu_006", name: "GULAI MANGUT SEMARANG", price: 35000, qty: 1, available: true, category: "Makanan", image: "https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Gulai_Mangut_Semarang.png" },
        { id: "menu_029", name: "ES TEH", price: 5000, qty: 1, available: true, category: "Minuman", image: "https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Es%20Teh.jpg" }
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
        { id: "menu_010", name: "TAHU GIMBAL SEMARANG", price: 25000, qty: 2, available: true, category: "Makanan", image: "https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Tahu_Gimbal_Semarang.jpg" },
        { id: "menu_018", name: "NIPIS MADU", price: 12000, qty: 2, available: true, category: "Minuman", image: "https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Nipis%20Madu.png" }
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

  const activeServedOrders = (orders && orders.length > 0 ? orders : mockOrders)
    .filter(o => o.status === "served" && !processedOrderIds.includes(o.id));

  useEffect(() => {
    if (activeServedOrders.length === 0 && !paid) {
      setCart([]);
      setCurrentPayingOrderId(null);
      localStorage.removeItem("pawon_cart");
    }
  }, [activeServedOrders.length, paid]);

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
        setProcessedOrderIds(prev => [...prev, currentPayingOrderId]);
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
    <div className="relative h-full lg:h-[calc(100vh-160px)] flex flex-col lg:flex-row gap-6">
      {/* Dynamic Keyframes for Glow Light Notification */}
      <style>{`
        @keyframes pulse-glow-light {
          0%, 100% {
            box-shadow: 0 0 5px rgba(249, 115, 22, 0.4), inset 0 0 2px rgba(249, 115, 22, 0.2);
            border-color: rgba(249, 115, 22, 0.4);
            opacity: 0.9;
          }
          50% {
            box-shadow: 0 0 20px rgba(249, 115, 22, 0.95), inset 0 0 10px rgba(249, 115, 22, 0.4);
            border-color: rgba(249, 115, 22, 0.9);
            background-color: rgba(249, 115, 22, 0.25);
            opacity: 1;
          }
        }
        .animate-glow-light {
          animation: pulse-glow-light 1.5s infinite ease-in-out;
        }
      `}</style>

      {/* Active Bills Area */}
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        {/* Title for Kasir Bills */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-xs uppercase tracking-wider">
            Antrean Pembayaran (Siap Cetak)
          </div>

          {pendingReservations.length > 0 && (
            <button
              onClick={() => setShowReservationsModal(true)}
              className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/40 text-orange-400 font-black text-xs uppercase tracking-wider animate-glow-light flex items-center gap-2 transition-all duration-300"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              <Calendar size={13} className="animate-bounce" />
              <span>{pendingReservations.length} Reservasi Baru</span>
            </button>
          )}
          
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
          {(() => {
            if (activeServedOrders.length === 0) {
              return (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground gap-4 bg-card/20 border border-dashed border-border/40 rounded-3xl p-8 animate-in fade-in duration-500">
                  <div className="w-16 h-16 bg-secondary/50 rounded-full border border-border/40 flex items-center justify-center shadow-inner">
                    <CheckCircle2 size={24} className="text-muted-foreground/45" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-black text-xs uppercase tracking-[0.2em] text-foreground/75">Semua Tagihan Selesai</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Tidak ada antrean pembayaran yang perlu diproses.</p>
                  </div>
                </div>
              );
            }
            return activeServedOrders.map(order => {
              const cfg = orderStatusConfig[order.status];
              return (
              <div
                role="button"
                key={order.id}
                onClick={() => {
                  setCart(order.items);
                  setSelectedTable(order.tableId || "");
                  setCurrentPayingOrderId(order.id);
                  setOrderMode((order.orderMode || "dine-in") as "dine-in" | "take-away");
                  setIsCartOpen(true);
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
          });
        })()}
      </div>
      </div>

      {/* Floating Action Button: Lanjut Bayar (Only visible on mobile/tablet) */}
      <button
        onClick={() => setIsCartOpen(true)}
        className={`fixed bottom-[calc(2rem+var(--safe-area-bottom))] right-6 left-6 lg:left-auto z-40 flex lg:hidden items-center justify-between px-8 py-4 rounded-3xl bg-primary text-white shadow-[0_20px_50px_rgba(232,119,34,0.4)] hover:scale-105 active:scale-95 transition-all animate-in zoom-in duration-500 ${cart.length === 0 ? "scale-0" : "scale-100"
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

      {/* Checkout Drawer Overlay (Only on mobile/tablet) */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/ backdrop-blur-sm z-[50] animate-in fade-in duration-300 lg:hidden"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Checkout Drawer / Sidebar */}
      {cart.length > 0 && (
        <div className={`fixed inset-y-0 right-0 h-full w-full sm:w-[400px] lg:w-[420px] bg-[#f4efe9] border-l border-[#dfd3c3] shadow-2xl z-[60] transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCartOpen ? "translate-x-0" : "translate-x-full"
          } lg:relative lg:translate-x-0 lg:shadow-none lg:border lg:border-[#dfd3c3] lg:rounded-[32px] lg:z-10 flex flex-col h-[calc(100vh-160px)] animate-in slide-in-from-right duration-500 text-[#4e3629]`}>
        <div className="p-6 border-b border-[#dfd3c3] flex items-center justify-between bg-[#ece3d5]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#e3d7c5] rounded-2xl shadow-sm">
              <ShoppingCart size={20} className="text-[#a76d33]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#4e3629] uppercase tracking-widest font-poppins">Pengelola Tagihan</h3>
              <p className="text-[9px] text-[#a76d33] font-bold uppercase tracking-tighter mt-1">Siap diproses pembayaran</p>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-[#e3d7c5] rounded-xl text-[#a76d33] hover:text-[#4e3629] transition-all lg:hidden"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-6 border-b border-[#dfd3c3] bg-transparent space-y-4">
            {orderMode === "dine-in" && (
              <div>
                <label className="text-[9px] font-black text-[#a76d33] uppercase tracking-[0.2em] mb-2 block ml-1">Meja Pelayanan</label>
                <div className="relative group">
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full bg-[#fcfbfa] border border-[#dfd3c3] rounded-2xl px-5 py-3 text-xs font-black text-[#4e3629] focus:outline-none focus:ring-2 focus:ring-[#a76d33]/20 focus:border-[#a76d33] transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#fcfbfa]">-- PILIH NOMOR MEJA --</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.id} className="bg-[#fcfbfa]">MEJA {t.id}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#a76d33]">
                    <Clock size={14} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between bg-[#ece3d5]/40 border border-[#dfd3c3] rounded-2xl px-5 py-3.5">
              <span className="text-[9px] font-black text-[#a76d33] uppercase tracking-[0.2em]">Tipe Layanan</span>
              <span className="text-xs font-black text-primary uppercase tracking-widest font-poppins">
                {orderMode === "dine-in" ? "Dine In" : "Take Away"}
              </span>
            </div>
          </div>

          {paid ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center animate-bounce border border-green-500/20">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <div className="space-y-2">
                <h4 className="font-black text-2xl text-[#4e3629] uppercase tracking-tighter">Transaksi Berhasil</h4>
                <p className="text-xs text-[#a76d33] font-medium">Struk telah dimasukkan ke antrean cetak</p>
              </div>

              {lastTxId && (
                <div className="bg-[#ece3d5] px-6 py-3 rounded-2xl border border-[#dfd3c3]">
                  <p className="text-[9px] font-black text-[#a76d33] uppercase tracking-[0.2em] mb-1">Kode Transaksi</p>
                  <p className="text-xs font-mono font-black text-primary tracking-widest">{lastTxId}</p>
                </div>
              )}

              <div className="w-full flex flex-col gap-5 pt-4">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-[#a76d33] uppercase tracking-widest text-left ml-1">Layanan Cetak Ulang</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button type="button" onClick={(e) => handlePrintReceipt(e)} className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                      <Printer size={18} /> Struk Pelanggan
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={(e) => handlePrintKitchenReceipt(e)} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all">
                        <ChefHat size={16} /> Struk Dapur
                      </button>
                      <button type="button" onClick={(e) => handlePrintClosingReport(e)} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#a76d33] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#8b5a2b] transition-all">
                        <Save size={16} /> Laporan Penutupan
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <div className="h-[1px] flex-1 bg-[#dfd3c3]"></div>
                  <span className="text-[9px] font-black text-[#a76d33] uppercase tracking-widest">Ekspor Dokumen Digital</span>
                  <div className="h-[1px] flex-1 bg-[#dfd3c3]"></div>
                </div>

                <div className="grid grid-cols-2 gap-3 opacity-85">
                   <button onClick={() => handlePrintPDF('customer')} className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#dfd3c3] text-[9px] font-black text-[#a76d33] uppercase tracking-widest hover:bg-[#ece3d5] bg-white transition-all">PDF Pelanggan</button>
                   <button onClick={() => handlePrintPDF('kitchen')} className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#dfd3c3] text-[9px] font-black text-[#a76d33] uppercase tracking-widest hover:bg-[#ece3d5] bg-white transition-all">PDF Utama</button>
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
                ← Beranda Utama
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#a76d33] gap-6">
                    <div className="w-20 h-20 bg-[#ece3d5] rounded-full border-2 border-dashed border-[#dfd3c3] flex items-center justify-center">
                      <ShoppingCart size={32} className="opacity-20" />
                    </div>
                    <p className="font-black text-xs uppercase tracking-[0.3em] opacity-35">Keranjang Kosong</p>
                  </div>
                ) : cart.map(c => (
                  <div key={c.id} className="flex items-center gap-4 bg-white/70 border border-[#dfd3c3] rounded-3xl p-3 group hover:border-[#a76d33]/50 transition-all duration-500">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border border-[#dfd3c3]">
                      <img
                        src={
                          (menuItems.find(m => m.id === c.id) || 
                           menuItems.find(m => m.name.toLowerCase() === c.name.toLowerCase()))?.image || 
                          c.image || 
                          APP_LOGO
                        }
                        alt={c.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-[#4e3629] leading-tight uppercase tracking-tight line-clamp-1">{c.name}</p>
                      <p className="text-[10px] text-primary font-black mt-1 font-mono tracking-tighter">{rp(c.price)}</p>
                    </div>
                    <div className="flex items-center justify-center bg-white/90 border border-[#dfd3c3] rounded-xl px-3.5 py-1.5 shadow-sm">
                      <span className="text-xs font-black text-[#4e3629]">{c.qty} Porsi</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-[#dfd3c3] bg-[#ece3d5]/50 space-y-5 rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.03)]">
                <div className="space-y-4">
                  <button onClick={() => setIsPromoModalOpen(true)} className="w-full h-12 flex items-center justify-between px-5 rounded-2xl bg-[#fcfbfa] border border-[#dfd3c3] text-[10px] font-black text-[#a76d33] hover:text-[#4e3629] transition-all group">
                    <div className="flex items-center gap-3">
                      <Tag size={14} className="text-primary group-hover:scale-110 transition-transform" />
                      <span className="uppercase tracking-widest">{selectedPromo ? selectedPromo.name : "Terapkan Voucher"}</span>
                    </div>
                    <Plus size={14} />
                  </button>

                  <div className="space-y-2 bg-[#fcfbfa] p-5 rounded-3xl border border-[#dfd3c3]">
                    <div className="flex justify-between text-[10px] text-[#a76d33] font-bold uppercase tracking-widest"><span>Total Kotor</span><span>{rp(subtotal)}</span></div>
                    {discountAmount > 0 && <div className="flex justify-between text-[10px] text-red-500 font-black italic uppercase tracking-widest"><span>Potongan Promo</span><span>-{rp(discountAmount)}</span></div>}
                    <div className="flex justify-between text-[10px] text-[#a76d33] font-bold uppercase tracking-widest"><span>Pajak (10%)</span><span>{rp(tax)}</span></div>
                    <div className="flex justify-between items-center border-t border-[#dfd3c3] pt-4 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#4e3629]">TOTAL</span>
                      <span className="text-base font-black text-primary font-['Poppins'] tracking-tighter">{rp(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black text-[#a76d33] uppercase tracking-[0.3em] text-center">Metode Pembayaran</p>
                  <div className="grid grid-cols-4 gap-2">
                    {payMethods.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setPayMethod(m.id)}
                        className={`flex flex-col items-center justify-center gap-2 py-3 rounded-2xl border transition-all duration-300 ${payMethod === m.id ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105 glow-primary" : "bg-[#fcfbfa] border-[#dfd3c3] text-[#a76d33] hover:bg-[#f3ece2]"
                          }`}
                      >
                        <div className={`${payMethod === m.id ? "text-white" : "text-[#a76d33]"}`}>{m.icon}</div>
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
                  {saving ? "Memproses..." : "Proses Bayar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}

      {/* Payment Confirmation Dialog */}
      {showPayConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setShowPayConfirm(false)}>
          <div className="bg-[#f4efe9] border border-[#dfd3c3] rounded-[28px] w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(78,54,41,0.15)] animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[#dfd3c3] text-center bg-[#ece3d5]/30">
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-primary animate-pulse" />
              </div>
              <h3 className="font-black text-sm text-[#4e3629] uppercase tracking-widest font-poppins">Konfirmasi Pembayaran</h3>
              <p className="text-[9px] text-[#a76d33] font-bold uppercase tracking-tighter mt-1">Pastikan seluruh data pesanan telah sesuai</p>
            </div>
            
            <div className="px-6 py-5">
              <div className="bg-[#ece3d5]/50 border border-[#dfd3c3] p-4 rounded-2xl relative space-y-3 overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-[#a76d33] font-black uppercase tracking-widest">Total Bayar</span>
                  <span className="text-sm font-black text-primary font-['Poppins'] tracking-tighter">{rp(total)}</span>
                </div>
                
                <div className="border-t border-dashed border-[#dfd3c3] my-1" />

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#a76d33] font-bold uppercase tracking-widest">Metode</span>
                  <span className="font-black text-[#4e3629] uppercase tracking-wider">{payMethod}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#a76d33] font-bold uppercase tracking-widest">Layanan</span>
                  <span className="font-black text-[#4e3629] uppercase tracking-wider">{orderMode === "take-away" ? "Take Away" : `Meja ${selectedTable || "-"}`}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#a76d33] font-bold uppercase tracking-widest">Total Item</span>
                  <span className="font-black text-[#4e3629] uppercase tracking-wider">{cart.reduce((s, c) => s + c.qty, 0)} Porsi</span>
                </div>

                <div className="border-b border-dashed border-[#dfd3c3] my-1" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#dfd3c3] flex gap-3 bg-[#ece3d5]/10">
              <button
                onClick={() => setShowPayConfirm(false)}
                className="flex-1 py-3.5 rounded-xl border border-[#dfd3c3] text-xs font-black uppercase tracking-wider text-[#a76d33] hover:text-[#4e3629] hover:bg-[#ece3d5] transition-all duration-300"
              >
                Batal
              </button>
              <button
                onClick={processPayment}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
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

      {/* Reservations Management Modal */}
      {showReservationsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setShowReservationsModal(false)}>
          <div className="bg-[#f4efe9] border border-[#dfd3c3] rounded-[28px] w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(78,54,41,0.15)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[#dfd3c3] flex items-center justify-between bg-[#ece3d5]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                  <CalendarCheck size={18} className="text-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#4e3629] uppercase tracking-widest font-poppins">Daftar Reservasi Pending</h3>
                  <p className="text-[9px] text-[#a76d33] font-bold uppercase tracking-tighter mt-1">Konfirmasi pengajuan meja &amp; acara tamu</p>
                </div>
              </div>
              <button
                onClick={() => setShowReservationsModal(false)}
                title="Tutup"
                className="p-2 hover:bg-[#e3d7c5] rounded-xl text-[#a76d33] hover:text-[#4e3629] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
              {pendingReservations.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 bg-[#ece3d5]/50 rounded-full border border-[#dfd3c3] flex items-center justify-center mx-auto">
                    <CheckCircle2 size={20} className="text-[#a76d33]" />
                  </div>
                  <p className="text-xs text-[#a76d33] font-semibold">Tidak ada reservasi pending saat ini.</p>
                </div>
              ) : (
                pendingReservations.map((res) => (
                  <div key={res.id} className="bg-white/70 border border-[#dfd3c3] rounded-2xl p-4 space-y-3 relative hover:border-[#a76d33]/50 transition-all duration-300 animate-in slide-in-from-bottom-5 duration-355">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter bg-primary/10 border-primary/20 text-primary">
                          {res.type || "Reservasi"}
                        </span>
                        <h4 className="font-bold text-xs text-[#4e3629] mt-1.5 uppercase font-poppins">{res.name}</h4>
                        <p className="text-[10px] text-[#a76d33] font-semibold mt-0.5">{res.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-primary font-black font-mono block">{res.date}</span>
                        <span className="text-[9px] text-[#a76d33] font-semibold block">{res.time} WIB</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#ece3d5]/50 border border-[#dfd3c3] rounded-xl p-2.5">
                      <div className="flex items-center gap-1.5 text-[#4e3629]">
                        <Users size={12} className="text-primary flex-shrink-0" />
                        <span>Kapasitas: <strong className="text-[#4e3629]">{res.guests} orang</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#4e3629]">
                        <Clock size={12} className="text-primary flex-shrink-0" />
                        <span>Status: <strong className="text-yellow-600 capitalize">{res.status}</strong></span>
                      </div>
                    </div>

                    {res.notes && (
                      <div className="text-[10px] text-[#4e3629] bg-[#fcfbfa] p-2.5 rounded-xl border border-[#dfd3c3]">
                        <span className="font-black text-[8px] uppercase tracking-wider text-primary block mb-0.5">Catatan Khusus:</span>
                        <span className="italic leading-relaxed">"{res.notes}"</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1.5">
                      <button
                        onClick={() => handleUpdateReservationStatus(res.id, "rejected")}
                        className="flex-1 py-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => handleUpdateReservationStatus(res.id, "approved")}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.01] transition-all"
                      >
                        Setujui
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
