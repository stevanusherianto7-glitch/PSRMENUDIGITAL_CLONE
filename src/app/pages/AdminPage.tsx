/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI ADALAH MODUL PUSAT KENDALI (ADMIN) SISTEM Kedai Elvera 57.
 * PERUBAHAN LOGIKA DI SINI AKAN BERDAMPAK PADA SELURUH ALUR KERJA RESTORAN. ⚠️
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom"; // Menggunakan react-router-dom agar tidak error context
import {
  LayoutDashboard, ShoppingCart, UtensilsCrossed, Grid3X3,
  Package, FileBarChart2, Bell, ChevronRight,
  Users, Receipt, Minus, Plus, Trash2, AlertTriangle,
  CheckCircle2, XCircle, Clock, CreditCard, Wallet, Banknote,
  Smartphone, LogOut, Search, ArrowUpRight, ArrowDownRight,
  ChefHat, RefreshCw, Database, Wifi, WifiOff, Save, QrCode,
  Tag, Flame, ShoppingBag, ExternalLink, Copy,
  Volume2, VolumeX, Printer, Download, Activity, Edit2,
  Calendar, Calculator, Briefcase, Key, Settings
} from "lucide-react";
import QRCode from "react-qr-code";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

// Logo sekarang diambil dari APP_LOGO di data.ts (import alias: logoImg)

import { format } from "date-fns";
import {
  SEED_MENU, SEED_TABLES, SEED_INVENTORY, SEED_PROMOS,
  menuCategories, rp,  PAYMENT_DATA, BEST_SELLER_DATA, HOURLY_DATA, CREDENTIALS,
  BRAND_NAME, APP_LOGO as logoImg
} from "../data";
import { fetchOrders, updateOrder, createOrder } from "../api";
import { DashboardModule } from "../components/DashboardModule";
import { OrdersModule } from "../components/OrdersModule";
import { KasirModule } from "../components/KasirModule";
import { MejaModule } from "../components/MejaModule";
import { PromoModule } from "../components/PromoModule";
import { PettyCashModule } from "../components/PettyCashModule";
import { InventarisModule } from "../components/InventarisModule";
import { LaporanModule } from "../components/LaporanModule";
import { QrMenuModule } from "../components/QrMenuModule";
import { JadwalShift } from "../components/JadwalShift";
import { KalkulatorHPP } from "../components/KalkulatorHPP";
import { useTTS, preloadVoices } from "../hooks/useTTS";
import { KaryawanModule } from "../components/KaryawanModule";
import { AssetModule } from "../components/AssetModule";
import { ReservasiModule } from "../components/ReservasiModule";
import { MenuManagement } from "../components/MenuManagement";
import { ThemeToggle } from "../components/ThemeToggle";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DateRangePicker } from "../components/ui/date-range-picker";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/ui/tooltip";
import type { DateRange } from "react-day-picker";
import type {
  MenuItem, CartItem, Transaction, TableData,
  InventoryItem, Promo, Order, OrderStatus, UserSession
} from "../types";

