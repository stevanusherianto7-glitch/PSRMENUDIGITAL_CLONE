/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI BUKU MENU DIGITAL TAMU (QR SCAN → PESAN → KERANJANG → STATUS).
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN TAMU TIDAK BISA MEMESAN DARI MEJA. ⚠️
 */
import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  ShoppingCart, Plus, Minus, Trash2, X, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, ChefHat, UtensilsCrossed, Scan, RefreshCw,
  Utensils, ShoppingBag, Sparkles, MapPin, ClipboardList, AlertCircle
} from "lucide-react";
import { SEED_MENU, menuCategories, rp, BRAND_NAME, APP_LOGO as logoImg } from "../data";
import { supabase } from "../../lib/supabase";
import { createOrder, fetchOrders, deleteOrder, updateOrder } from "../api";
import type { MenuItem, CartItem, Order, OrderMode } from "../types";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useThemeStore } from "../hooks/useThemeStore";

type View = "menu" | "cart" | "status";

function OptimizedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div className="relative w-full h-full overflow-hidden bg-secondary/40">
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/30 via-secondary/60 to-secondary/30 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`${className} transition-all duration-500 ease-out ${
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      />
    </div>
  );
}

export default function GuestMenuPage() {
  const { isDark } = useThemeStore();
  const { tableId } = useParams<{ tableId: string }>();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(SEED_MENU);
  const [category, setCategory] = useState("Makanan");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>("menu");
  const [notes, setNotes] = useState("");
  const [orderMode, setOrderMode] = useState<OrderMode>("dine-in");
  const [placing, setPlacing] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeMode, setWelcomeMode] = useState<OrderMode>("dine-in");
  const [welcomeStep, setWelcomeStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [resetting, setResetting] = useState(false);

  const filtered = menuItems.filter(m => m.category === category);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  useEffect(() => {
    async function loadMenu() {
      setLoading(true);
      try {
        const { data } = await supabase.from("menu_items").select("*");
        if (data && data.length > 0) {
          const dbById = new Map(data.map((r: any) => [r.id, r]));
          const merged: MenuItem[] = SEED_MENU.map(seed => {
            const r: any = dbById.get(seed.id);
            if (!r) return seed;
            return {
              ...seed,
              name: r.name || seed.name,
              category: r.category || seed.category,
              price: typeof r.price === "number" ? r.price : seed.price,
              image: r.image && (String(r.image).startsWith("http") || String(r.image).startsWith("blob")) ? r.image : seed.image,
              available: typeof r.available === "boolean" ? r.available : seed.available,
              tag: r.tag || seed.tag || undefined,
              description: r.description || seed.description || "",
            };
          });
          const seedIds = new Set(SEED_MENU.map(m => m.id));
          const extras: MenuItem[] = data
            .filter((r: any) => !seedIds.has(r.id))
            .map((r: any) => ({
              id: r.id,
              name: r.name,
              category: r.category,
              price: r.price,
              image: r.image && (String(r.image).startsWith("http") || String(r.image).startsWith("blob")) ? r.image : "",
              available: r.available,
              tag: r.tag || undefined,
              description: r.description || "",
            }));
          setMenuItems([...merged, ...extras].filter(m => m.available));
        }
      } catch (e) {
        setMenuItems(SEED_MENU.filter(m => m.available));
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, []);

  const loadMyOrders = useCallback(async () => {
    if (!tableId) {
      setTableError(true);
      return;
    }
    try {
      const orders = await fetchOrders(undefined, tableId);
      
      // Ambil list order yang telah di-clear secara lokal oleh guest
      const clearedJson = localStorage.getItem(`cleared_orders_${tableId}`);
      const clearedIds: string[] = clearedJson ? JSON.parse(clearedJson) : [];

      const active = orders.filter(o =>
        o.status !== "cancelled" && o.status !== "served" && !clearedIds.includes(o.id)
      );
      
      setMyOrders(prev => {
        // Gabungkan order yang baru saja dibuat (di memori) tapi belum terindeks oleh Supabase fetch
        const now = Date.now();
        const recentLocalOrders = prev.filter(p => 
          !active.some(a => a.id === p.id) && 
          (now - new Date(p.created_at).getTime()) < 10000 // Kurang dari 10 detik
        );
        
        if (recentLocalOrders.length > 0) {
          return [...recentLocalOrders, ...active].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
        return active;
      });
      // Cache ke localStorage untuk offline fallback
      if (active.length > 0) {
        localStorage.setItem(`guest_orders_${tableId}`, JSON.stringify(active));
      }
    } catch (e) {
      console.warn("loadMyOrders error, showing cache:", e);
      try {
        const cached = localStorage.getItem(`guest_orders_${tableId}`);
        if (cached) {
          setMyOrders(JSON.parse(cached));
        }
      } catch (_) { /* ignore */ }
    }
  }, [tableId]);

  // Load localStorage cache instantly on mount
  useEffect(() => {
    if (tableId) {
      try {
        const cached = localStorage.getItem(`guest_orders_${tableId}`);
        if (cached) {
          setMyOrders(JSON.parse(cached));
        }
      } catch (_) { /* ignore */ }
    }
  }, [tableId]);

  useEffect(() => {
    loadMyOrders();
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh && view === "status") {
      interval = setInterval(loadMyOrders, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadMyOrders, autoRefresh, view]);

  function addToCart(item: MenuItem) {
    if (!item.available) return;
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      return ex ? prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { ...item, qty: 1 }];
    });
    setSelectedItem(null);
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  }

  async function placeOrder() {
    if (!tableId) {
      setTableError(true);
      return;
    }
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const order = await createOrder({
        tableId,
        items: cart,
        subtotal,
        total: total,
        notes,
        orderMode,
        type: "guest",
      });
      setMyOrders(prev => [order, ...prev]);
      setCart([]);
      setNotes("");
      setOrderMode("dine-in");
      setView("status");
    } catch (e) {
      console.error("createOrder error:", e);
    }
    setPlacing(false);
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string; neonBorder: string; icon: React.ReactNode; step: number }> = {
    pending: { 
      label: "Menunggu Konfirmasi", 
      color: "text-primary dark:drop-shadow-[0_0_8px_rgba(232,119,34,0.5)]", 
      bg: "bg-primary/10 border-primary/30", 
      neonBorder: "dark:shadow-[0_0_20px_rgba(232,119,34,0.2)] border-b border-b-primary/30", 
      icon: <Clock size={16} className="text-primary" />, 
      step: 1 
    },
    cooking: { 
      label: "Sedang Dimasak", 
      color: "text-orange-600 dark:text-orange-400 dark:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]", 
      bg: "bg-orange-500/10 dark:bg-orange-950/20 border-orange-500/30", 
      neonBorder: "dark:shadow-[0_0_20px_rgba(249,115,22,0.2)] border-b border-b-orange-500/30", 
      icon: <ChefHat size={16} className="text-orange-600 dark:text-orange-400" />, 
      step: 2 
    },
    ready: { 
      label: "Siap Diantar", 
      color: "text-blue-600 dark:text-blue-400 dark:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]", 
      bg: "bg-blue-500/10 dark:bg-blue-950/20 border-blue-500/30", 
      neonBorder: "dark:shadow-[0_0_20px_rgba(59,130,246,0.2)] border-b border-b-blue-500/30", 
      icon: <UtensilsCrossed size={16} className="text-blue-600 dark:text-blue-400" />, 
      step: 3 
    },
    served: { 
      label: "Sudah Disajikan", 
      color: "text-green-600 dark:text-green-400 dark:drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]", 
      bg: "bg-green-500/10 dark:bg-green-950/20 border-green-500/30", 
      neonBorder: "dark:shadow-[0_0_20px_rgba(34,197,94,0.2)] border-b border-b-green-500/30", 
      icon: <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />, 
      step: 4 
    },
  };

  function handleStartOrder() {
    setOrderMode(welcomeMode);
    setShowWelcome(false);
  }

  async function handleResetActiveOrders() {
    if (myOrders.length === 0) return;
    const confirmReset = window.confirm(
      "PERINGATAN: Apakah Anda yakin ingin mereset dan menghapus semua pesanan aktif di meja ini?\n\nSemua pesanan yang sedang diproses atau dimasak akan dihapus secara permanen!"
    );
    if (!confirmReset) return;

    setResetting(true);
    try {
      // 1. Simpan ID pesanan yang di-clear ke localStorage agar terfilter dari layar guest ini secara instan
      const clearedJson = localStorage.getItem(`cleared_orders_${tableId}`);
      const clearedIds: string[] = clearedJson ? JSON.parse(clearedJson) : [];
      const newCleared = [...new Set([...clearedIds, ...myOrders.map(o => o.id)])];
      localStorage.setItem(`cleared_orders_${tableId}`, JSON.stringify(newCleared));

      // 2. Hubungi backend secara background (best-effort) untuk membatalkan
      try {
        await Promise.all(myOrders.map(o => updateOrder(o.id, { status: "cancelled" })));
      } catch (err) {
        console.warn("Could not cancel on backend (RLS block/offline), kept in local cleared storage:", err);
      }

      setMyOrders([]);
      localStorage.removeItem(`guest_orders_${tableId}`);
      
      // Mengumumkan reset sukses lewat Text-to-Speech (Suara Andika Remaja)
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Semua pesanan aktif di meja ini telah berhasil dibersihkan.");
        utterance.lang = "id-ID";
        utterance.pitch = 1.35; // Pitch tinggi agar Andika terdengar muda (remaja)
        utterance.rate = 1.1; // Sedikit lebih cepat khas gaya bicara remaja yang dinamis
        
        // Muat daftar suara
        const voices = window.speechSynthesis.getVoices();
        
        const selectAndikaVoice = (vList: SpeechSynthesisVoice[]) => {
          const idVoices = vList.filter(v => v.lang === "id-ID" || v.lang.startsWith("id"));
          return idVoices.find(v => 
            v.name.includes("Andika") || 
            v.name.toLowerCase().includes("male") ||
            v.name.includes("Microsoft Andika")
          ) || idVoices[0];
        };

        const selectedVoice = selectAndikaVoice(voices);

        // Fallback jika suara belum ter-preload (umum di Chrome/Windows)
        if (!selectedVoice && voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            const reloadedVoices = window.speechSynthesis.getVoices();
            const voice = selectAndikaVoice(reloadedVoices);
            if (voice) {
              utterance.voice = voice;
              window.speechSynthesis.speak(utterance);
            }
          };
        } else {
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
          window.speechSynthesis.speak(utterance);
        }
      }
      
      alert("Pesanan aktif berhasil dibersihkan.");
    } catch (e) {
      console.error("Gagal mereset pesanan:", e);
      alert("Terjadi kesalahan saat mereset beberapa pesanan. Silakan coba lagi.");
    } finally {
      setResetting(false);
    }
  }

  if (tableError || !tableId || !tableId.trim()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">QR Code Tidak Valid</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Maaf, kode QR yang Anda scan tidak memiliki informasi meja. Silakan scan QR code yang valid dari meja.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-24">

      {/* ── Welcome Modal ───────────────────────────────────────────── */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div
            className="bg-card w-full max-w-md rounded-2xl overflow-hidden mx-4 shadow-2xl"
          >
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            {welcomeStep === 1 && (
              <div className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-3 flex items-center justify-center gap-6">
                    <img
                      src={logoImg}
                      alt={BRAND_NAME}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-foreground/10 shadow-sm"
                    />
                    <img 
                      src="https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/logo/logo_halal.png" 
                      alt="Sertifikat Halal" 
                      className={`h-16 w-auto object-contain transition-all duration-500 ${isDark ? 'halal-shift-dark' : 'halal-shift-light'}`}
                    />
                  </div>
                  <h2
                    className="text-xl font-extrabold text-foreground leading-tight font-poppins"
                  >
                    Selamat Datang di<br />
                    <span className="text-primary">{BRAND_NAME}!</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Sajian Otentik Khas Semarang yang kini hadir lebih dekat.<br />
                    Resmi bersertifikat **Halal** & Tanpa MSG. Selamat menikmati!
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Nomor Meja Anda</p>
                    <p className="text-lg font-extrabold text-primary font-poppins">
                      Meja {tableId}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-[10px] bg-green-500/15 border border-green-500/25 text-green-400 font-semibold px-2 py-1 rounded-full">
                      ✓ Terverifikasi
                    </span>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider">
                    Pilih Tipe Pesanan
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: "dine-in" as OrderMode,
                        label: "Dine In",
                        sub: "Makan di tempat",
                        emoji: "🪑",
                      },
                      {
                        id: "take-away" as OrderMode,
                        label: "Take Away",
                        sub: "Dibawa pulang",
                        emoji: "🛍️",
                      },
                    ].map(m => (
                      <div key={m.id} className={`kenny-container noselect ${welcomeMode === m.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-[20px]' : 'opacity-70 hover:opacity-100'}`}>
                        <div className="kenny-canvas" onClick={() => setWelcomeMode(m.id)}>
                          {[...Array(25)].map((_, i) => (
                            <div key={i} className={`kenny-tracker tr-${i + 1}`}></div>
                          ))}
                          <div className="kenny-card">
                            <div className="kenny-prompt flex flex-col items-center justify-center w-full h-full absolute inset-0">
                              <span className="text-3xl mb-2">{m.emoji}</span>
                              <p className="text-sm font-bold text-white">{m.label}</p>
                              <p className="text-[10px] text-white/80">{m.sub}</p>
                              {welcomeMode === m.id && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-white/30 backdrop-blur-md">
                                  <CheckCircle2 size={12} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="kenny-title flex flex-col items-center justify-center w-full h-full absolute inset-0">
                              <span className="text-4xl mb-2">{m.emoji}</span>
                              <p className="text-lg font-bold text-white">{m.label}</p>
                              {welcomeMode === m.id && (
                                <div className="mt-2 w-6 h-6 rounded-full flex items-center justify-center bg-white/30 backdrop-blur-md">
                                  <CheckCircle2 size={14} className="text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setWelcomeStep(2)}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Lanjut <ChevronRight size={16} />
                </button>
              </div>
            )}

            {welcomeStep === 2 && (
              <div className="p-6">
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mx-auto mb-3">
                    <ClipboardList size={22} className="text-amber-400" />
                  </div>
                  <h3
                    className="text-base font-extrabold text-foreground font-poppins"
                  >
                    Cara Memesan
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cukup 3 langkah mudah, pesanan langsung masuk dapur!
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    {
                      step: 1,
                      icon: "🍽️",
                      title: "Pilih Menu Favorit",
                      desc: "Tekan menu yang kamu inginkan, lihat foto & harga lengkap",
                      color: "bg-indigo-500/10 border-indigo-500/20",
                      numColor: "bg-indigo-500",
                    },
                    {
                      step: 2,
                      icon: "🛒",
                      title: "Masuk ke Keranjang",
                      desc: "Tambah qty, tulis catatan khusus untuk chef jika perlu",
                      color: "bg-orange-500/10 border-orange-500/20",
                      numColor: "bg-orange-500",
                    },
                    {
                      step: 3,
                      icon: "✅",
                      title: "Kirim Pesanan",
                      desc: "Tekan 'Pesan Sekarang' — pesanan langsung diterima dapur!",
                      color: "bg-green-500/10 border-green-500/20",
                      numColor: "bg-green-500",
                    },
                  ].map(s => (
                    <div
                      key={s.step}
                      className={`flex items-center gap-3 rounded-2xl border p-3.5 ${s.color}`}
                    >
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 ${s.numColor}`}>
                        {s.step}
                      </div>
                      <span className="text-xl flex-shrink-0">{s.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">{s.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-foreground/5 border border-foreground/10 rounded-xl px-3 py-2 mb-4">
                  <span className="text-base">{welcomeMode === "dine-in" ? "🪑" : "🛍️"}</span>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tipe pesanan dipilih</p>
                    <p className="text-xs font-bold text-foreground">
                      {welcomeMode === "dine-in" ? "Dine In — Makan di tempat" : "Take Away — Dibawa pulang"}
                    </p>
                  </div>
                  <button
                    onClick={() => setWelcomeStep(1)}
                    className="ml-auto text-[10px] text-primary hover:text-indigo-400 font-semibold"
                  >
                    Ubah
                  </button>
                </div>

                <button
                  onClick={handleStartOrder}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold text-sm hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                >
                  <Sparkles size={16} /> Mulai Pesan Sekarang!
                </button>

                <p className="text-center text-[10px] text-muted-foreground mt-3">
                  Meja {tableId} · {BRAND_NAME} · Semarang
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt={BRAND_NAME} className="w-9 h-9 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground font-poppins">{BRAND_NAME}</p>
            <p className="text-xs text-muted-foreground">Meja {tableId} · Scan & Order</p>
          </div>
          <div className="flex-shrink-0 mr-1">
            <img 
              src="https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/logo/logo_halal.png" 
              alt="Sertifikat Halal" 
              className={`h-[65px] w-auto object-contain transition-all duration-500 ${isDark ? 'halal-shift-dark' : 'halal-shift-light'}`}
              title="Restoran Bersertifikat Halal"
            />
          </div>
          {myOrders.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setView(view === "status" ? "menu" : "status")}
                className="flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full font-semibold"
              >
                <Clock size={12} /> {myOrders.length} Pesanan
              </button>
              <button
                onClick={handleResetActiveOrders}
                disabled={resetting}
                title="Reset pesanan aktif meja ini"
                className="w-8 h-8 rounded-full border border-border bg-secondary hover:bg-red-500/10 text-muted-foreground hover:text-red-400 disabled:opacity-40 transition-all flex items-center justify-center"
              >
                <Trash2 size={13} className={resetting ? "animate-spin" : ""} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Menu View */}
      {view === "menu" && (
        <div>
          <div className="flex gap-2 px-4 py-3 border-b border-border">
            {menuCategories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-1 px-4 py-2 rounded-full text-xs font-semibold transition-all text-center ${
                  category === c ? "bg-primary text-white" : "bg-secondary border border-border text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="p-4 grid grid-cols-2 gap-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                  <div className="relative aspect-[4/3] bg-secondary"></div>
                  <div className="p-2.5 space-y-2">
                    <div className="h-3 bg-secondary rounded w-3/4"></div>
                    <div className="h-4 bg-secondary rounded w-1/4"></div>
                  </div>
                </div>
              ))
            ) : (
              filtered.map(item => {
                const inCart = cart.find(c => c.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    disabled={!item.available}
                    className={`bg-card border rounded-xl overflow-hidden text-left transition-all active:scale-95 group ${
                      !item.available ? "opacity-40 cursor-not-allowed border-border" : "border-border hover:border-foreground/20 hover:shadow-md"
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                      <OptimizedImage src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105" />
                      {item.tag && (
                        <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {item.tag}
                        </span>
                      )}
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-primary font-bold text-sm mt-1 font-poppins">{rp(item.price)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Cart View */}
      {view === "cart" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <button title="Tutup Keranjang" onClick={() => setView("menu")} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
            <h2 className="font-bold text-base font-poppins">Keranjang Pesanan</h2>
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ShoppingCart size={40} className="opacity-20" />
              <p className="text-sm">Keranjang kosong</p>
              <button onClick={() => setView("menu")} className="text-xs text-primary font-semibold">
                Pilih menu
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Tipe Pesanan</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "dine-in", label: "Dine In", desc: "Makan di sini", icon: Utensils },
                    { id: "take-away", label: "Take Away", desc: "Dibawa pulang", icon: ShoppingBag },
                  ] as const).map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setOrderMode(m.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          orderMode === m.id
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-card border-border text-muted-foreground"
                        }`}
                      >
                        <Icon size={18} className="flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold">{m.label}</p>
                          <p className="text-[10px] opacity-70">{m.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <OptimizedImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.name}</p>
                      <p className="text-primary font-bold text-sm font-poppins">{rp(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button title="Kurangi Jumlah" onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center">
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                      <button title="Tambah Jumlah" onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                        <Plus size={12} className="text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  <ChefHat size={13} className="text-orange-400" />
                  Catatan untuk Chef
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Contoh: masak pedas, tidak pakai bawang..."
                  className="w-full bg-card border border-border rounded-xl p-3 text-xs resize-none h-20 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal ({cartCount} item)</span><span>{rp(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>PPN 10%</span><span>{rp(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-border pt-2">
                  <span>Total</span><span className="text-green-400">{rp(total)}</span>
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={placing || cart.length === 0}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold text-base hover:bg-indigo-500 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {placing ? (
                  <><RefreshCw size={16} className="animate-spin" /> Mengirim...</>
                ) : (
                  <>Pesan Sekarang · {rp(total)} <ChevronRight size={16} /></>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* Status View */}
      {view === "status" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <button title="Kembali ke Menu" onClick={() => setView("menu")} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-bold text-base font-poppins">Status Pesanan</h2>
            <div className="ml-auto flex items-center gap-2">
              <button 
                onClick={() => setAutoRefresh(!autoRefresh)} 
                className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold transition-colors ${
                  autoRefresh ? "bg-green-500/20 text-green-400" : "bg-secondary text-muted-foreground"
                }`}
              >
                {autoRefresh && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>}
                {autoRefresh ? "Auto Aktif" : "Auto Off"}
              </button>
              <button title="Segarkan Pesanan" onClick={loadMyOrders} className="text-muted-foreground hover:text-foreground">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {myOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <CheckCircle2 size={40} className="text-green-400" />
              <p className="text-sm font-semibold">Semua pesanan telah selesai</p>
              <button onClick={() => setView("menu")} className="text-xs text-primary font-semibold">
                Pesan lagi
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myOrders.map(order => {
                const cfg = statusConfig[order.status] || statusConfig.pending;
                return (
                  <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    {/* Status Header dengan Neon Glow */}
                    <div className={`flex items-center gap-2 px-4 py-3 border-b ${cfg.bg} ${cfg.neonBorder}`}>
                      <span className={`${cfg.color} animate-pulse`}>{cfg.icon}</span>
                      <span className={`text-sm font-bold ${cfg.color} animate-pulse`}>{cfg.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">{order.id}</span>
                    </div>

                    {/* Progress Stepper dengan Neon */}
                    <div className="px-4 py-5 flex flex-col gap-3">
                      {/* Baris Lingkaran & Garis */}
                      <div className="flex items-center justify-between relative px-2">
                        {/* Line Background */}
                        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-secondary rounded-full -z-10"></div>
                        {/* Line Active/Done (calculated by step width) */}
                        <div 
                          className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8),_0_0_4px_rgba(34,197,94,0.4)] transition-all duration-500 -z-10"
                          style={{ width: `${(Math.max(0, cfg.step - 1) / 3) * 100}%` }}
                        ></div>
                        
                        {(["pending", "cooking", "ready", "served"] as const).map((s, i) => {
                          const done = cfg.step > i + 1;
                          const active = cfg.step === i + 1;
                          return (
                            <div 
                              key={s} 
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold relative transition-all duration-500 ${
                                done 
                                  ? "bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.6)]" 
                                  : active 
                                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.8)]" 
                                    : "bg-secondary border border-border text-muted-foreground"
                              }`}
                            >
                              {active && (
                                <>
                                  <span className="absolute -inset-1.5 rounded-full border-2 border-orange-500/40 animate-ping opacity-75"></span>
                                  <span className="absolute -inset-3 rounded-full border border-orange-400/20 animate-pulse opacity-40"></span>
                                </>
                              )}
                              <span className="relative z-10">{i + 1}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Baris Label */}
                      <div className="grid grid-cols-4 text-center px-1">
                        {["Konfirmasi", "Dimasak", "Siap", "Disajikan"].map((lbl, i) => {
                          const done = cfg.step > i + 1;
                          const active = cfg.step === i + 1;
                          return (
                            <span 
                              key={lbl} 
                              className={`text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                                done 
                                  ? "text-green-500" 
                                  : active 
                                    ? "text-orange-400 font-extrabold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] animate-pulse" 
                                    : "text-muted-foreground/45"
                              }`}
                            >
                              {lbl}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="px-4 pb-4 space-y-1.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs items-center">
                          <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
                          <div className="flex font-semibold">
                            <span className="w-6 text-left">Rp</span>
                            <span className="w-[75px] text-right">{(item.price * item.qty).toLocaleString("id-ID")}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold pt-2 border-t border-border items-center">
                        <span>Total</span>
                        <div className="flex text-green-400">
                          <span className="w-6 text-left">Rp</span>
                          <span className="w-[75px] text-right">{order.total.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="aspect-video overflow-hidden">
              <OptimizedImage src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-foreground font-poppins">{selectedItem.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedItem.category}</p>
                </div>
                <p className="text-primary font-bold text-lg flex-shrink-0 font-poppins">{rp(selectedItem.price)}</p>
              </div>
              {selectedItem.description && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{selectedItem.description}</p>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
                >
                  Batal
                </button>
                <button
                  onClick={() => addToCart(selectedItem)}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-indigo-500 transition-all active:scale-95"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Cart Bar */}
      {view === "menu" && cartCount > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 z-30">
          <button
            onClick={() => setView("cart")}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-sm shadow-lg flex items-center justify-between px-5 hover:bg-indigo-500 transition-colors active:scale-95"
          >
            <span className="bg-foreground/20 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold">
              {cartCount}
            </span>
            <span>Lihat Keranjang</span>
            <span>{rp(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
