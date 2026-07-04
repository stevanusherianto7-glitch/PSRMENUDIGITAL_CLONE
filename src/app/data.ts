/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI CONFIG PRODUKSI, SEED DATA, DAN URL DOMAIN Kedai Elvera 57.
 * PERUBAHAN TIDAK TERUKUR DAPAT MERUSAK TAMPILAN DAN QR CODE. ⚠️
 */

import type { MenuItem, TableData, InventoryItem, Promo } from "./types";

const today = new Date();
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r.toISOString().slice(0, 10);
};

// ─── BRAND CONFIG ─────────────────────────────────────────────────────────────
export const BRAND_NAME = "Kedai Elvera 57";
// Local offline-ready logo with fallback reference: /logo_kedai_Elvera57.webp
export const APP_LOGO = "/logo_kedai_Elvera57.webp";
export const BRAND_TAGLINE = "Sajian Spesial Penuh Rasa";
export const PUBLIC_ICON_LOGO = "/logo_kedai_Elvera57.webp";

// ─── LOKASI & GEOFENCING (Kedai Elvera 57) ────────────────────────────────────
export const RESTAURANT_COORDS = { lat: -6.302760941952337, lng: 106.77789668270078 };
export const ALLOWED_RADIUS_METERS = 150; // Radius toleransi GPS (meter)