// ─── Vercel URL untuk QR Code tamu ────────────────────────────────────────────
export const GUEST_BASE_URL = (import.meta.env.VITE_GUEST_BASE_URL || "https://psrmenudigital.vercel.app").replace(/['"]/g, "");

export function getDailyVerificationPIN() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  const seed = (y * 10000) + (m * 100) + d;
  const x = Math.sin(seed) * 10000;
  const pin = Math.floor((x - Math.floor(x)) * 9000) + 1000;
  return pin.toString();
}

export const orderModeConfig = {
  "dine-in": { label: "Dine In", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  "take-away": { label: "Take Away", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
} as const;

// Mapping antara URL path dan module
const modulePathMap: Record<Module, string> = {
  "orders": "/orders",
  "kasir": "/kasir",
  "meja": "/meja",
  "menu": "/menu",
  "promo": "/promo",
  "qr-menu": "/qr-menu",
  "metrics": "/metrics",
  "hpp": "/hpp",
  "sdm": "/sdm",
  "stok": "/stok",
  "transaksi": "/transaksi",
};

// Reverse mapping untuk path ke module
const pathModuleMap: Record<string, Module> = Object.fromEntries(
  Object.entries(modulePathMap).map(([module, path]) => [path, module as Module])
);

type Module = "orders" | "kasir" | "meja" | "menu" | "promo" | "qr-menu" | "metrics" | "hpp" | "sdm" | "stok" | "transaksi";

export const tableStatusConfig = {
  available: { label: "Kosong", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  occupied: { label: "Terisi", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  service: { label: "Butuh Layanan", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  reserved: { label: "Reservasi", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
};

const orderStatusConfig: Record<OrderStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: { label: "Antrian", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: <Clock size={12} /> },
  cooking: { label: "Dimasak", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: <Flame size={12} /> },
  ready: { label: "Siap Antar", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: <ShoppingBag size={12} /> },
  served: { label: "Selesai", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: <CheckCircle2 size={12} /> },
  cancelled: { label: "Dibatal", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: <XCircle size={12} /> },
};

const NAV_ITEMS: { id: Module; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "transaksi", label: "Data Transaksi", icon: FileBarChart2 },
  { id: "orders", label: "Monitor Pesanan", icon: ShoppingBag },
  { id: "kasir", label: "Kasir", icon: ShoppingCart },
  { id: "meja", label: "Manajemen Meja", icon: Grid3X3 },
  { id: "menu", label: "Katalog Menu", icon: UtensilsCrossed },
  { id: "qr-menu", label: "Buku Menu Digital", icon: QrCode },
  { id: "stok", label: "Stok Opname", icon: Package },
  { id: "metrics", label: "Metrics", icon: Activity },
  { id: "sdm", label: "SDM", icon: Users },
  { id: "hpp", label: "Kalkulator HPP", icon: Calculator },
];



function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${connected ? "bg-green-500/10 border-green-500/20 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "bg-red-500/10 border-red-500/20 text-red-500"}`} title={connected ? "Supabase Online" : "Offline"}>
      {connected ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
    </div>
  );
}







// ─── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeModule, setActiveModule] = useState<Module>("transaksi");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("pawon_sidebar_open");
    if (saved !== null) return saved === "true";
    return window.innerWidth > 1024;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("pawon_sidebar_open", sidebarOpen.toString());
  }, [sidebarOpen]);

  // Sync URL with active module
  // useEffect(() => {
  //   const path = location.pathname;
  //   const module = pathModuleMap[path];
  //   if (module && module !== activeModule) {
  //     setActiveModule(module);
  //   }
  // }, [location.pathname, activeModule]);

  // Update URL when module changes
  // useEffect(() => {
  //   const newPath = modulePathMap[activeModule];
  //   if (newPath && location.pathname !== newPath) {
  //     navigate(newPath, { replace: true });
  //   }
  // }, [activeModule, navigate, location.pathname]);
  const [time, setTime] = useState(new Date());
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    const saved = localStorage.getItem('pawon_tts_enabled');
    return saved !== null ? saved === 'true' : true; // Default ON
  });
  const [sdmSubModule, setSdmSubModule] = useState<"karyawan" | "shift">("karyawan");
  const [stokSubModule, setStokSubModule] = useState<"bahan" | "asset">("bahan");
  const [transaksiSubModule, setTransaksiSubModule] = useState<"summary" | "laporan">("summary");
  const [kasirSubModule, setKasirSubModule] = useState<"pos" | "promo" | "petty" | "reservasi">("pos");
  const [autoSelectOrderId, setAutoSelectOrderId] = useState<string | null>(null);

  // --- TTS Customization Settings ---
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const [ttsRate, setTtsRate] = useState(() => parseFloat(localStorage.getItem("pawon_tts_rate") || "0.95"));
  const [ttsPitch, setTtsPitch] = useState(() => parseFloat(localStorage.getItem("pawon_tts_pitch") || "1.15"));
  const [ttsVoice, setTtsVoice] = useState(() => localStorage.getItem("pawon_tts_voice_name") || "");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const load = () => {
        const voices = window.speechSynthesis.getVoices();
        const idVoices = voices.filter(v => v.lang === "id-ID" || v.lang.startsWith("id"));
        setAvailableVoices(idVoices.length > 0 ? idVoices : voices);
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  const saveTtsSettings = async (rate: number, pitch: number, voiceName: string) => {
    localStorage.setItem("pawon_tts_rate", rate.toString());
    localStorage.setItem("pawon_tts_pitch", pitch.toString());
    localStorage.setItem("pawon_tts_voice_name", voiceName);
    setTtsRate(rate);
    setTtsPitch(pitch);
    setTtsVoice(voiceName);

    try {
      const durationJson = JSON.stringify({ tts_rate: rate, tts_pitch: pitch, tts_voice_name: voiceName });
      await supabase.from("meja").update({
        duration: durationJson
      }).eq("id", "SYSTEM_SETTINGS");
    } catch (e) {
      console.error("Failed to sync TTS settings to database:", e);
    }
  };

  const testTtsSpeech = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Tes suara notifikasi sistem Kedai Elvera 57.");
    utterance.lang = "id-ID";
    utterance.rate = ttsRate;
    utterance.pitch = ttsPitch;
    
    let voice = availableVoices.find(v => v.name === ttsVoice);
    if (!voice) {
      const idVoices = availableVoices.filter(v => v.lang === "id-ID" || v.lang.startsWith("id"));
      voice = idVoices.find(v => 
        v.name.includes("Gadis") || 
        v.name.includes("Google") || 
        v.name.toLowerCase().includes("female")
      ) || idVoices[0];
    }
    
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  // Data state
  const [tables, setTables] = useState<TableData[]>(SEED_TABLES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(SEED_MENU);
  const [inventory, setInventory] = useState<InventoryItem[]>(SEED_INVENTORY);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [promos, setPromos] = useState<Promo[]>(SEED_PROMOS);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);

  // Filter Tanggal untuk Data Transaksi (Opsi 1)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const filteredTransactions = transactions.filter(tx => {
    if (!dateRange || !dateRange.from || !dateRange.to) return true;
    const txDate = new Date(tx.created_at);
    const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
    const to = new Date(dateRange.to); to.setHours(23, 59, 59, 999);
    return txDate >= from && txDate <= to;
  });

  function togglePromo(id: string) {
    setPromos(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }

  function addPromo(newPromo: Promo) {
    setPromos(prev => [...prev, newPromo]);
  }

  async function addInventory(item: InventoryItem) {
    const { error } = await supabase.from("inventory").insert(item);
    if (!error) {
      setInventory(prev => [...prev, item]);
      await supabase.from("inventory_logs").insert({
        inventory_id: item.id,
        quantity: item.stock,
        type: "in"
      });
      // Refresh logs
      const { data: logRows } = await supabase.from("inventory_logs").select("*").order("created_at", { ascending: false });
      if (logRows) setInventoryLogs(logRows);
    }
  }

  async function updateInventory(item: InventoryItem) {
    const oldItem = inventory.find(i => i.id === item.id);
    const stockDiff = item.stock - (oldItem?.stock || 0);

    const { error } = await supabase.from("inventory").update(item).eq("id", item.id);
    if (!error) {
      setInventory(prev => prev.map(i => i.id === item.id ? item : i));
      if (stockDiff > 0) {
        await supabase.from("inventory_logs").insert({
          inventory_id: item.id,
          quantity: stockDiff,
          type: "in"
        });
        // Refresh logs
        const { data: logRows } = await supabase.from("inventory_logs").select("*").order("created_at", { ascending: false });
        if (logRows) setInventoryLogs(logRows);
      }
    }
  }

  async function deleteInventory(id: string) {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) setInventory(prev => prev.filter(i => i.id !== id));
  }
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [ordersLoaded, setOrdersLoaded] = useState(false);

  // TTS — hanya untuk pesanan pending (pesanan masuk baru)
  const pendingOrders = liveOrders.filter(o => o.status === "pending");
  const { speak } = useTTS(pendingOrders, ttsEnabled, ordersLoaded);
  const speakRef = useRef(speak);
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  // Preload voices + persist TTS preference
  useEffect(() => {
    preloadVoices();
  }, []);
  useEffect(() => {
    localStorage.setItem('pawon_tts_enabled', String(ttsEnabled));
  }, [ttsEnabled]);

  // Auth check
  useEffect(() => {
    try {
      const s = localStorage.getItem("pawon_session");
      if (!s) { navigate("/"); return; }
      const parsed = JSON.parse(s) as UserSession;
      if (parsed.role !== "admin" && parsed.role !== "manager" && parsed.role !== "owner") { navigate("/waiter"); return; }
      setSession(parsed);
      preloadVoices();
    } catch (e) {
      console.error("Failed to parse session from localStorage", e);
      localStorage.removeItem("pawon_session");
      navigate("/");
    }
  }, [navigate]);

  // Clock
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(t); }, []);

  // Load orders from server
  const loadOrders = useCallback(async () => {
    try {
      const orders = await fetchOrders();
      // Filter: hanya order hari ini & belum lewat 4 jam (untuk active orders).
      // Order "served" tetap disimpan untuk referensi kasir, tapi juga hanya hari ini.
      const now = Date.now();
      const timeWindow = now - (24 * 60 * 60 * 1000); // 24 jam terakhir
      const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 jam

      const active = orders.filter(o => {
        if (o.status === "cancelled") return false;
        const dateStr = o.created_at || "";
        const createdAt = new Date(dateStr.includes('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`).getTime();
        if (createdAt < timeWindow) return false;
        if (o.status === "served") return true;
        // Active orders (pending/cooking/ready): maks 4 jam
        return (now - createdAt) < MAX_AGE_MS;
      });
      setLiveOrders(active);
    } catch (e) { console.log("Error loading orders:", e); }
    finally { setOrdersLoaded(true); }
  }, []);

  // Load transactions from server
  const loadTransactions = useCallback(async () => {
    try {
      const { data: txRows } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
      if (txRows) {
        setTransactions(txRows.map((r: any) => ({
          id: r.id,
          table_id: r.table_id,
          items: r.items || [],
          subtotal: r.subtotal,
          discount: r.discount,
          discount_amount: r.discount_amount,
          tax: r.tax,
          total: r.total,
          method: r.method,
          created_at: r.created_at
        })));
      }
    } catch (e) { console.log("Error loading transactions:", e); }
  }, []);

  useEffect(() => {
    loadOrders();
    loadTransactions();
    const interval = setInterval(() => {
      loadOrders();
      loadTransactions();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadOrders, loadTransactions]);

  // Supabase init
  useEffect(() => {
    let mejaChannel: ReturnType<typeof supabase.channel> | null = null;
    let txChannel: ReturnType<typeof supabase.channel> | null = null;
    let ordersChannel: ReturnType<typeof supabase.channel> | null = null;
    let reservationsChannel: ReturnType<typeof supabase.channel> | null = null;

    async function initSupabase() {
      setSeeding(true);
      try {
        const { error: pingError } = await supabase.from("meja").select("id").limit(1);
        if (pingError) throw pingError;
        setConnected(true);

        const { data: mejaRows } = await supabase.from("meja").select("*");
        if (!mejaRows || mejaRows.length === 0) {
          await supabase.from("meja").insert(SEED_TABLES.map(t => ({ id: t.id, seat: t.seat, status: t.status, pax: null, total: null, duration: null, orders: null })));
          await supabase.from("meja").insert({
            id: "SYSTEM_SETTINGS",
            seat: 0,
            status: "available",
            duration: JSON.stringify({ tts_rate: 0.95, tts_pitch: 1.15, tts_voice_name: "" })
          });
        } else {
          const actualTables = mejaRows.filter((r: any) => r.id !== "SYSTEM_SETTINGS");
          setTables(actualTables.map((r: any) => ({ id: r.id, seat: r.seat, status: r.status, pax: r.pax, total: r.total, duration: r.duration, orders: r.orders })));

          const settingsRow = mejaRows.find((r: any) => r.id === "SYSTEM_SETTINGS");
          if (settingsRow && settingsRow.duration) {
            try {
              const parsed = JSON.parse(settingsRow.duration);
              if (parsed.tts_rate !== undefined) {
                localStorage.setItem("pawon_tts_rate", String(parsed.tts_rate));
                setTtsRate(parsed.tts_rate);
              }
              if (parsed.tts_pitch !== undefined) {
                localStorage.setItem("pawon_tts_pitch", String(parsed.tts_pitch));
                setTtsPitch(parsed.tts_pitch);
              }
              if (parsed.tts_voice_name !== undefined) {
                localStorage.setItem("pawon_tts_voice_name", parsed.tts_voice_name);
                setTtsVoice(parsed.tts_voice_name);
              }
            } catch (e) {
              console.error("Failed to parse settings row duration:", e);
            }
          } else if (!settingsRow) {
            await supabase.from("meja").insert({
              id: "SYSTEM_SETTINGS",
              seat: 0,
              status: "available",
              duration: JSON.stringify({ tts_rate: 0.95, tts_pitch: 1.15, tts_voice_name: "" })
            });
          }
        }

        // Upsert semua seed: update nama/harga yang berubah, insert yang baru
        await supabase.from("menu_items").upsert(
          SEED_MENU.map(m => ({
            id: m.id,
            name: m.name,
            category: m.category,
            price: m.price,
            image: m.image && (m.image as string).startsWith("http") ? m.image : m.id,
            available: m.available,
            tag: m.tag || null,
            description: m.description || null,
          })),
          { onConflict: "id", ignoreDuplicates: false }
        );

        const { data: menuRows } = await supabase.from("menu_items").select("*");
        if (menuRows && menuRows.length > 0) {
          const seedIds = new Set(SEED_MENU.map(m => m.id));
          const resolvedItems: MenuItem[] = menuRows.map((r: any) => {
            const seed = SEED_MENU.find(m => m.id === r.id);
            const imageResolved =
              r.image && (r.image.startsWith("http") || r.image.startsWith("blob"))
                ? r.image
                : seed?.image || "";
            return {
              id: r.id,
              name: r.name,
              category: r.category,
              price: r.price,
              image: imageResolved,
              available: r.available,
              tag: r.tag || undefined,
              description: r.description || seed?.description || "",
            };
          });
          // Seed items dulu, item custom di belakang
          setMenuItems([
            ...resolvedItems.filter(i => seedIds.has(i.id)),
            ...resolvedItems.filter(i => !seedIds.has(i.id)),
          ]);
        } else {
          setMenuItems(SEED_MENU);
        }

        const { data: invRows } = await supabase.from("inventory").select("*");
        if (!invRows || invRows.length === 0) {
          await supabase.from("inventory").insert(SEED_INVENTORY.map(i => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit, exp_date: i.exp_date, category: i.category, method: i.method, stock: i.stock, min_stock: i.min_stock })));
        } else {
          setInventory(invRows.map((r: any) => ({ id: r.id, name: r.name, qty: r.qty, unit: r.unit, exp_date: r.exp_date, category: r.category, method: r.method, stock: r.stock, min_stock: r.min_stock })));
        }

        await loadTransactions();

        const { data: logRows } = await supabase.from("inventory_logs").select("*").order("created_at", { ascending: false });
        if (logRows) setInventoryLogs(logRows);

        const { data: resRows } = await supabase.from("reservations").select("*").order("created_at", { ascending: false });
        if (resRows) setReservations(resRows);

        mejaChannel = supabase.channel("meja-admin-" + Date.now())
          .on("postgres_changes", { event: "*", schema: "public", table: "meja" }, payload => {
            if (payload.new && (payload.new as any).id === "SYSTEM_SETTINGS") {
              try {
                const r = payload.new as any;
                if (r.duration) {
                  const parsed = JSON.parse(r.duration);
                  if (parsed.tts_rate !== undefined) {
                    localStorage.setItem("pawon_tts_rate", String(parsed.tts_rate));
                    setTtsRate(parsed.tts_rate);
                  }
                  if (parsed.tts_pitch !== undefined) {
                    localStorage.setItem("pawon_tts_pitch", String(parsed.tts_pitch));
                    setTtsPitch(parsed.tts_pitch);
                  }
                  if (parsed.tts_voice_name !== undefined) {
                    localStorage.setItem("pawon_tts_voice_name", parsed.tts_voice_name);
                    setTtsVoice(parsed.tts_voice_name);
                  }
                }
              } catch (e) {
                console.error("Failed to parse settings update", e);
              }
              return;
            }
            if (payload.eventType === "UPDATE") {
              const r = payload.new as any;
              setTables(prev => prev.map(t => t.id === r.id ? { id: r.id, seat: r.seat, status: r.status, pax: r.pax, total: r.total, duration: r.duration, orders: r.orders } : t));
            }
          }).subscribe();

        txChannel = supabase.channel("tx-admin-" + Date.now())
          .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, payload => {
            if (payload.eventType === "INSERT") {
              const r = payload.new as any;
              const newTx: Transaction = { id: r.id, table_id: r.table_id, items: r.items || [], subtotal: r.subtotal, discount: r.discount, discount_amount: r.discount_amount, tax: r.tax, total: r.total, method: r.method, created_at: r.created_at };
              setTransactions(prev => [newTx, ...prev].slice(0, 200));
            } else if (payload.eventType === "UPDATE") {
              const r = payload.new as any;
              const updatedTx: Transaction = { id: r.id, table_id: r.table_id, items: r.items || [], subtotal: r.subtotal, discount: r.discount, discount_amount: r.discount_amount, tax: r.tax, total: r.total, method: r.method, created_at: r.created_at };
              setTransactions(prev => prev.map(tx => tx.id === r.id ? updatedTx : tx));
            } else if (payload.eventType === "DELETE") {
              const r = payload.old as any;
              setTransactions(prev => prev.filter(tx => tx.id !== r.id));
            }
          }).subscribe();

        ordersChannel = supabase.channel("orders-admin-" + Date.now())
          .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, payload => {
            loadOrders();
          }).subscribe();

        reservationsChannel = supabase.channel("reservations-admin-" + Date.now())
          .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, payload => {
            if (payload.eventType === "INSERT") {
              setReservations(prev => [payload.new, ...prev]);
              if (payload.new.status === "pending") {
                toast.info(`Reservasi Baru: ${payload.new.name} (${payload.new.type})`, {
                  position: "top-right",
                  duration: 5000,
                });
                speakRef.current(`Ada reservasi baru atas nama ${payload.new.name}`);
              }
            } else if (payload.eventType === "UPDATE") {
              setReservations(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
            } else if (payload.eventType === "DELETE") {
              setReservations(prev => prev.filter(r => r.id !== payload.old.id));
            }
          }).subscribe();

      } catch (err) {
        console.warn("Supabase tidak terhubung:", err);
        setConnected(false);
      }
      setSeeding(false);
    }

    initSupabase();
    return () => {
      if (mejaChannel) supabase.removeChannel(mejaChannel);
      if (txChannel) supabase.removeChannel(txChannel);
      if (ordersChannel) supabase.removeChannel(ordersChannel);
      if (reservationsChannel) supabase.removeChannel(reservationsChannel);
    };
  }, []);

  const handleTransaction = useCallback(async (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    if (connected) {
      const { error } = await supabase.from("transactions").insert({
        id: tx.id,
        items: tx.items,
        total: tx.total,
        created_at: tx.created_at,
        discount: tx.discount || 0,
        discount_amount: tx.discount_amount || 0,
        method: tx.method,
        paymentMethod: tx.method,
        timestamp: tx.created_at,
        order_id: tx.order_id
      });
      if (error) console.error("Error saving transaction:", error);

      // 2. Simpan ke tabel transaction_items (Opsi 2 - Untuk Laporan Real-time)
      const itemRows = tx.items.map(item => ({
        transaction_id: tx.id,
        menu_item_id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        total: item.price * item.qty,
        created_at: tx.created_at
      }));

      const { error: itemsError } = await supabase.from("transaction_items").insert(itemRows);
      if (itemsError) console.error("Error saving transaction items:", itemsError);
    }
  }, [connected]);

  const handleUpdateReservationStatus = useCallback(async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Reservasi berhasil di-${newStatus === 'approved' ? 'setujui' : 'tolak'}`);
    } catch (err) {
      console.error("Failed to update reservation status:", err);
      toast.error("Gagal mengupdate status reservasi. Coba lagi.");
    }
  }, [connected]);

  const handleUpdateTableStatus = useCallback(async (id: string, status: TableData["status"]) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, status, pax: undefined, total: undefined, duration: undefined, orders: undefined } : t));
    if (connected) {
      const { error } = await supabase.from("meja").update({ status, pax: null, total: null, duration: null, orders: null }).eq("id", id);
      if (error) console.error("Error updating table:", error);
    }
  }, [connected]);

  const handleToggleAvailability = useCallback(async (id: string, available: boolean) => {
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, available } : m));
    if (connected) {
      const { error } = await supabase.from("menu_items").update({ available }).eq("id", id);
      if (error) console.error("Error toggling menu item:", error);
    }
  }, [connected]);

  const handleSaveMenuItem = useCallback(async (item: MenuItem, isNew: boolean) => {
    setMenuItems(prev =>
      isNew ? [...prev, item] : prev.map(m => m.id === item.id ? item : m)
    );
    if (connected) {
      const row = {
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        image: item.image || item.id,
        available: item.available,
        tag: item.tag || null,
        description: item.description || null,
      };
      if (isNew) {
        const { error } = await supabase.from("menu_items").insert(row);
        if (error) console.error("Error inserting menu item:", error);
      } else {
        const { error } = await supabase.from("menu_items").update(row).eq("id", item.id);
        if (error) console.error("Error updating menu item:", error);
      }
    }
  }, [connected]);

  const handleDeleteMenuItem = useCallback(async (id: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== id));
    if (connected) {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) console.error("Error deleting menu item:", error);
    }
  }, [connected]);

  const handleReorderMenuItems = useCallback((ordered: MenuItem[]) => {
    setMenuItems(ordered);
    localStorage.setItem("pawon_menu_order", JSON.stringify(ordered.map(m => m.id)));
  }, []);

  const criticalAlerts = inventory.filter(i => {
    const exp = new Date(i.exp_date); const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - now.getTime()) / 86400000) <= 2;
  }).length;

  const pendingOrdersCount = liveOrders.filter(o => o.status === "pending").length;

  const moduleLabels: Record<Module, string> = {
    orders: "Monitor Pesanan", kasir: "Kasir",
    meja: "Manajemen Meja", menu: "Katalog Menu", "qr-menu": "Buku Menu Digital", promo: "Promo",
    sdm: "SDM", stok: "Stok Opname", transaksi: "Data Transaksi",
    hpp: "Kalkulator HPP", metrics: "Metrics",
  };

  function logout() { localStorage.removeItem("pawon_session"); navigate("/"); }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/ backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out
        lg:static lg:z-auto
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${sidebarOpen ? "w-64" : "w-20"}
      `}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border overflow-hidden">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 shadow-sm" />
            {(sidebarOpen || mobileSidebarOpen) && (
              <div className="transition-all animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="font-black text-sm text-foreground leading-tight font-['Poppins'] truncate whitespace-nowrap">{BRAND_NAME}</p>
                <p className="text-[10px] text-muted-foreground leading-tight uppercase tracking-wider font-black">Admin Panel</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            const hasBadge = (item.id === "stok" && criticalAlerts > 0) || (item.id === "orders" && pendingOrdersCount > 0);
            const badgeCount = item.id === "stok" ? criticalAlerts : pendingOrdersCount;

            return (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setActiveModule(item.id);
                        if (window.innerWidth < 1024) setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center rounded-xl text-left transition-all group relative ${sidebarOpen || mobileSidebarOpen ? "px-3 py-2.5 gap-3" : "p-3 justify-center"
                        } ${active
                          ? "text-primary drop-shadow-[0_0_8px_rgba(232,119,34,0.8)]"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        }`}>
                      <Icon size={22} className={`flex-shrink-0 transition-transform ${active ? "scale-110" : "group-hover:scale-110"}`} />

                      {(sidebarOpen || mobileSidebarOpen) && (
                        <span className={`font-black text-xs truncate animate-in fade-in slide-in-from-left-2 duration-300 uppercase tracking-wider ${active ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                          {item.label}
                        </span>
                      )}

                      {hasBadge && (
                        <span className={`absolute bg-red-500 text-white text-[9px] font-bold rounded-full ring-2 ring-sidebar flex items-center justify-center ${sidebarOpen || mobileSidebarOpen
                            ? "right-3 px-1.5 py-0.5"
                            : "top-2 right-2 w-4 h-4"
                          }`}>
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {!sidebarOpen && !mobileSidebarOpen && (
                    <TooltipContent side="right" className="font-bold text-xs">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border flex flex-col items-center gap-4">
          <button
            onClick={logout}
            className="p-3 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all group flex items-center justify-center w-full"
            title="Keluar"
          >
            <LogOut size={22} className="flex-shrink-0 transition-transform group-hover:scale-110" />
          </button>

          <ConnectionBadge connected={connected} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-50 flex-shrink-0">
          {/* Hamburger for Mobile */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Buka menu mobile"
          >
            <LayoutDashboard size={20} />
          </button>

          {/* Sidebar Toggle for Desktop */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="hidden lg:flex p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Toggle sidebar"
          >
            <Grid3X3 size={18} />
          </button>

          <div className="flex items-center gap-3 overflow-hidden">
            <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 hidden sm:block" />
            <div className="flex items-center gap-2 text-xs font-medium truncate">
              <span className="text-muted-foreground hidden md:inline">{BRAND_NAME}</span>
              <ChevronRight size={14} className="text-muted-foreground/50 hidden md:inline" />
              <span className="text-foreground font-bold">{moduleLabels[activeModule]}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:gap-4">
            {seeding && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
                <RefreshCw size={12} className="animate-spin text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Sync</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTtsEnabled(v => !v)}
                className={`p-2 rounded-lg border transition-all ${ttsEnabled
                    ? "bg-green-500/10 border-green-500/20 text-green-500 shadow-sm"
                    : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                title="TTS Toggle"
              >
                {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={() => speak("Cek suara.")}
                className="hidden sm:flex p-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
                title="Test TTS"
              >
                <Volume2 size={16} />
              </button>

              <button
                onClick={() => setShowTtsSettings(true)}
                className="p-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
                title="Pengaturan Suara (TTS)"
              >
                <Settings size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-bold text-xs uppercase tracking-wider" title="Berikan PIN ini kepada tamu jika mereka tidak dapat melakukan validasi GPS otomatis">
              <Key size={12} className="animate-pulse" />
              <span className="text-[9px] uppercase font-black tracking-widest hidden sm:inline mr-1 text-slate-400">PIN MEJA:</span>
              <span>{getDailyVerificationPIN()}</span>
            </div>

            <ThemeToggle />

            <button onClick={() => setActiveModule("orders")} className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={18} />
              {(criticalAlerts + pendingOrdersCount) > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-card" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-scroll px-0 lg:px-10 pb-40 pb-safe scroll-smooth custom-scrollbar relative">
          <ErrorBoundary key={activeModule}>
          <div className="max-w-full mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-0">
            {activeModule === "transaksi" && (
              <div className="space-y-5">
                <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-2 flex items-center justify-between">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setTransaksiSubModule("summary")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${transaksiSubModule === "summary" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => setTransaksiSubModule("laporan")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${transaksiSubModule === "laporan" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Laporan
                    </button>
                  </div>

                  {/* Filter Button */}
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                  >
                    <Calendar size={12} className="text-primary" />
                    {dateRange?.from && dateRange?.to ? (
                      <span>{format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM")}</span>
                    ) : (
                      <span>Filter Date</span>
                    )}
                  </button>
                </div>

                <div className="px-4 lg:px-0">
                  {/* Date Picker Modal */}
                  {showDatePicker && (
                    <div className="fixed inset-0 bg-black/40 dark:bg-black/ backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                      <div className="relative max-w-4xl w-full">
                        <button
                          onClick={() => setShowDatePicker(false)}
                          title="Tutup"
                          className="absolute -top-12 right-0 text-white/60 hover:text-white p-2"
                        >
                          <XCircle size={24} />
                        </button>
                        <div className="bg-[#141418] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                          <DateRangePicker
                            onSelect={(range) => setDateRange(range)}
                            onClose={() => setShowDatePicker(false)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {transaksiSubModule === "summary" && <DashboardModule transactions={filteredTransactions} liveOrders={liveOrders} connected={connected} onTransaction={handleTransaction} />}
                  {transaksiSubModule === "laporan" && <LaporanModule transactions={filteredTransactions} />}
                </div>
              </div>
            )}

            {activeModule === "orders" && <div className="px-4 lg:px-0"><OrdersModule orders={liveOrders} onRefresh={loadOrders} connected={connected} onNavigateToKasir={(orderId) => { setAutoSelectOrderId(orderId); setActiveModule("kasir"); }} /></div>}

            {activeModule === "stok" && (
              <div className="space-y-5">
                <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-2 flex items-center gap-2">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setStokSubModule("bahan")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${stokSubModule === "bahan" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Bahan Baku
                    </button>
                    <button
                      onClick={() => setStokSubModule("asset")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${stokSubModule === "asset" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Asset Restoran
                    </button>
                  </div>
                </div>

                <div className="px-4 lg:px-0">
                  {stokSubModule === "bahan" && <InventarisModule inventory={inventory} logs={inventoryLogs} onAdd={addInventory} onUpdate={updateInventory} onDelete={deleteInventory} />}
                  {stokSubModule === "asset" && <AssetModule />}
                </div>
              </div>
            )}

            {activeModule === "sdm" && (
              <div className="space-y-5">
                <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-2 flex items-center justify-between">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setSdmSubModule("karyawan")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${sdmSubModule === "karyawan" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Daftar Karyawan
                    </button>
                    <button
                      onClick={() => setSdmSubModule("shift")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${sdmSubModule === "shift" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Jadwal Shift
                    </button>
                  </div>

                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                  >
                    <Calendar size={12} className="text-primary" />
                    {dateRange?.from && dateRange?.to ? (
                      <span>{format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM")}</span>
                    ) : (
                      <span>Filter Date</span>
                    )}
                  </button>
                </div>

                <div className="px-4 lg:px-0">
                  {sdmSubModule === "karyawan" && <KaryawanModule />}
                  {sdmSubModule === "shift" && <JadwalShift dateRange={dateRange} />}
                </div>
              </div>
            )}

            {activeModule === "hpp" && <div className="px-0"><KalkulatorHPP /></div>}

            {activeModule === "kasir" && (
              <div className="space-y-5">
                <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-2 flex items-center gap-2">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 flex-wrap gap-1">
                    <button
                      onClick={() => setKasirSubModule("pos")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${kasirSubModule === "pos" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Kasir
                    </button>
                    <button
                      onClick={() => setKasirSubModule("promo")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${kasirSubModule === "promo" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Promo
                    </button>
                    <button
                      onClick={() => setKasirSubModule("petty")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${kasirSubModule === "petty" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Petty Cash
                    </button>
                    <button
                      onClick={() => setKasirSubModule("reservasi")}
                      className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${kasirSubModule === "reservasi" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"}`}
                    >
                      Reservasi
                      {reservations.filter(r => r.status === "pending").length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse inline-block" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="px-4 lg:px-0">
                  {kasirSubModule === "pos" && <KasirModule menuItems={menuItems} onTransaction={handleTransaction} promos={promos} tables={tables} orders={liveOrders} autoSelectOrderId={autoSelectOrderId} onClearAutoSelect={() => setAutoSelectOrderId(null)} transactions={filteredTransactions} />}
                  {kasirSubModule === "promo" && <PromoModule promos={promos} onTogglePromo={togglePromo} onAddPromo={addPromo} />}
                  {kasirSubModule === "petty" && <PettyCashModule />}
                  {kasirSubModule === "reservasi" && <ReservasiModule reservations={reservations} onUpdateStatus={handleUpdateReservationStatus} />}
                </div>
              </div>
            )}

            {activeModule === "meja" && <div className="px-4 lg:px-0"><MejaModule tables={tables} onUpdateStatus={handleUpdateTableStatus} /></div>}

            {activeModule === "menu" && (
              <div className="px-4 lg:px-0">
                <MenuManagement
                  menuItems={menuItems}
                  connected={connected}
                  loading={seeding}
                  onSaveItem={handleSaveMenuItem}
                  onDeleteItem={handleDeleteMenuItem}
                  onToggleAvailability={handleToggleAvailability}
                  onReorder={handleReorderMenuItems}
                />
              </div>
            )}

            {activeModule === "qr-menu" && <div className="px-4 lg:px-0"><QrMenuModule tables={tables} /></div>}

            {activeModule === "metrics" && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-sm">Supabase Metrics</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Pantau performa database dan server Supabase Anda</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <p className="text-xs text-muted-foreground">Dokumentasi resmi untuk mengintegrasikan metrik Supabase menggunakan OpenTelemetry.</p>
                  <a
                    href="https://supabase.com/docs/guides/telemetry/metrics/vendor-agnostic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"
                  >
                    <ExternalLink size={14} /> Buka Dokumentasi Metrik
                  </a>
                  <div className="border border-border rounded-lg overflow-hidden h-[600px] flex flex-col items-center justify-center bg-muted/10">
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
                        <Activity size={24} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Dalam Tahap Pengembangan</p>
                      <p className="text-xs text-muted-foreground max-w-sm">Fitur metrik sedang dikembangkan untuk memantau performa database secara langsung.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* TTS Customization Settings Modal */}
      {showTtsSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowTtsSettings(false)}>
          <div className="bg-[#f4efe9] dark:bg-[#1a0f0a] border border-[#a76d33]/20 rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[#a76d33]/10">
              <div className="flex items-center gap-2 text-[#4e3629] dark:text-[#f4efe9] mb-1">
                <Settings size={20} className="text-[#a76d33]" />
                <h3 className="font-bold text-base">Pengaturan Sistem & Keamanan</h3>
              </div>
              <p className="text-xs text-muted-foreground">Kustomisasi pemberitahuan suara & keamanan POS.</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Presets Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4e3629] dark:text-[#f4efe9] uppercase tracking-wider">
                  Preset Suara:
                </label>
                <select
                  value={
                    ttsVoice === "" && ttsRate === 0.95 && ttsPitch === 1.15 ? "default_female" :
                    ttsVoice === "" && ttsRate === 1.10 && ttsPitch === 1.20 ? "fast_female" :
                    ttsVoice === "" && ttsRate === 0.95 && ttsPitch === 0.85 ? "standard_male" :
                    ttsVoice === "" && ttsRate === 1.00 && ttsPitch === 1.00 ? "browser_default" :
                    "custom"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "default_female") saveTtsSettings(0.95, 1.15, "");
                    else if (val === "fast_female") saveTtsSettings(1.10, 1.20, "");
                    else if (val === "standard_male") saveTtsSettings(0.95, 0.85, "");
                    else if (val === "browser_default") saveTtsSettings(1.00, 1.00, "");
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#a76d33]/20 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-[#a76d33]"
                >
                  <option value="default_female">Default Wanita (Kedai Elvera 57)</option>
                  <option value="fast_female">Wanita (Cepat & Jelas)</option>
                  <option value="standard_male">Pria Standar (Deep Voice)</option>
                  <option value="browser_default">Default Browser (Bawaan)</option>
                  <option value="custom">Kustom (Atur Manual)</option>
                </select>
              </div>

              {/* Voice Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4e3629] dark:text-[#f4efe9] uppercase tracking-wider">
                  Pilih Pengisi Suara:
                </label>
                {availableVoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Memuat suara sistem...</p>
                ) : (
                  <select
                    value={ttsVoice}
                    onChange={(e) => saveTtsSettings(ttsRate, ttsPitch, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#a76d33]/20 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-[#a76d33]"
                  >
                    <option value="">-- Gunakan Suara Default --</option>
                    {availableVoices.map((v, i) => (
                      <option key={i} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Speech Rate (Speed) */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-bold text-[#4e3629] dark:text-[#f4efe9] uppercase tracking-wider">
                  <span>Kecepatan Bicara:</span>
                  <span className="text-[#a76d33]">{ttsRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={ttsRate}
                  onChange={(e) => saveTtsSettings(parseFloat(e.target.value), ttsPitch, ttsVoice)}
                  className="w-full accent-[#a76d33]"
                />
              </div>

              {/* Pitch */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-bold text-[#4e3629] dark:text-[#f4efe9] uppercase tracking-wider">
                  <span>Tinggi Nada (Pitch):</span>
                  <span className="text-[#a76d33]">{ttsPitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={ttsPitch}
                  onChange={(e) => saveTtsSettings(ttsRate, parseFloat(e.target.value), ttsVoice)}
                  className="w-full accent-[#a76d33]"
                />
              </div>

              {/* App Pinning / PWA Security Lock */}
              <div className="mt-5 pt-4 border-t border-[#a76d33]/10 space-y-2 select-none">
                <div className="flex items-center gap-2 text-[#4e3629] dark:text-[#f4efe9]">
                  <Smartphone size={14} className="text-[#a76d33] animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Kunci Layar Tablet (App Pinning)</span>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 text-[10px] text-muted-foreground leading-relaxed">
                  Jika Anda ingin memastikan kasir tidak bisa keluar dari aplikasi PWA ini (misalnya untuk mencegah mereka membuka YouTube atau browsing web lain), Anda bisa mengaktifkan fitur <strong>App Pinning (Sematkan Aplikasi)</strong> yang ada di menu <strong>Settings &gt; Security</strong> pada tablet Android Anda. Ini akan mengunci layar khusus hanya untuk PWA POS tersebut.
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-muted/40 border-t border-[#a76d33]/10 flex gap-3">
              <button
                onClick={testTtsSpeech}
                className="flex-1 py-2.5 rounded-xl border border-[#a76d33]/30 hover:bg-[#a76d33]/10 text-xs font-bold text-[#a76d33] transition-colors flex items-center justify-center gap-1.5"
              >
                <Volume2 size={14} /> Tes Suara
              </button>
              <button
                onClick={() => setShowTtsSettings(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#a76d33] hover:bg-[#c28445] text-white text-xs font-bold transition-all active:scale-95 flex items-center justify-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
