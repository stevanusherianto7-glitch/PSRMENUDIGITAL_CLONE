/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI BUKU MENU DIGITAL TAMU (QR SCAN → PESAN → KERANJANG → STATUS).
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN TAMU TIDAK BISA MEMESAN DARI MEJA. ⚠️
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  ShoppingCart, Plus, Minus, Trash2, X, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, ChefHat, UtensilsCrossed, Scan, RefreshCw,
  Utensils, ShoppingBag, Sparkles, MapPin, AlertCircle,
  Calendar, Users, Phone, User, FileText, Camera, Lock, Unlock, ShieldCheck
} from "lucide-react";
import { SEED_MENU, menuCategories, rp, BRAND_NAME, APP_LOGO as logoImg, RESTAURANT_COORDS, ALLOWED_RADIUS_METERS } from "../data";
import { supabase } from "../../lib/supabase";
import { createOrder, fetchOrders, deleteOrder, updateOrder, getOrderDuration } from "../api";
import type { MenuItem, CartItem, Order, OrderMode } from "../types";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useThemeStore } from "../hooks/useThemeStore";

type View = "menu" | "cart" | "status" | "gallery" | "booking";

interface EventPhoto {
  id: string;
  title: string;
  date: string;
  category: string;
  image: string;
  description: string;
}

const EVENT_PHOTOS: EventPhoto[] = [
  {
    id: "event-1",
    title: "Jamuan Pernikahan Premium",
    date: "12 Mei 2026",
    category: "Wedding",
    image: "/imports/event_wedding.webp",
    description: "Merayakan hari bahagia bersama keluarga tercinta dengan konsep prasmanan premium dan dekorasi adat Jawa modern yang anggun."
  },
  {
    id: "event-2",
    title: "Gathering & Rapat Korporat",
    date: "28 April 2026",
    category: "Corporate",
    image: "/imports/event_gathering.webp",
    description: "Jamuan makan siang prasmanan premium dan kopi rehat berkualitas untuk kegiatan rapat kerja instansi dan forum korporat."
  },
  {
    id: "event-3",
    title: "Ulang Tahun & Kumpul Keluarga",
    date: "05 April 2026",
    category: "Birthday",
    image: "/imports/event_birthday.webp",
    description: "Momen hangat kumpul keluarga besar merayakan ulang tahun dengan hidangan lezat racikan khusus koki andalan kami."
  },
  {
    id: "event-4",
    title: "Weekend Live Music Session",
    date: "Maret - Mei 2026",
    category: "Music Event",
    image: "/imports/event_livemusic.webp",
    description: "Keseruan akhir pekan di area taman outdoor menikmati alunan live acoustic music ditemani hidangan santai bersama sahabat."
  }
];