// ─── SEED MENU (Fetched from Supabase Project B) ──────────────────────────────────
export const SEED_MENU: MenuItem[] = [
  {
    "id": "menu_001",
    "name": "Nasi Goreng Jawa",
    "category": "Makanan",
    "price": 25000,
    "image": "/imports/Nasi_Goreng_Jawa.webp",
    "available": true,
    "tag": "Favorit",
    "description": "Nasi goreng khas Jawa, harum bumbu rempah dengan telur mata sapi & acar segar."
  },
  {
    "id": "menu_002",
    "name": "Bakmi Goreng Jawa",
    "category": "Makanan",
    "price": 24000,
    "image": "/imports/Bakmi_Goreng_Jawa.webp",
    "available": true,
    "tag": undefined,
    "description": "Mie goreng khas Jawa dengan telur, sayuran segar & kecap manis pilihan."
  },
  {
    "id": "menu_003",
    "name": "Bakmi Godog Jawa",
    "category": "Makanan",
    "price": 24000,
    "image": "/imports/Bakmi_Godog_Jawa.webp",
    "available": true,
    "tag": undefined,
    "description": "Mie rebus kuah kaldu ayam hangat, cocok dinikmati di segala cuaca."
  },
  {
    "id": "menu_004",
    "name": "Soto Ayam Semarang",
    "category": "Makanan",
    "price": 28000,
    "image": "/imports/Soto_Ayam_Semarang.webp",
    "available": true,
    "tag": "Best Seller",
    "description": "Kuah bening segar dengan ayam suwir, tauge, bihun, dan perasan jeruk nipis."
  },
  {
    "id": "menu_006",
    "name": "Gulai Mangut Semarang",
    "category": "Makanan",
    "price": 35000,
    "image": "/imports/Gulai_Mangut_Semarang.webp",
    "available": true,
    "tag": "Spesial",
    "description": "Ikan asap dimasak gulai santan kuning rempah khas Semarang, gurih dan kaya cita rasa."
  },
  {
    "id": "menu_007",
    "name": "Nasi Ayam Lengkuas Semarang",
    "category": "Makanan",
    "price": 30000,
    "image": "/imports/Nasi_Ayam_Lengkuas_Semarang.webp",
    "available": true,
    "tag": "Best Seller",
    "description": "Ayam goreng lengkuas empuk & harum, perpaduan rempah khas Jawa Tengah."
  },
  {
    "id": "menu_008",
    "name": "Nasi Ayam Penyet Semarang",
    "category": "Makanan",
    "price": 30000,
    "image": "/imports/Nasi_Ayam_Penyet_Semarang.webp",
    "available": true,
    "tag": "Best Seller",
    "description": "Ayam kampung penyet bumbu merah khas Semarang, disajikan dengan nasi hangat & lalapan."
  },
  {
    "id": "menu_010",
    "name": "Tahu Gimbal Semarang",
    "category": "Makanan",
    "price": 25000,
    "image": "/imports/Tahu_Gimbal_Semarang.webp",
    "available": true,
    "tag": "Favorit",
    "description": "Tahu, telur, gimbal udang & lontong disiram bumbu kacang petis khas Semarang."
  },
  {
    "id": "menu_012",
    "name": "Jeruk Peras",
    "category": "Minuman",
    "price": 8000,
    "image": "/imports/Es_Jeruk_Peras.webp",
    "available": true,
    "tag": undefined,
    "description": "Jeruk segar diperas langsung, dingin dan kaya vitamin C."
  },
  {
    "id": "menu_013",
    "name": "Jus Buah Naga",
    "category": "Minuman",
    "price": 15000,
    "image": "/imports/Jus_Buah_Naga.webp",
    "available": true,
    "tag": undefined,
    "description": "Jus buah naga segar berwarna merah muda cantik, kaya antioksidan."
  },
  {
    "id": "menu_014",
    "name": "Jus Belimbing",
    "category": "Minuman",
    "price": 15000,
    "image": "/imports/Jus_Belimbing.webp",
    "available": true,
    "tag": undefined,
    "description": "Jus belimbing segar asam-manis, menyegarkan dan kaya vitamin C."
  },
  {
    "id": "menu_015",
    "name": "Jus stroberi",
    "category": "Minuman",
    "price": 18000,
    "image": "/imports/Jus_stroberi.webp",
    "available": true,
    "tag": undefined,
    "description": "Jus stroberi segar berwarna merah cerah, manis sedikit asam."
  },
  {
    "id": "menu_020",
    "name": "Teh Poci",
    "category": "Minuman",
    "price": 15000,
    "image": "/imports/Teh_Poci.webp",
    "available": true,
    "tag": undefined,
    "description": "Teh melati khas Jawa diseduh dalam poci tanah liat, disajikan hangat dengan gula batu."
  },
  {
    "id": "menu_022",
    "name": "Pulpy Orange",
    "category": "Minuman",
    "price": 7000,
    "image": "/imports/Pulpy_Orange.webp",
    "available": true,
    "tag": undefined,
    "description": "Minuman jeruk kemasan dengan buah asli, segar dan bergizi."
  },
  {
    "id": "menu_023",
    "name": "Fanta, Sprite, Cola",
    "category": "Minuman",
    "price": 7000,
    "image": "/imports/Fanta,_Sprite,_Cola.webp",
    "available": true,
    "tag": undefined,
    "description": "Minuman bersoda pilihan: Fanta merah, Coca-Cola, atau Sprite segar."
  },
  {
    "id": "menu_025",
    "name": "Cleo",
    "category": "Minuman",
    "price": 4000,
    "image": "/imports/Cleo.webp",
    "available": true,
    "tag": undefined,
    "description": "Air mineral Cleo kemasan, pilihan hemat untuk melepas dahaga."
  },
  {
    "id": "menu_028",
    "name": "Roti Bakar Coklat Keju",
    "category": "Snack",
    "price": 18000,
    "image": "/imports/Roti_Bakar_Coklat_Keju.webp",
    "available": true,
    "tag": "Favorit",
    "description": "Roti bakar garing dengan lelehan coklat & keju susu, gurih manis sempurna."
  },
  {
    "id": "menu_011",
    "name": "Teh Pucuk",
    "category": "Minuman",
    "price": 5000,
    "image": "/imports/Teh_Pucuk.webp",
    "available": true,
    "tag": undefined,
    "description": "Minuman teh kemasan segar pilihan, tersedia dingin."
  },
  {
    "id": "menu_016",
    "name": "Lemon tea",
    "category": "Minuman",
    "price": 10000,
    "image": "/imports/Lemon_Tea.webp",
    "available": true,
    "tag": undefined,
    "description": "Teh dengan perasan lemon segar, segar dan menyehatkan."
  },
  {
    "id": "menu_017",
    "name": "Green tea",
    "category": "Minuman",
    "price": 12000,
    "image": "/imports/Green_tea.webp",
    "available": true,
    "tag": undefined,
    "description": "Teh hijau pilihan, kaya antioksidan dengan rasa yang ringan dan menyegarkan."
  },
  {
    "id": "menu_018",
    "name": "Nipis Madu",
    "category": "Minuman",
    "price": 12000,
    "image": "/imports/Nipis_Madu.webp",
    "available": true,
    "tag": undefined,
    "description": "Perpaduan jeruk nipis segar dengan madu alami, menyehatkan dan menyegarkan."
  },
  {
    "id": "menu_019",
    "name": "Soda Gembira",
    "category": "Minuman",
    "price": 15000,
    "image": "/imports/Soda_Gembira.webp",
    "available": true,
    "tag": "Favorit",
    "description": "Minuman soda susu warna-warni yang menyegarkan, cocok untuk semua usia."
  },
  {
    "id": "menu_026",
    "name": "Welcome Drink",
    "category": "Minuman",
    "price": 16000,
    "image": "/imports/Welcome_Drink.webp",
    "available": true,
    "tag": "Spesial",
    "description": "Minuman selamat datang khas Kedai Elvera 57, perpaduan buah tropis yang menyegarkan."
  },
  {
    "id": "menu_029",
    "name": "Es Teh",
    "category": "Minuman",
    "price": 5000,
    "image": "/imports/Es_Teh.webp",
    "available": true,
    "tag": undefined,
    "description": "Teh manis dingin segar, minuman andalan warung khas Jawa."
  },
  {
    "id": "menu_005",
    "name": "Rawon Semarang",
    "category": "Makanan",
    "price": 32000,
    "image": "/imports/Rawon_Semarang.webp",
    "available": true,
    "tag": undefined,
    "description": "Sup daging sapi hitam keluwek khas Jawa Timur, kaya rempah & disajikan dengan tauge."
  },
  {
    "id": "menu_009",
    "name": "Soto Pindang Kudus",
    "category": "Makanan",
    "price": 30000,
    "image": "/imports/Soto_Pindang_Kudus.webp",
    "available": true,
    "tag": undefined,
    "description": "Soto daging sapi khas Kudus, kuah bening segar dengan kecambah & daun bawang."
  },
  {
    "id": "menu_021",
    "name": "Nasi Goreng Mawut Semarang",
    "category": "Makanan",
    "price": 28000,
    "image": "/imports/Nasi_Goreng_Mawut_Semarang.webp",
    "available": true,
    "tag": undefined,
    "description": "Perpaduan nasi dan mie goreng dengan bumbu khas Semarang yang lezat."
  },
  {
    "id": "menu_027",
    "name": "Pisang Goreng Coklat Keju",
    "category": "Snack",
    "price": 15000,
    "image": "/imports/Pisang_Goreng_Coklat_Keju.webp",
    "available": true,
    "tag": undefined,
    "description": "Pisang goreng crispy dibalut coklat leleh dan parutan keju, camilan favorit."
  },
  {
    "id": "menu_024",
    "name": "Aqua",
    "category": "Minuman",
    "price": 5000,
    "image": "/imports/Aqua.webp",
    "available": true,
    "tag": undefined,
    "description": "Air mineral AQUA kemasan, segar dan menyehatkan."
  }
];

