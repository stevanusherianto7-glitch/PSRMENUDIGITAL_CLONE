import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  ShoppingCart, Plus, Minus, Trash2, X, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, ChefHat, UtensilsCrossed, Scan, RefreshCw,
  Utensils, ShoppingBag, Sparkles, MapPin, ClipboardList
} from "lucide-react";
const logoImg = "/imports/logo_kedai_Elvera57.png";
import { SEED_MENU, menuCategories, rp } from "../data";
import { supabase } from "../../lib/supabase";
import { createOrder, fetchOrders } from "../api";
import type { MenuItem, CartItem, Order, OrderMode } from "../types";

type View = "menu" | "cart" | "status";

export default function GuestMenuPage() {
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

  const filtered = menuItems.filter(m => m.category === category);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  // Fetch menu from Supabase (merged with local images)
  useEffect(() => {
    async function loadMenu() {
      setLoading(true);
      try {
        const { data } = await supabase.from("menu_items").select("*");
        if (data && data.length > 0) {
          const dbById = new Map(data.map((r: any) => [r.id, r]));
          // SEED_MENU = source of truth untuk nama/kategori/gambar/deskripsi.
          // Supabase hanya menentukan price & available (jika ada baris-nya).
          const merged: MenuItem[] = SEED_MENU.map(seed => {
            const r: any = dbById.get(seed.id);
            if (!r) return seed;
            return {
              ...seed,
              price: typeof r.price === "number" ? r.price : seed.price,
              available: typeof r.available === "boolean" ? r.available : seed.available,
            };
          });
          // Item custom di Supabase yang tidak ada di SEED tetap ditampilkan
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

  // Poll my orders
  const loadMyOrders = useCallback(async () => {
    if (!tableId) {
      setTableError(true);
      return;
    }
    try {
      const orders = await fetchOrders(undefined, tableId);
      const active = orders.filter(o =>
        o.status !== "served" && o.status !== "cancelled"
      );
      setMyOrders(active);
    } catch (e) {
      console.log("Error loading orders:", e);
    }
  }, [tableId]);

  useEffect(() => {
    loadMyOrders();
    const interval = setInterval(loadMyOrders, 5000);
    return () => clearInterval(interval);
  }, [loadMyOrders]);

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
      console.log("Error placing order:", e);
      alert("Gagal mengirim pesanan. Coba lagi.");
    }
    setPlacing(false);
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; step: number }> = {
    pending: { label: "Menunggu Konfirmasi", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: <Clock size={16} />, step: 1 },
    cooking: { label: "Sedang Dimasak", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: <ChefHat size={16} />, step: 2 },
    ready: { label: "Siap Diantar", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: <UtensilsCrossed size={16} />, step: 3 },
    served: { label: "Sudah Disajikan", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: <CheckCircle2 size={16} />, step: 4 },
  };

  function handleStartOrder() {
    setOrderMode(welcomeMode);
    setShowWelcome(false);
  }

  // Check if tableId is missing and show error
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
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-24">

      {/* ── Welcome Modal ───────────────────────────────────────────── */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="bg-card w-full max-w-md rounded-2xl overflow-hidden mx-4 shadow-2xl"
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            {/* Step 1 — Sapaan & pilih tipe */}
            {welcomeStep === 1 && (
              <div className="p-6">
                {/* Logo + judul */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-3">
                    <img
                      src={logoImg}
                      alt="Kedai Elvera 57"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-foreground/10"
                    />
                  </div>
                  <h2
                    className="text-xl font-extrabold text-foreground leading-tight font-poppins"
                  >
                    Selamat Datang di<br />
                    <span className="text-primary">Kedai Elvera 57!</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Restoran khas Semarang · Nikmati sajian terbaik kami
                  </p>
                </div>

                {/* Info meja */}
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

                {/* Pilih tipe pesanan */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider">
                    Pilih Tipe Pesanan
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      {
                        id: "dine-in" as OrderMode,
                        label: "Dine In",
                        sub: "Makan di tempat",
                        emoji: "🪑",
                        color: orderMode === "dine-in" ? "border-indigo-500 bg-indigo-500/10" : "border-border bg-card",
                        textColor: welcomeMode === "dine-in" ? "text-indigo-400" : "text-muted-foreground",
                      },
                      {
                        id: "take-away" as OrderMode,
                        label: "Take Away",
                        sub: "Dibawa pulang",
                        emoji: "🛍️",
                        color: welcomeMode === "take-away" ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-card",
                        textColor: welcomeMode === "take-away" ? "text-emerald-400" : "text-muted-foreground",
                      },
                    ]).map(m => (
                      <button
                        key={m.id}
                        onClick={() => setWelcomeMode(m.id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                          welcomeMode === m.id
                            ? m.id === "dine-in"
                              ? "border-indigo-500 bg-indigo-500/10"
                              : "border-emerald-500 bg-emerald-500/10"
                            : "border-border bg-card"
                        }`}
                      >
                        <span className="text-2xl">{m.emoji}</span>
                        <div className="text-center">
                          <p className={`text-sm font-bold ${
                            welcomeMode === m.id
                              ? welcomeMode === "dine-in" ? "text-indigo-400" : "text-emerald-400"
                              : "text-foreground"
                          }`}>{m.label}</p>
                          <p className="text-[10px] text-muted-foreground">{m.sub}</p>
                        </div>
                        {welcomeMode === m.id && (
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            m.id === "dine-in" ? "bg-indigo-500" : "bg-emerald-500"
                          }`}>
                            <CheckCircle2 size={10} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tombol lanjut */}
                <button
                  onClick={() => setWelcomeStep(2)}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Lanjut <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Step 2 — Cara pesan */}
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

                {/* 3 langkah */}
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

                {/* Ringkasan pilihan */}
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

                {/* CTA */}
                <button
                  onClick={handleStartOrder}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold text-sm hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                >
                  <Sparkles size={16} /> Mulai Pesan Sekarang!
                </button>

                <p className="text-center text-[10px] text-muted-foreground mt-3">
                  Meja {tableId} · Kedai Elvera 57 · Semarang
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Kedai Elvera 57" className="w-9 h-9 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground font-poppins">Kedai Elvera 57</p>
            <p className="text-xs text-muted-foreground">Meja {tableId} · Scan & Order</p>
          </div>
          {myOrders.length > 0 && (
            <button
              onClick={() => setView(view === "status" ? "menu" : "status")}
              className="flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full font-semibold"
            >
              <Clock size={12} /> {myOrders.length} Pesanan
            </button>
          )}
        </div>
      </header>

      {/* Menu View */}
      {view === "menu" && (
        <div>
          {/* Category Tabs */}
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

          {/* Menu Grid */}
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
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
            <button onClick={() => setView("menu")} className="text-muted-foreground hover:text-foreground" aria-label="Kembali">
              <X size={18} />
            </button>
            <h2 className="font-bold text-base font-poppins">Keranjang Pesanan</h2>
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ShoppingCart size={40} className="opacity-20" />
              <p className="text-sm">Keranjang kosong</p>
              <button onClick={() => setView("menu")} className="text-xs text-primary hover:text-indigo-400 font-semibold">
                Pilih menu
              </button>
            </div>
          ) : (
            <>
              {/* Dine-in / Take-away selector */}
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
                    <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.name}</p>
                      <p className="text-primary font-bold text-sm font-poppins">{rp(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center" aria-label="Kurangi jumlah">
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center" aria-label="Tambah jumlah">
                        <Plus size={12} className="text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Catatan untuk Chef */}
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  <ChefHat size={13} className="text-orange-400" />
                  Catatan untuk Chef
                  <span className="text-muted-foreground font-normal">(opsional)</span>
                </label>
                <div className="relative">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: masak pedas, tidak pakai bawang, sambal terpisah..."
                    className="w-full bg-card border border-border rounded-xl p-3 text-xs resize-none h-20 focus:outline-none focus:border-orange-400/50 transition-colors"
                  />
                  {notes && (
                    <button
                      onClick={() => setNotes("")}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                      aria-label="Hapus catatan"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {/* Quick note chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Masak pedas 🌶️", "Tidak pakai bawang", "Sambal terpisah", "Kuah sedikit", "Extra nasi"].map(chip => (
                    <button
                      key={chip}
                      onClick={() => setNotes(prev => prev ? `${prev}, ${chip.replace(/ 🌶️/, "")}` : chip.replace(/ 🌶️/, ""))}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-orange-400/30 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
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
            <button onClick={() => setView("menu")} className="text-muted-foreground hover:text-foreground" aria-label="Kembali">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-bold text-base font-poppins">Status Pesanan</h2>
            <button onClick={loadMyOrders} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Segarkan pesanan">
              <RefreshCw size={14} />
            </button>
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
                  <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className={`flex items-center gap-2 px-4 py-3 border-b border-border ${cfg.bg}`}>
                      <span className={cfg.color}>{cfg.icon}</span>
                      <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">{order.id}</span>
                    </div>

                    {/* Progress steps */}
                    <div className="flex items-center px-4 py-3 gap-1">
                      {["pending", "cooking", "ready", "served"].map((s, i) => {
                        const done = cfg.step > i + 1;
                        const active = cfg.step === i + 1;
                        return (
                          <div key={s} className="flex items-center flex-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              done ? "bg-green-500 text-white" : active ? "bg-primary text-white" : "bg-secondary border border-border text-muted-foreground"
                            }`}>{i + 1}</div>
                            {i < 3 && (
                              <div className={`flex-1 h-0.5 ${done ? "bg-green-500" : "bg-border"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-4 pb-4 space-y-1.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
                          <span className="font-semibold">{rp(item.price * item.qty)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                        <span>Total</span>
                        <span className="text-green-400">{rp(order.total)}</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="aspect-video overflow-hidden">
              <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
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
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => addToCart(selectedItem)}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center"
                >
                  Tambah ke Keranjang
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
  );
}