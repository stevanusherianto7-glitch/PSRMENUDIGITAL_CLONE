/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI ADALAH MODUL PUSAT KENDALI (ADMIN) SISTEM PAWON SALAM.
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
  Calendar, Calculator, Briefcase
} from "lucide-react";
import QRCode from "react-qr-code";
import { supabase } from "../../lib/supabase";

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
export const GUEST_BASE_URL = "https://psrmenudigital.vercel.app";

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
  const [kasirSubModule, setKasirSubModule] = useState<"pos" | "promo" | "petty">("pos");
  const [autoSelectOrderId, setAutoSelectOrderId] = useState<string | null>(null);

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
  const [connected, setConnected] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // TTS — hanya untuk pesanan pending (pesanan masuk baru)
  const pendingOrders = liveOrders.filter(o => o.status === "pending");
  const { speak } = useTTS(pendingOrders, ttsEnabled);

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
      if (parsed.role !== "admin") { navigate("/waiter"); return; }
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
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 jam

      const active = orders.filter(o => {
        if (o.status === "cancelled") return false;
        const createdAt = new Date(o.created_at).getTime();
        // Order hari ini saja
        if (createdAt < todayStart.getTime()) return false;
        // Served orders: tampilkan sepanjang hari ini (untuk kasir)
        if (o.status === "served") return true;
        // Active orders (pending/cooking/ready): maks 4 jam
        return (now - createdAt) < MAX_AGE_MS;
      });
      setLiveOrders(active);
    } catch (e) { console.log("Error loading orders:", e); }
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

    async function initSupabase() {
      setSeeding(true);
      try {
        const { error: pingError } = await supabase.from("meja").select("id").limit(1);
        if (pingError) throw pingError;
        setConnected(true);

        const { data: mejaRows } = await supabase.from("meja").select("*");
        if (!mejaRows || mejaRows.length === 0) {
          await supabase.from("meja").insert(SEED_TABLES.map(t => ({ id: t.id, seat: t.seat, status: t.status, pax: null, total: null, duration: null, orders: null })));
        } else {
          setTables(mejaRows.map((r: any) => ({ id: r.id, seat: r.seat, status: r.status, pax: r.pax, total: r.total, duration: r.duration, orders: r.orders })));
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

        mejaChannel = supabase.channel("meja-admin-" + Date.now())
          .on("postgres_changes", { event: "*", schema: "public", table: "meja" }, payload => {
            if (payload.eventType === "UPDATE") {
              const r = payload.new as any;
              setTables(prev => prev.map(t => t.id === r.id ? { id: r.id, seat: r.seat, status: r.status, pax: r.pax, total: r.total, duration: r.duration, orders: r.orders } : t));
            }
          }).subscribe();

        txChannel = supabase.channel("tx-admin-" + Date.now())
          .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, payload => {
            if (payload.eventType === "INSERT") {
              const r = payload.new as any;
              const newTx: Transaction = { id: r.id, table_id: r.table_id, items: r.items || [], subtotal: r.subtotal, tax: r.tax, total: r.total, method: r.method, created_at: r.created_at };
              setTransactions(prev => [newTx, ...prev].slice(0, 200));
            } else if (payload.eventType === "UPDATE") {
              const r = payload.new as any;
              const updatedTx: Transaction = { id: r.id, table_id: r.table_id, items: r.items || [], subtotal: r.subtotal, tax: r.tax, total: r.total, method: r.method, created_at: r.created_at };
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
    };
  }, []);

  const handleTransaction = useCallback(async (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    if (connected) {
      // 1. Simpan ke tabel transactions (utama)
      const { error } = await supabase.from("transactions").insert({
        id: tx.id,
        table_id: tx.table_id,
        items: tx.items,
        subtotal: tx.subtotal,
        discount: tx.discount,
        discount_amount: tx.discount_amount,
        tax: tx.tax,
        total: tx.total,
        method: tx.method,
        created_at: tx.created_at
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
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
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
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

                  {transaksiSubModule === "summary" && <DashboardModule transactions={filteredTransactions} liveOrders={liveOrders} connected={connected} />}
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
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
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
                  </div>
                </div>

                <div className="px-4 lg:px-0">
                  {kasirSubModule === "pos" && <KasirModule menuItems={menuItems} onTransaction={handleTransaction} promos={promos} tables={tables} orders={liveOrders} autoSelectOrderId={autoSelectOrderId} onClearAutoSelect={() => setAutoSelectOrderId(null)} />}
                  {kasirSubModule === "promo" && <PromoModule promos={promos} onTogglePromo={togglePromo} onAddPromo={addPromo} />}
                  {kasirSubModule === "petty" && <PettyCashModule />}
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
    </div>
  );
}