export const SEED_TABLES: TableData[] = [
  { id: "A1", seat: 4, status: "available" },
  { id: "A2", seat: 2, status: "available" },
  { id: "A3", seat: 4, status: "available" },
  { id: "A4", seat: 6, status: "available" },
  { id: "A5", seat: 8, status: "available" },
  { id: "A6", seat: 4, status: "available" },
  { id: "A7", seat: 2, status: "available" },
  { id: "A8", seat: 4, status: "available" },
  { id: "A9", seat: 6, status: "available" },
];

export const SEED_INVENTORY: InventoryItem[] = [
  { id: "i1", name: "Ayam Kampung", qty: 5, unit: "kg", exp_date: addDays(today, 1), category: "Dapur: Protein", method: "FIFO", stock: 5, min_stock: 8 },
  { id: "i2", name: "Daun Salam", qty: 200, unit: "gram", exp_date: addDays(today, 0), category: "Dapur: Rempah", method: "FIFO", stock: 200, min_stock: 100 },
  { id: "i3", name: "Santan Kelapa", qty: 3, unit: "liter", exp_date: addDays(today, 2), category: "Dapur: Bumbu", method: "FIFO", stock: 3, min_stock: 5 },
  { id: "i4", name: "Beras Premium", qty: 25, unit: "kg", exp_date: addDays(today, 90), category: "Dapur: Pokok", method: "LIFO", stock: 25, min_stock: 10 },
  { id: "i5", name: "Cabe Merah", qty: 2, unit: "kg", exp_date: addDays(today, 3), category: "Dapur: Sayuran", method: "FIFO", stock: 2, min_stock: 3 },
  { id: "i6", name: "Gula Merah", qty: 1, unit: "kg", exp_date: addDays(today, 40), category: "Dapur: Bumbu", method: "LIFO", stock: 1, min_stock: 2 },
  { id: "i7", name: "Tahu Putih", qty: 3, unit: "kg", exp_date: addDays(today, 1), category: "Dapur: Protein", method: "FIFO", stock: 3, min_stock: 5 },
  { id: "i8", name: "Santan UHT", qty: 6, unit: "liter", exp_date: addDays(today, 6), category: "Bar: Dairy", method: "LIFO", stock: 6, min_stock: 4 },
  { id: "i9", name: "Kencur", qty: 500, unit: "gram", exp_date: addDays(today, 14), category: "Dapur: Rempah", method: "FIFO", stock: 500, min_stock: 200 },
  { id: "i10", name: "Kelapa Parut", qty: 1.5, unit: "kg", exp_date: addDays(today, 2), category: "Dapur: Bumbu", method: "FIFO", stock: 1.5, min_stock: 2 },
];