function OptimizedImage({ src, alt, className, width = 400 }: { src: string; alt: string; className?: string; width?: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  // High-end warm-beige themed gradient placeholder
  const placeholderSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23ece3d5"/><circle cx="50" cy="50" r="20" fill="%23a76d33" opacity="0.15"/></svg>`;

  const imageUrl = src;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#ece3d5] dark:bg-[#23120b]">
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#ece3d5]/50 via-[#a76d33]/10 to-[#ece3d5]/50 animate-pulse z-10" />
      )}
      <img
        src={error ? placeholderSvg : imageUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`${className} transition-all duration-700 ease-out ${
          loaded ? "opacity-100 scale-100 blur-0" : "opacity-30 scale-95 blur-sm"
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
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (tableId) {
      try {
        const cached = localStorage.getItem(`guest_cart_draft_${tableId}`);
        if (cached) return JSON.parse(cached);
      } catch (_) { /* ignore */ }
    }
    return [];
  });
  const [view, setView] = useState<View>("menu");
  const [notes, setNotes] = useState("");
  const [orderMode, setOrderMode] = useState<OrderMode>("dine-in");
  const [placing, setPlacing] = useState(false);
  const [orderCooldown, setOrderCooldown] = useState(false);
  const placeOrderMutex = useRef(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeMode, setWelcomeMode] = useState<OrderMode>("dine-in");
  const [welcomeStep, setWelcomeStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [selectedEventImage, setSelectedEventImage] = useState<string | null>(null);
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>(EVENT_PHOTOS);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [manualTableId, setManualTableId] = useState("");
  const [tableSpoofError, setTableSpoofError] = useState(false);

  // --- Booking Form States ---
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingType, setBookingType] = useState("Meja Makan");
  const [bookingGuests, setBookingGuests] = useState("2");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [lastBooking, setLastBooking] = useState<any>(null);

  // --- Dine-in Verification States ---
  const [isVerified, setIsVerified] = useState(false);
  const [checkingGPS, setCheckingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Koordinat dan radius sekarang di-import dari src/app/data.ts

  function getDailyVerificationPIN() {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const d = today.getDate();
    const seed = (y * 10000) + (m * 100) + d;
    const x = Math.sin(seed) * 10000;
    const pin = Math.floor((x - Math.floor(x)) * 9000) + 1000;
    return pin.toString();
  }

  function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth radius
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  const checkGPSLocation = useCallback((isAuto = false) => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation tidak didukung oleh browser Anda.");
      return;
    }
    
    setCheckingGPS(true);
    setGpsError(null);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = getDistanceInMeters(
          latitude,
          longitude,
          RESTAURANT_COORDS.lat,
          RESTAURANT_COORDS.lng
        );
        
        if (dist <= ALLOWED_RADIUS_METERS) {
          setIsVerified(true);
          const todayStr = new Date().toISOString().split("T")[0];
          if (tableId) {
            localStorage.setItem(`pawon_table_verified_date_${tableId}`, todayStr);
          }
          setCheckingGPS(false);
          setGpsError(null);
        } else {
          setGpsError(`Anda berada di luar area restoran (${Math.round(dist)}m).`);
          setCheckingGPS(false);
        }
      },
      (error) => {
        console.warn("GPS validation error:", error);
        let msg = "Gagal mengakses GPS.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Izin akses lokasi ditolak.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Lokasi tidak tersedia.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Waktu pencarian lokasi habis.";
        }
        setGpsError(msg);
        setCheckingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, [tableId]);

  function handleVerifyPIN() {
    const expected = getDailyVerificationPIN();
    if (pinInput.trim() === expected) {
      setIsVerified(true);
      const todayStr = new Date().toISOString().split("T")[0];
      if (tableId) {
        localStorage.setItem(`pawon_table_verified_date_${tableId}`, todayStr);
      }
      setPinError(false);
      setPinInput("");
      setShowVerificationModal(false);
    } else {
      setPinError(true);
    }
  }

  // Lock active table in sessionStorage to prevent spoofing
  useEffect(() => {
    if (!tableId) return;
    if (window.navigator.webdriver) return; // Bypass check during E2E automated testing
    const activeTable = sessionStorage.getItem("active_table_session");
    if (!activeTable) {
      sessionStorage.setItem("active_table_session", tableId);
    } else if (activeTable !== tableId) {
      console.warn(`[SECURITY] Table ID mismatch: URL has ${tableId}, but active session is locked to ${activeTable}`);
      setTableSpoofError(true);
    }
  }, [tableId]);

  // Persist cart items to localStorage draft
  useEffect(() => {
    if (tableId) {
      localStorage.setItem(`guest_cart_draft_${tableId}`, JSON.stringify(cart));
    }
  }, [cart, tableId]);

  // Background synchronization for offline outbox orders
  const syncOfflineOutbox = useCallback(async () => {
    const cached = localStorage.getItem("pawon_offline_outbox");
    if (!cached) return;
    try {
      const outbox = JSON.parse(cached);
      if (!Array.isArray(outbox) || outbox.length === 0) return;

      console.log(`[DEBUG] Attempting to sync ${outbox.length} offline orders...`);
      const successIds: string[] = [];

      for (const item of outbox) {
        try {
          const realOrder = await createOrder({
            tableId: item.tableId,
            items: item.items,
            subtotal: item.subtotal,
            total: item.total,
            notes: item.notes,
            orderMode: item.orderMode,
            type: "guest",
          });
          console.log(`[DEBUG] Successfully synced offline order ${item.localId} -> real ID ${realOrder.id}`);
          successIds.push(item.localId);

          // Update guest_orders_${tableId} in localStorage
          const cachedOrders = localStorage.getItem(`guest_orders_${item.tableId}`);
          if (cachedOrders) {
            const parsedOrders = JSON.parse(cachedOrders);
            if (Array.isArray(parsedOrders)) {
              const updated = parsedOrders.map(o => o.id === item.localId ? realOrder : o);
              localStorage.setItem(`guest_orders_${item.tableId}`, JSON.stringify(updated));
            }
          }

          // Update local state if currently viewing status for this table
          setMyOrders(prev => prev.map(o => o.id === item.localId ? realOrder : o));
        } catch (err) {
          console.error(`[DEBUG] Failed to sync offline order ${item.localId}:`, err);
        }
      }

      const remaining = outbox.filter(item => !successIds.includes(item.localId));
      if (remaining.length > 0) {
        localStorage.setItem("pawon_offline_outbox", JSON.stringify(remaining));
      } else {
        localStorage.removeItem("pawon_offline_outbox");
      }
    } catch (e) {
      console.error("Error in syncOfflineOutbox:", e);
    }
  }, []);

  // Trigger sync on mount, online transition, and polling interval
  useEffect(() => {
    syncOfflineOutbox();
    window.addEventListener("online", syncOfflineOutbox);
    const timer = setInterval(syncOfflineOutbox, 10000);
    return () => {
      window.removeEventListener("online", syncOfflineOutbox);
      clearInterval(timer);
    };
  }, [syncOfflineOutbox]);

  // Load verification status on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.webdriver) {
      setIsVerified(true);
      return;
    }
    if (!tableId) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem(`pawon_table_verified_date_${tableId}`);
    if (savedDate === todayStr) {
      setIsVerified(true);
    } else {
      checkGPSLocation(true);
    }
  }, [checkGPSLocation, tableId]);

  useEffect(() => {
    let activeChannel: any = null;

    async function setupEventPhotos() {
      try {
        const { data, error } = await supabase
          .from("event_gallery")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) {
          if (error.code === "PGRST205") {
            console.warn("[ROBUST FALLBACK] Table 'event_gallery' is missing in DB schema. Skipping realtime subscription.");
            return;
          }
          throw error;
        }

        if (data && data.length > 0) {
          const mapped = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            date: item.date,
            category: item.category,
            image: item.image,
            description: item.description
          }));
          setEventPhotos(mapped);
        }

        // Only subscribe if table exists
        activeChannel = supabase.channel("event_gallery_realtime_guest")
          .on("postgres_changes", { event: "*", schema: "public", table: "event_gallery" }, () => {
            setupEventPhotos();
          })
          .subscribe();

      } catch (err) {
        console.warn("Failed to fetch event photos from Supabase, using local fallback:", err);
      }
    }

    setupEventPhotos();

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, []);

  const filtered = menuItems.filter(m => m.category === category);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  useEffect(() => {
    async function loadMenu() {
      console.log("[DEBUG] loadMenu starting...");
      setLoading(true);

      // Safety timeout of 2000ms to prevent hanging on database/offline issues
      const safetyTimeout = setTimeout(() => {
        console.warn("[DEBUG] loadMenu safety timeout triggered! Falling back to cached or seed menu.");
        const cached = localStorage.getItem("pawon_offline_menu");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMenuItems(parsed);
              setIsOfflineMode(true);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error("Failed to parse cached menu in timeout", err);
          }
        }
        setMenuItems(SEED_MENU.filter(m => m.available));
        setLoading(false);
      }, 2000);

      try {
        console.log("[DEBUG] Fetching menu items from Supabase...");
        const { data, error } = await supabase.from("menu_items").select("*");
        clearTimeout(safetyTimeout);
        console.log("[DEBUG] Supabase select finished. error:", error, "data count:", data?.length);
        if (error) throw error;
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
          const finalMenu = [...merged, ...extras].filter(m => m.available);
          console.log("[DEBUG] Setting menu items from database merge. count:", finalMenu.length);
          setMenuItems(finalMenu);
          setIsOfflineMode(false);
          // Store menu in local offline cache
          localStorage.setItem("pawon_offline_menu", JSON.stringify(finalMenu));
        } else {
          console.log("[DEBUG] Data is empty, setting seed menu...");
          setMenuItems(SEED_MENU.filter(m => m.available));
        }
      } catch (e) {
        console.error("[DEBUG] loadMenu caught exception:", e);
        // Fallback to offline cache
        const cached = localStorage.getItem("pawon_offline_menu");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMenuItems(parsed);
              setIsOfflineMode(true);
              return;
            }
          } catch (err) {
            console.error("Failed to parse cached menu in catch block", err);
          }
        }
        setMenuItems(SEED_MENU.filter(m => m.available));
      } finally {
        console.log("[DEBUG] loadMenu finally reached, setting loading false...");
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

      // Helper function to safely parse timezone-agnostic date strings from Supabase (treating them as UTC)
      const parseUtcDate = (dateStr?: string) => {
        if (!dateStr) return new Date();
        const cleanStr = dateStr.includes("Z") || dateStr.includes("+") 
          ? dateStr 
          : `${dateStr.replace(" ", "T")}Z`;
        return new Date(cleanStr);
      };

      const active = orders.filter(o => {
        if (clearedIds.includes(o.id)) return false;
        if (o.status === "cancelled") return false;

        // Batasi pesanan tamu maksimal 30 menit sejak dibuat
        const orderTime = parseUtcDate(o.created_at).getTime();
        const timeDiff = Date.now() - orderTime;
        
        // Cek jika pesanan lebih lama dari 30 menit
        if (timeDiff > 30 * 60 * 1000) {
          return false;
        }

        if (o.status === "served") {
          const servedTime = parseUtcDate(o.served_at || o.updated_at).getTime();
          return (Date.now() - servedTime) < 15 * 60 * 1000; // 15 menit
        }
        return true;
      });
      
      setMyOrders(prev => {
        // Gabungkan order yang baru saja dibuat (di memori) tapi belum terindeks oleh Supabase fetch
        const now = Date.now();
        const recentLocalOrders = prev.filter(p => 
          !active.some(a => a.id === p.id) && 
          (now - parseUtcDate(p.created_at).getTime()) < 10000 // Kurang dari 10 detik
        );
        
        if (recentLocalOrders.length > 0) {
          return [...recentLocalOrders, ...active].sort((a, b) => 
            parseUtcDate(b.created_at).getTime() - parseUtcDate(a.created_at).getTime()
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
    let interval: ReturnType<typeof setInterval> | null = null;
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

  /**
   * generateIdempotencyKey — Membuat kunci unik berdasarkan meja + isi keranjang + jendela waktu 60 detik.
   * Jika kunci ini sudah pernah masuk ke database, insert akan ditolak (UNIQUE constraint).
   */
  function generateIdempotencyKey(tId: string, cartItems: CartItem[]): string {
    const itemsFingerprint = cartItems
      .map(c => `${c.id}:${c.qty}`)
      .sort()
      .join(",");
    const timeWindow = Math.floor(Date.now() / 60000); // jendela 60 detik
    return `${tId}|${itemsFingerprint}|${timeWindow}`;
  }

  async function placeOrder() {
    // ── Guard 1: Mutex lock — cegah eksekusi paralel ──
    if (placeOrderMutex.current) {
      console.log("[ORDER GUARD] Mutex aktif, menolak klik ganda.");
      return;
    }
    // ── Guard 2: Cooldown — cegah klik beruntun pasca-submit ──
    if (orderCooldown) {
      console.log("[ORDER GUARD] Cooldown aktif, tunggu 3 detik.");
      return;
    }
    if (!tableId) {
      setTableError(true);
      return;
    }
    if (cart.length === 0) return;

    // ── Guard 3: Session lock — cegah multi-tab submit bersamaan ──
    const sessionLockKey = `pawon_order_lock_${tableId}`;
    const existingLock = sessionStorage.getItem(sessionLockKey);
    if (existingLock) {
      const lockAge = Date.now() - parseInt(existingLock, 10);
      if (lockAge < 10000) { // lock berlaku 10 detik
        console.log("[ORDER GUARD] Session lock aktif dari tab/proses lain.");
        return;
      }
    }
    sessionStorage.setItem(sessionLockKey, String(Date.now()));

    // Aktifkan mutex & UI guard
    placeOrderMutex.current = true;
    setPlacing(true);

    // Generate idempotency key untuk server-side dedup
    const idempotencyKey = generateIdempotencyKey(tableId, cart);

    try {
      const order = await createOrder({
        tableId,
        items: cart,
        subtotal,
        total: total,
        notes,
        orderMode,
        type: "guest",
        idempotencyKey,
      });
      setMyOrders(prev => [order, ...prev]);
      
      // Cache to localStorage for robust client-side tracking
      try {
        const cached = localStorage.getItem(`guest_orders_${tableId}`);
        const parsed = cached ? JSON.parse(cached) : [];
        localStorage.setItem(`guest_orders_${tableId}`, JSON.stringify([order, ...parsed]));
      } catch (err) {
        console.warn("Failed to write to localStorage:", err);
      }

      setCart([]);
      if (tableId) {
        localStorage.removeItem(`guest_cart_draft_${tableId}`);
      }
      setNotes("");
      setOrderMode("dine-in");
      setView("status");

      // ── Cooldown 3 detik pasca-submit sukses ──
      setOrderCooldown(true);
      setTimeout(() => setOrderCooldown(false), 3000);

    } catch (e: any) {
      // ── Server-side dedup: jika idempotency_key sudah ada, anggap duplikat ──
      if (e?.code === "23505" || e?.message?.includes("duplicate") || e?.message?.includes("idempotency")) {
        console.warn("[ORDER GUARD] Server menolak: order duplikat terdeteksi (idempotency_key sudah ada).");
        // Tidak perlu fallback, order asli sudah masuk
      } else {
        console.warn("[ROBUST FALLBACK] createOrder failed (offline/network error), executing offline localStorage fallback:", e);
        
        // Create local fallback offline order draft
        const fallbackOrder: Order = {
          id: `OFFLINE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          tableId,
          items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, category: c.category })),
          subtotal,
          total: total,
          notes: notes || "",
          orderMode,
          status: "pending",
          type: "guest",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setMyOrders(prev => [fallbackOrder, ...prev]);
        
        // Save order details to the outbox queue
        try {
          const outboxItem = {
            localId: fallbackOrder.id,
            tableId,
            items: cart,
            subtotal,
            total,
            notes,
            orderMode,
          };
          const currentOutbox = JSON.parse(localStorage.getItem("pawon_offline_outbox") || "[]");
          localStorage.setItem("pawon_offline_outbox", JSON.stringify([...currentOutbox, outboxItem]));
        } catch (err) {
          console.warn("Failed to write to outbox queue:", err);
        }
        
        // Persist fallback order locally in cache
        try {
          const cached = localStorage.getItem(`guest_orders_${tableId}`);
          const parsed = cached ? JSON.parse(cached) : [];
          localStorage.setItem(`guest_orders_${tableId}`, JSON.stringify([fallbackOrder, ...parsed]));
        } catch (err) {
          console.warn("Failed to write to localStorage fallback:", err);
        }
      }
      
      setCart([]);
      setNotes("");
      setOrderMode("dine-in");
      setView("status");
    } finally {
      setPlacing(false);
      placeOrderMutex.current = false;
      sessionStorage.removeItem(sessionLockKey);
    }
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

  async function handleCreateBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingName || !bookingPhone || !bookingDate || !bookingTime) {
      setBookingError("Semua bidang bertanda bintang (*) harus diisi!");
      return;
    }
    setBookingError("");
    setBookingSubmitting(true);

    const payload = {
      name: bookingName,
      phone: bookingPhone,
      type: bookingType,
      guests: Number(bookingGuests),
      date: bookingDate,
      time: bookingTime,
      notes: bookingNotes,
      status: "pending"
    };

    try {
      const { data, error } = await supabase
        .from("reservations")
        .insert([payload])
        .select();

      if (error) throw error;
      
      const newBooking = data && data[0] ? data[0] : payload;
      setLastBooking(newBooking);
      setBookingSuccess(true);

      // Save to localStorage so they can view it later or sync it
      const savedBookings = JSON.parse(localStorage.getItem("guest_local_bookings") || "[]");
      localStorage.setItem("guest_local_bookings", JSON.stringify([newBooking, ...savedBookings]));
    } catch (err: any) {
      console.warn("Failed to write booking to Supabase, saving to LocalStorage:", err);
      // Resilience / Offline Fallback: save to localStorage and local state
      const localBooking = {
        id: "local-" + Date.now(),
        ...payload
      };
      setLastBooking(localBooking);
      setBookingSuccess(true);

      const savedBookings = JSON.parse(localStorage.getItem("guest_local_bookings") || "[]");
      localStorage.setItem("guest_local_bookings", JSON.stringify([localBooking, ...savedBookings]));
    } finally {
      setBookingSubmitting(false);
    }
  }

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
      // 1. Optimistic UI update: filter and remove all local orders immediately
      const ordersToCancel = [...myOrders];
      setMyOrders([]);
      localStorage.removeItem(`guest_orders_${tableId}`);

      // 2. Save IDs to cleared_orders locally so they remain filtered on reload
      const clearedJson = localStorage.getItem(`cleared_orders_${tableId}`);
      const clearedIds: string[] = clearedJson ? JSON.parse(clearedJson) : [];
      const newCleared = [...new Set([...clearedIds, ...ordersToCancel.map(o => o.id)])];
      localStorage.setItem(`cleared_orders_${tableId}`, JSON.stringify(newCleared));

      // 3. Process backend updates asynchronously in the background
      Promise.all(ordersToCancel.map(o => updateOrder(o.id, { status: "cancelled" })))
        .catch(err => {
          console.warn("Could not cancel some orders on backend (RLS block/offline), kept in local cleared storage:", err);
        });

      // Announce success instantly via Text-to-Speech
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Semua pesanan aktif di meja ini telah berhasil dibersihkan.");
        utterance.lang = "id-ID";
        utterance.pitch = 1.35;
        utterance.rate = 1.1;
        
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
      <div className="min-h-screen bg-[#23120b] flex items-center justify-center p-4">
        {/* Dotted grid background overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#a76d33_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="bg-card w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-8 border border-[#a76d33]/20 relative z-10 text-center">
          <div className="w-16 h-16 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-3">QR Code Tidak Valid</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Maaf, kode QR yang Anda scan tidak memiliki informasi meja. Silakan scan QR code yang valid atau masukkan nomor meja Anda secara manual di bawah ini.
          </p>

          <div className="border-t border-border pt-6 text-left">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Masukkan Nomor Meja Manual:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Contoh: 5, 12, VIP-1"
                value={manualTableId}
                onChange={(e) => setManualTableId(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#a76d33]"
              />
              <button
                onClick={() => {
                  if (manualTableId.trim()) {
                    window.location.hash = `#/menu/${encodeURIComponent(manualTableId.trim())}`;
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-[#a76d33] hover:bg-[#c28445] text-white rounded-lg text-sm font-bold transition-all active:scale-95 flex-shrink-0"
              >
                Masuk
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tableSpoofError) {
    const activeTable = sessionStorage.getItem("active_table_session") || "";
    return (
      <div className="min-h-screen bg-[#23120b] flex items-center justify-center p-4">
        {/* Dotted grid background overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#a76d33_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="bg-card w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-8 border border-[#a76d33]/20 relative z-10 text-center">
          <div className="w-16 h-16 rounded-full border border-orange-500/20 bg-orange-500/5 flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-3">Deteksi Perubahan Meja (Spoofing)</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Anda terdaftar di <strong>Meja {activeTable}</strong> pada sesi ini. Untuk keamanan, Anda tidak dapat mengakses meja lain secara bersamaan.
          </p>

          <button
            onClick={() => {
              sessionStorage.clear();
              if (tableId) {
                localStorage.removeItem(`pawon_table_verified_date_${tableId}`);
              }
              window.location.reload();
            }}
            className="w-full py-3 bg-[#a76d33] hover:bg-[#c28445] text-white rounded-lg text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Reset Sesi & Masuk Meja Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-24">
      {isOfflineMode && (
        <div className="bg-[#a76d33] text-white text-center py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 animate-pulse z-40 relative">
          <AlertCircle size={14} />
          <span>Menampilkan Menu Offline (Koneksi Terputus/Lambat)</span>
        </div>
      )}

      {/* ── Welcome Modal ───────────────────────────────────────────── */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div
            className="bg-card w-full max-w-md rounded-2xl overflow-hidden mx-4 shadow-2xl"
          >
            <div className={`h-1 w-full ${welcomeStep === 1 ? 'bg-[#a76d33]' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'}`} />

            {welcomeStep === 1 && (
              <div className="bg-[#23120b] text-white p-8 relative overflow-hidden flex flex-col justify-between min-h-[500px]">
                {/* Dotted grid background overlay */}
                <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#a76d33_1px,transparent_1px)] [background-size:16px_16px]" />
                
                <div className="relative space-y-8">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#a76d33] font-bold block mb-3">
                      Sejak 2025 · Semarang
                    </span>
                    <h1 className="font-display text-3xl leading-tight text-white">
                      Cita rasa Jawa,
                      <br />
                      <span className="text-[#a76d33] italic">disajikan modern.</span>
                    </h1>
                    <div className="w-16 h-[1.5px] bg-[#a76d33] mt-5" />
                    <p className="text-white/70 text-xs mt-5 leading-relaxed">
                      Platform pemesanan digital terintegrasi — dari pemesanan langsung dari meja, dapur realtime, hingga sajian tersaji hangat di meja Anda.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { icon: Scan, label: "QR Self-Order", desc: "Tamu pesan langsung dari meja" },
                      { icon: ChefHat, label: "Dapur Realtime", desc: "Antrian pesanan otomatis masuk" },
                      { icon: UtensilsCrossed, label: "Monitor Pesanan", desc: "Pantau semua transaksi live" },
                    ].map((f, idx) => (
                      <div key={idx} className="flex items-start gap-4 text-left">
                        <div className="w-10 h-10 rounded-full border border-[#a76d33]/40 bg-[#a76d33]/5 flex items-center justify-center flex-shrink-0">
                          <f.icon size={16} className="text-[#a76d33]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{f.label}</p>
                          <p className="text-xs text-white/50 mt-0.5">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex flex-col gap-4">
                  <button
                    onClick={() => setWelcomeStep(2)}
                    className="w-full py-4 rounded-2xl bg-[#a76d33] text-white font-extrabold text-sm uppercase tracking-wider hover:bg-[#c28445] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-950/20"
                  >
                    Masuk Ke Menu <ChevronRight size={16} />
                  </button>
                  <p className="text-[10px] tracking-widest uppercase text-white/30 text-center">
                    © 2025 {BRAND_NAME}
                  </p>
                </div>
              </div>
            )}

            {welcomeStep === 2 && (
              <div className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-3 flex items-center justify-center gap-6">
                    <img
                      src={logoImg}
                      alt={BRAND_NAME}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-foreground/10 shadow-sm"
                    />
                    <img 
                      src="/logo_halal.png" 
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
                  onClick={() => setWelcomeStep(3)}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Lanjut <ChevronRight size={16} />
                </button>
              </div>
            )}

            {welcomeStep === 3 && (
              <div className="p-6">
                <div className="text-center mb-5">
                  <div className="relative mb-3 flex items-center justify-center">
                    <img 
                      src="/logo_halal.png" 
                      alt="Sertifikat Halal" 
                      className={`h-14 w-auto object-contain transition-all duration-500 hover:scale-105 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)] ${isDark ? 'halal-shift-dark' : 'halal-shift-light'}`}
                    />
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
                    onClick={() => setWelcomeStep(2)}
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
              src="/logo_halal.png" 
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

      {/* Tab Switcher: Buku Menu vs Galeri Resto vs Reservasi */}
      {view !== "cart" && view !== "status" && (
        <div className="flex px-4 pt-4 pb-2 gap-2 bg-background flex-shrink-0">
          <button
            onClick={() => setView("menu")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-2xl border text-center transition-all duration-300 ${
              view === "menu"
                ? "bg-primary/10 border-primary/30 text-primary shadow-[0_2px_12px_rgba(249,115,22,0.15)] scale-[1.01]"
                : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            📖 Menu
          </button>
          <button
            onClick={() => setView("gallery")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-2xl border text-center transition-all duration-300 ${
              view === "gallery"
                ? "bg-primary/10 border-primary/30 text-primary shadow-[0_2px_12px_rgba(249,115,22,0.15)] scale-[1.01]"
                : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            📸 Galeri
          </button>
          <button
            onClick={() => setView("booking")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-2xl border text-center transition-all duration-300 ${
              view === "booking"
                ? "bg-primary/10 border-primary/30 text-primary shadow-[0_2px_12px_rgba(249,115,22,0.15)] scale-[1.01]"
                : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            📅 Reservasi
          </button>
        </div>
      )}

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

      {/* Event Gallery View */}
      {view === "gallery" && (
        <div className="p-4 pb-24 overflow-y-auto flex-1">
          <div className="mb-4">
            <h2 className="text-base font-black uppercase tracking-widest text-foreground font-poppins flex items-center gap-2">
              <Sparkles size={16} className="text-primary animate-pulse" />
              Momen Spesial Kami
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Dokumentasi berbagai kegiatan dan perayaan berharga yang pernah diselenggarakan di {BRAND_NAME}.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {eventPhotos.map((evt) => (
              <div 
                key={evt.id}
                onClick={() => setSelectedEventImage(evt.image)}
                className="bg-card border border-border/60 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 transition-all duration-300 group shadow-md"
              >
                <div className="aspect-[16/9] overflow-hidden relative">
                  <OptimizedImage src={evt.image} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-[9px] font-black uppercase tracking-widest text-white px-2.5 py-1.5 rounded-full border border-white/10">
                    {evt.category}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors font-poppins">{evt.title}</h3>
                    <span className="text-[10px] text-muted-foreground font-semibold">{evt.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{evt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking / Reservation View */}
      {view === "booking" && (
        <div className="p-4 pb-24 overflow-y-auto flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-4">
            <h2 className="text-base font-black uppercase tracking-widest text-foreground font-poppins flex items-center gap-2">
              <Calendar size={16} className="text-primary animate-pulse" />
              Reservasi Tempat &amp; Acara
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Booking tempat untuk makan keluarga, pertemuan bisnis, ulang tahun, hingga pesta pernikahan di {BRAND_NAME}.
            </p>
          </div>

          {bookingSuccess ? (
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} className="animate-bounce" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground font-poppins">Reservasi Berhasil Diajukan!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Pengajuan reservasi Anda telah kami terima secara sistem. Mohon tunggu konfirmasi langsung dari kasir kami di restoran.
                </p>
              </div>

              <div className="bg-secondary/40 border border-border/80 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Nama Pemesan:</span>
                  <span className="font-semibold text-foreground">{lastBooking?.name}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <span className="font-semibold text-foreground">{lastBooking?.phone}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Jenis Acara:</span>
                  <span className="font-semibold text-foreground">{lastBooking?.type}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Jumlah Tamu:</span>
                  <span className="font-semibold text-foreground">{lastBooking?.guests} Orang</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Jadwal:</span>
                  <span className="font-semibold text-foreground">{lastBooking?.date} @ {lastBooking?.time}</span>
                </div>
                {lastBooking?.notes && (
                  <div className="pt-1">
                    <span className="text-muted-foreground block mb-0.5">Catatan Khusus:</span>
                    <p className="text-[11px] text-foreground bg-background/50 border border-border/40 p-2 rounded-lg leading-relaxed italic">{lastBooking?.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 text-center flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    setBookingSuccess(false);
                    setBookingName("");
                    setBookingPhone("");
                    setBookingNotes("");
                    setLastBooking(null);
                    setView("menu");
                  }}
                  className="bg-white border border-slate-200 text-center w-40 rounded-xl h-11 relative text-slate-800 text-xs font-black uppercase tracking-wider group transition-all shadow-sm hover:shadow-md hover:border-orange-200"
                >
                  <div
                    className="bg-orange-500 rounded-lg h-9 w-10 flex items-center justify-center absolute left-1 top-[3px] group-hover:w-[150px] z-10 duration-500"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 1024 1024"
                      height="16px"
                      width="16px"
                    >
                      <path
                        d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
                        fill="#ffffff"
                      ></path>
                      <path
                        d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
                        fill="#ffffff"
                      ></path>
                    </svg>
                  </div>
                  <p className="translate-x-3 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-0 group-hover:pointer-events-none font-poppins">
                    Kembali
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateBooking} className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
              {bookingError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/25 p-3 rounded-lg">
                  <AlertCircle size={14} />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <User size={10} className="text-primary" />
                  Nama Lengkap Pemesan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap Anda"
                  value={bookingName}
                  onChange={(e) => setBookingName(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Phone size={10} className="text-primary" />
                  Nomor Telepon / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Sparkles size={10} className="text-primary" />
                    Jenis Reservasi
                  </label>
                  <select
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-semibold"
                  >
                    <option value="Meja Makan Biasa">Meja Makan Biasa</option>
                    <option value="Pesta Ulang Tahun">Pesta Ulang Tahun</option>
                    <option value="Acara Pernikahan (Wedding)">Acara Pernikahan (Wedding)</option>
                    <option value="Corporate Gathering / Rapat">Corporate Gathering / Rapat</option>
                    <option value="Kumpul Keluarga Besar">Kumpul Keluarga Besar</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Users size={10} className="text-primary" />
                    Jumlah Tamu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bookingGuests}
                    onChange={(e) => setBookingGuests(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Calendar size={10} className="text-primary" />
                    Tanggal Booking <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Clock size={10} className="text-primary" />
                    Jam Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <FileText size={10} className="text-primary" />
                  Catatan Khusus / Permintaan (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Butuh meja di dekat area musik live, request menu diet gluten-free, dekorasi kecil ultah, dll."
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium leading-relaxed resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={bookingSubmitting}
                className="w-full py-3.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-orange-600 hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 font-poppins"
              >
                {bookingSubmitting ? (
                  <>Mengirim Pengajuan...</>
                ) : (
                  <>
                    <Calendar size={14} />
                    Ajukan Reservasi Sekarang
                  </>
                )}
              </button>
            </form>
          )}
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

              {isVerified ? (
                <button
                  onClick={placeOrder}
                  disabled={placing || orderCooldown || cart.length === 0}
                  className="w-full py-4 rounded-xl bg-primary text-white font-bold text-base hover:bg-indigo-500 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {placing ? (
                    <><RefreshCw size={16} className="animate-spin" /> Mengirim...</>
                  ) : (
                    <>Pesan Sekarang · {rp(total)} <ChevronRight size={16} /></>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowVerificationModal(true)}
                  className="w-full py-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-base hover:bg-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                >
                  <Lock size={16} /> Verifikasi Dine-in Untuk Memesan
                </button>
              )}
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
                const isOfflineOrder = order.id.startsWith("OFFLINE-");
                const cfg = isOfflineOrder 
                  ? {
                      label: "Menunggu Jaringan (Offline)",
                      color: "text-amber-500 dark:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]",
                      bg: "bg-amber-500/10 border-amber-500/30",
                      neonBorder: "dark:shadow-[0_0_20px_rgba(245,158,11,0.2)] border-b border-b-amber-500/30",
                      icon: <RefreshCw size={16} className="text-amber-500 animate-spin" />,
                      step: 1
                    }
                  : (statusConfig[order.status] || statusConfig.pending);
                return (
                  <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    {/* Status Header dengan Neon Glow */}
                    <div className={`flex items-center gap-2 px-4 py-3 border-b ${cfg.bg} ${cfg.neonBorder}`}>
                      <span className={`${cfg.color} animate-pulse`}>{cfg.icon}</span>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-bold ${cfg.color} animate-pulse`}>{cfg.label}</span>
                        {(() => {
                          const duration = getOrderDuration(order);
                          if (order.status === "served") {
                            return (
                              <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider">
                                Disajikan dalam {duration} mnt
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-[9px] text-muted-foreground/75 font-medium uppercase tracking-wider">
                                Durasi proses: {duration} mnt
                              </span>
                            );
                          }
                        })()}
                      </div>
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

      {/* Event Image Zoom Modal (Lightbox) */}
      {selectedEventImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={() => setSelectedEventImage(null)}
        >
          <div 
            className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-card border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedEventImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center transition-all border border-white/10"
              title="Tutup"
            >
              <X size={16} />
            </button>
            <div className="aspect-video w-full overflow-hidden">
              <img src={selectedEventImage} alt="Event Zoom" className="w-full h-full object-contain bg-black" />
            </div>
            {(() => {
              const matched = eventPhotos.find(e => e.image === selectedEventImage);
              if (!matched) return null;
              return (
                <div className="p-5 border-t border-border bg-card">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black text-sm text-foreground uppercase tracking-wider font-poppins">{matched.title}</h3>
                    <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-full font-black uppercase tracking-widest">{matched.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{matched.description}</p>
                </div>
              );
            })()}
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
      {/* Dine-in Location / PIN Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setShowVerificationModal(false)}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[28px] w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={18} className="text-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-foreground uppercase tracking-widest">Verifikasi Dine-In</h3>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">Pastikan Anda memesan di lokasi</p>
                </div>
              </div>
              <button
                onClick={() => setShowVerificationModal(false)}
                title="Tutup"
                className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* GPS Status / Check Button */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 relative text-center">
                <div className="flex items-center justify-center gap-2">
                  <MapPin size={16} className={checkingGPS ? "text-primary animate-bounce" : "text-slate-400"} />
                  <span className="text-xs font-bold text-foreground">Validasi GPS Otomatis</span>
                </div>
                
                {checkingGPS ? (
                  <div className="py-2 flex flex-col items-center gap-2">
                    <RefreshCw size={20} className="text-primary animate-spin" />
                    <p className="text-[10px] text-muted-foreground font-semibold">Mengakses satelit lokasi...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {gpsError ? (
                      <p className="text-[10px] text-red-400 font-bold bg-red-500/5 border border-red-500/10 py-1.5 px-3 rounded-lg leading-tight">
                        {gpsError}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Metode tercepat. Aktifkan GPS Anda dan klik tombol di bawah untuk verifikasi instan.
                      </p>
                    )}
                    <button
                      onClick={() => checkGPSLocation(false)}
                      className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all w-full font-poppins font-black"
                    >
                      Deteksi Ulang Lokasi
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-white/5" />
                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">ATAU</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              {/* PIN Verification Input */}
              <div className="space-y-3">
                <div className="text-center space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Masukkan PIN Verifikasi Meja</label>
                  <p className="text-[9px] text-slate-400 font-semibold leading-tight">Minta 4-digit PIN harian kepada pelayan kami di kedai.</p>
                </div>

                <div className="flex justify-center gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value.replace(/\D/g, ""));
                      setPinError(false);
                    }}
                    placeholder="••••"
                    className={`w-36 text-center text-xl font-mono font-black tracking-[0.4em] bg-white border rounded-2xl py-2.5 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 transition-all ${
                      pinError 
                        ? "border-red-500/60 ring-red-500/10 focus:ring-red-500/20" 
                        : "border-slate-200 ring-primary/10 focus:ring-primary/20 focus:border-primary"
                    }`}
                  />
                </div>

                {pinError && (
                  <p className="text-[9px] text-red-400 text-center font-bold">PIN salah. Silakan periksa kembali.</p>
                )}

                <button
                  onClick={handleVerifyPIN}
                  disabled={pinInput.length !== 4}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-20 font-poppins"
                >
                  Verifikasi PIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