export const SEED_PROMOS: Promo[] = [
  { id: "p1", name: "Happy Hour", description: "Diskon 20% semua minuman pukul 14:00 - 16:00", discount: 20, type: "percentage", active: true, code: "HAPPYHOUR" },
  { id: "p2", name: "Makan Berdua", description: "Beli 2 Makanan Utama gratis 2 Es Teh", discount: 10000, type: "fixed", active: true, min_order: 50000, code: "BERDUA" },
  { id: "p3", name: "Paket Keluarga", description: "Diskon Rp 15.000 untuk pesanan ≥ Rp 100.000", discount: 15000, type: "fixed", active: false, min_order: 100000, code: "KELUARGA", valid_until: addDays(today, 30) },
];

export const menuCategories = ["Makanan", "Snack", "Minuman"];
export const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

export const orderModeConfig = {
  "dine-in":   { label: "Dine In",   color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20" },
  "take-away": { label: "Take Away", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
} as const;

export const GUEST_BASE_URL = "https://psrmenudigital-clone.vercel.app";

export const tableStatusConfig = {
  available: { label: "Kosong", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  occupied: { label: "Terisi", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  service: { label: "Butuh Layanan", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  reserved: { label: "Reservasi", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
};

export const PAYMENT_DATA = [
  { name: "Tunai", value: 43, color: "#6366F1" },
  { name: "QRIS", value: 32, color: "#22C55E" },
  { name: "Debit", value: 17, color: "#F59E0B" },
  { name: "E-Wallet", value: 8, color: "#EC4899" },
];

export const BEST_SELLER_DATA = [
  { name: "Nasi Ayam Penyet", qty: 42, revenue: 1260000 },
  { name: "Nasi Ayam Lengkuas", qty: 35, revenue: 1050000 },
  { name: "Soto Ayam Semarang", qty: 28, revenue: 784000 },
  { name: "Gulai Mangut Semarang", qty: 24, revenue: 840000 },
  { name: "Rawon Semarang", qty: 22, revenue: 704000 },
  { name: "Tahu Gimbal Semarang", qty: 18, revenue: 450000 },
];

export const HOURLY_DATA = [
  { hour: "10:00", sales: 340000, tx: 4 },
  { hour: "11:00", sales: 680000, tx: 7 },
  { hour: "12:00", sales: 1250000, tx: 13 },
  { hour: "13:00", sales: 890000, tx: 9 },
  { hour: "14:00", sales: 420000, tx: 5 },
  { hour: "15:00", sales: 310000, tx: 3 },
  { hour: "16:00", sales: 280000, tx: 3 },
  { hour: "17:00", sales: 390000, tx: 4 },
  { hour: "18:00", sales: 610000, tx: 6 },
  { hour: "19:00", sales: 420000, tx: 4 },
];

// Dynamic environment variable helper to support both Node/Jest and browser/Vite environments.
// Using new Function() avoids the literal import.meta.env at compile-time which causes Jest SyntaxErrors.
const getEnv = (key: string, fallback: string): string => {
  try {
    if (typeof process !== "undefined" && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {
    // ignore
  }
  try {
    const metaEnv = new Function("return import.meta.env")();
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch {
    // ignore
  }
  return fallback;
};

// Credentials: moved to environment variables. Do NOT store real passwords in source code.
// Use VITE_ADMIN_PASSWORD, VITE_WAITER_PASSWORD, VITE_KITCHEN_PASSWORD in your deployment provider (Vercel, Netlify, etc.).
export const CREDENTIALS = {
  admin: {
    password: getEnv("VITE_ADMIN_PASSWORD", "admin123"),
    name: getEnv("VITE_ADMIN_NAME", "Admin Kedai Elvera 57"),
  },
  waiter: {
    password: getEnv("VITE_WAITER_PASSWORD", "waiter123"),
    name: getEnv("VITE_WAITER_NAME", "Pelayan"),
  },
  kitchen: {
    password: getEnv("VITE_KITCHEN_PASSWORD", "dapur123"),
    name: getEnv("VITE_KITCHEN_NAME", "Dapur"),
  },
};

// Aliased as AUTH_CREDENTIALS for parity/new naming
export const AUTH_CREDENTIALS = CREDENTIALS;

// For local demos only: non-sensitive demo usernames (no real passwords). These are safe examples only.
export const DEMO_CREDENTIALS = {
  admin: { username: "admin@demo" },
  waiter: { username: "waiter@demo" },
  kitchen: { username: "kitchen@demo" },
};
