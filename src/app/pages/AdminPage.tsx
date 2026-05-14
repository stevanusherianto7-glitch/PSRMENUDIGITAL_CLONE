import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
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
import { supabase } from "../../../utils/supabase";
import logoImg from "../../imports/icon-maskable-192.png";
import { format } from "date-fns";
import {
  SEED_MENU, SEED_TABLES, SEED_INVENTORY, SEED_PROMOS,
  menuCategories, rp, PAYMENT_DATA, BEST_SELLER_DATA, HOURLY_DATA, CREDENTIALS
} from "../data";
import { fetchOrders, updateOrder, createOrder } from "../api";
import { DashboardModule } from "../components/DashboardModule";
import { OrdersModule } from "../components/OrdersModule";
import { JadwalShift } from "../components/JadwalShift";
import { KalkulatorHPP } from "../components/KalkulatorHPP";
import { useTTS, preloadVoices } from "../hooks/useTTS";
import { KaryawanModule } from "../components/KaryawanModule";
import { AssetModule } from "../components/AssetModule";
import { MenuManagement } from "../components/MenuManagement";
import { DateRangePicker } from "../components/ui/date-range-picker";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/ui/tooltip";
import type { DateRange } from "react-day-picker";
import type {
  MenuItem, CartItem, Transaction, TableData,
  InventoryItem, Promo, Order, OrderStatus, UserSession
} from "../types";

// ─── Vercel URL untuk QR Code tamu ────────────────────────────────────────────
const GUEST_BASE_URL = "https://psrmenudigital.vercel.app";

export const orderModeConfig = {
  "dine-in":   { label: "Dine In",   color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20" },
  "take-away": { label: "Take Away", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
} as const;

type Module = "orders" | "kasir" | "meja" | "menu" | "promo" | "qr-menu" | "metrics" | "hpp" | "sdm" | "stok" | "transaksi";

const tableStatusConfig = {
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



function WeeklySalesChart({ data }: { data: { day: string; sales: number }[] }) {
  const W = 600, H = 240, pl = 68, pr = 8, pt = 8, pb = 28;
  const cw = W - pl - pr, ch = H - pt - pb;
  const maxV = Math.max(...data.map(d => d.sales), 1);
  const xS = (i: number) => (i / (data.length - 1)) * cw;
  const yS = (v: number) => ch - (v / maxV) * ch;
  
  const pts = data.map((d, i) => [xS(i), yS(d.sales)] as [number, number]);
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${ch} L0,${ch} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      <defs>
        <linearGradient id="laporanGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E87722" stopOpacity={0.4} />
          <stop offset="50%" stopColor="#E87722" stopOpacity={0.1} />
          <stop offset="100%" stopColor="#E87722" stopOpacity={0} />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform={`translate(${pl},${pt})`}>
        {[0, 2000000, 4000000, 6000000, 8000000].filter(v => v <= maxV * 1.05).map(v => (
          <g key={v}>
            <line x1={0} y1={yS(v)} x2={cw} y2={yS(v)} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <text x={-10} y={yS(v) + 4} textAnchor="end" fill="#6B7080" fontSize={10} fontFamily="Poppins">{v === 0 ? "0" : `Rp ${(v / 1000000).toFixed(0)}Jt`}</text>
          </g>
        ))}
        
        <path d={areaPath} fill="url(#laporanGrad)" />
        <path d={linePath} fill="none" stroke="#E87722" strokeWidth={3} strokeLinecap="round" filter="url(#glow)" />
        
        {pts.map((p, i) => (
          <g key={i} className="group">
            <circle cx={p[0]} cy={p[1]} r={5} fill="#E87722" stroke="#fff" strokeWidth={2} className="cursor-pointer transition-all" />
            <text x={p[0]} y={ch + 18} textAnchor="middle" fill="#6B7080" fontSize={10} fontFamily="Poppins">{data[i].day}</text>
            
            <text 
              x={p[0]} 
              y={p[1] - 10} 
              textAnchor="middle" 
              fill="#E87722" 
              fontSize={10} 
              fontWeight="bold" 
              fontFamily="Poppins"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              {`${(data[i].sales / 1000000).toFixed(1)}Jt`}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}



function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${connected ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
      {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
      {connected ? "Supabase" : "Offline"}
    </div>
  );
}





// ─── Kasir ────────────────────────────────────────────────────────────────────
function KasirModule({ menuItems, onTransaction, promos, tables }: { menuItems: MenuItem[]; onTransaction: (tx: Transaction) => Promise<void>; promos: Promo[]; tables: TableData[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cat, setCat] = useState("Semua");
  const [payMethod, setPayMethod] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<"dine-in" | "take-away">("dine-in");
  const [chefNotes, setChefNotes] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>(tables[0]?.id || "");

  const filtered = cat === "Semua" ? menuItems : menuItems.filter(m => m.category === cat);
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  
  const discountAmount = selectedPromo 
    ? (selectedPromo.type === "percentage" 
        ? Math.round(subtotal * (selectedPromo.discount / 100)) 
        : selectedPromo.discount)
    : 0;
    
  const tax = Math.round((subtotal - discountAmount) * 0.1);
  const total = subtotal - discountAmount + tax;

  function addToCart(item: MenuItem) {
    if (!item.available) return;
    setCart(prev => { const ex = prev.find(c => c.id === item.id); return ex ? prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { ...item, qty: 1 }]; });
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  }

  async function processPayment() {
    if (!payMethod || cart.length === 0) return;
    if (!confirm("Proses pembayaran " + (selectedTable ? "untuk meja " + selectedTable : "untuk take-away") + "?")) return;
    setSaving(true);
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
    await onTransaction(tx);
    // Also save as order
    try {
      await createOrder({ tableId: orderMode === "take-away" ? null : selectedTable, items: cart, subtotal, total, notes: chefNotes, orderMode, type: "kasir" });
    } catch (e) { console.log("Order create error:", e); }
    setLastTxId(txId);
    setSaving(false);
    setPaid(true);
    setTimeout(() => { setPaid(false); setCart([]); setPayMethod(null); setLastTxId(null); setChefNotes(""); setOrderMode("dine-in"); }, 3000);
  }

  const payMethods = [
    { id: "Tunai", icon: <Banknote size={14} /> },
    { id: "QRIS", icon: <Smartphone size={14} /> },
    { id: "Debit", icon: <CreditCard size={14} /> },
    { id: "E-Wallet", icon: <Wallet size={14} /> },
  ];

  return (
    <div className="flex gap-4 h-[calc(100vh-160px)]">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
          {menuCategories.map(c => (
            <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0 border transition-all ${cat === c ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>{c}</button>
          ))}
        </div>
        <div className="overflow-y-auto grid grid-cols-2 gap-3 lg:grid-cols-3 auto-rows-max">
          {filtered.map(item => (
            <button key={item.id} onClick={() => addToCart(item)} disabled={!item.available}
              className={`bg-card border rounded-xl overflow-hidden text-left transition-all hover:scale-[1.02] group ${!item.available ? "opacity-40 cursor-not-allowed border-border" : "border-border hover:border-foreground/15"}`}>
              <div className="relative aspect-[3/2] bg-secondary overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {item.tag && <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.tag}</span>}
                {!item.available && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><span className="text-[10px] font-semibold text-muted-foreground">Habis</span></div>}
              </div>
              <div className="p-3">
                <p className="font-semibold text-xs text-foreground leading-tight">{item.name}</p>
                <p className="text-primary font-bold text-sm mt-1 font-['Poppins']">{rp(item.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-72 bg-card border border-border rounded-xl flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Pesanan Baru</h3>
            {cart.length > 0 && <button onClick={() => setCart([])} aria-label="Kosongkan keranjang" className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>}
          </div>
          
          {orderMode === "dine-in" && (
            <div className="mt-3">
              <label htmlFor="table-select" className="text-[10px] text-muted-foreground font-semibold uppercase">Pilih Meja</label>
              <select
                id="table-select"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Pilih Meja --</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>Meja {t.id}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dine-in / Take-away toggle */}
          <div className="flex gap-1.5 mt-3">
            {(["dine-in", "take-away"] as const).map(m => {
              const mcfg = orderModeConfig[m];
              return (
                <button key={m} onClick={() => setOrderMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    orderMode === m ? `${mcfg.bg} ${mcfg.border} ${mcfg.color}` : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  {m === "dine-in" ? "🍽️ Dine In" : "📦 Take Away"}
                </button>
              );
            })}
          </div>
        </div>
        {paid ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
            <CheckCircle2 size={40} className="text-green-400" />
            <p className="font-semibold text-sm text-green-400">Pembayaran Berhasil!</p>
            {lastTxId && <p className="text-xs text-muted-foreground font-mono bg-secondary px-3 py-1.5 rounded-lg border border-border">{lastTxId}</p>}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs gap-2">
                  <ShoppingCart size={24} className="opacity-30" /><p>Pilih item dari menu</p>
                </div>
              ) : cart.map(c => (
                <div key={c.id} className="flex items-center gap-2 bg-secondary rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{rp(c.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(c.id, -1)} aria-label="Kurangi jumlah" className="w-5 h-5 rounded bg-background flex items-center justify-center hover:bg-border"><Minus size={10} /></button>
                    <span className="text-xs font-bold w-4 text-center">{c.qty}</span>
                    <button onClick={() => updateQty(c.id, 1)} aria-label="Tambah jumlah" className="w-5 h-5 rounded bg-primary flex items-center justify-center hover:bg-indigo-500"><Plus size={10} className="text-white" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border space-y-3">
              {/* Catatan Chef */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                  <ChefHat size={10} className="text-orange-400" /> Catatan untuk Chef
                </label>
                <input
                  value={chefNotes}
                  onChange={e => setChefNotes(e.target.value)}
                  placeholder="masak pedas, tanpa bawang..."
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-[11px] focus:outline-none focus:border-orange-400/50 transition-colors placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Tombol Buka Pop-up Promo */}
              <div className="mb-3">
                <button
                  onClick={() => setIsPromoModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                >
                  <Tag size={12} className="text-primary" />
                  {selectedPromo ? `Promo: ${selectedPromo.name}` : "Pilih Promo"}
                </button>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{rp(subtotal)}</span></div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-400 font-medium">
                    <span>Diskon ({selectedPromo?.name})</span>
                    <span>-{rp(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground"><span>PPN 10%</span><span>{rp(tax)}</span></div>
                <div className="flex justify-between font-bold text-sm border-t border-border pt-1.5"><span>Total</span><span className="text-green-400">{rp(total)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {payMethods.map(m => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition-all ${payMethod === m.id ? "bg-primary border-primary text-white" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                    {m.icon} {m.id}
                  </button>
                ))}
              </div>
              <button onClick={processPayment} disabled={!payMethod || cart.length === 0 || saving || !selectedTable}
                className="w-full py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                {saving ? <><RefreshCw size={14} className="animate-spin" /> Menyimpan...</> : <><Save size={14} /> Proses Pembayaran</>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal Promo */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsPromoModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="font-bold text-lg font-['Poppins']">Pilih Promo</h3>
              <p className="text-xs text-muted-foreground mt-1">Pilih promo yang berlaku untuk transaksi ini</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {promos.filter(p => p.active).map(promo => (
                <button
                  key={promo.id}
                  onClick={() => { setSelectedPromo(promo); setIsPromoModalOpen(false); }}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center gap-1 ${selectedPromo?.id === promo.id ? "bg-primary text-white border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
                  title={promo.description}
                >
                  <span className="font-bold">{promo.name}</span>
                  <span className="text-[10px] opacity-80">{promo.type === "percentage" ? `${promo.discount}%` : rp(promo.discount)}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedPromo(null); setIsPromoModalOpen(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${!selectedPromo ? "bg-secondary border-border text-muted-foreground/30 cursor-not-allowed" : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"}`}
                disabled={!selectedPromo}
              >
                Reset Promo
              </button>
              <button
                onClick={() => setIsPromoModalOpen(false)}
                className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80"
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

// ─── Meja + QR ────────────────────────────────────────────────────────────────
function MejaModule({ tables, onUpdateStatus }: { tables: TableData[]; onUpdateStatus: (id: string, status: TableData["status"]) => Promise<void> }) {
  const [selected, setSelected] = useState<TableData | null>(null);
  const [qrTable, setQrTable] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const baseUrl = GUEST_BASE_URL;
  const navigate = useNavigate();

  useEffect(() => {
    if (selected) { const live = tables.find(t => t.id === selected.id); if (live) setSelected(live); }
  }, [tables]);

  async function handleClearTable(id: string) {
    setUpdating(true);
    await onUpdateStatus(id, "available");
    setUpdating(false);
    setSelected(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {(["available", "occupied", "service", "reserved"] as const).map(s => {
          const cfg = tableStatusConfig[s];
          const count = tables.filter(t => t.status === s).length;
          const labels = { available: "Kosong", occupied: "Terisi", service: "Butuh Layanan", reserved: "Reservasi" };
          return (
            <div key={s} className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border} flex items-center gap-3`}>
              <span className={`text-2xl font-bold ${cfg.color} font-['Poppins']`}>{count}</span>
              <span className="text-xs text-muted-foreground">{labels[s]}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2">
        <QrCode size={12} className="text-indigo-400" />
        <span>Klik tombol QR di kartu meja untuk generate QR Code scan-order tamu</span>
        <button
          onClick={() => navigate("/qr-stickers")}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors font-semibold text-[10px] flex-shrink-0"
        >
          <Printer size={10} /> Cetak Semua Stiker QR
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 grid grid-cols-3 gap-3">
          {tables.map(t => {
            const cfg = tableStatusConfig[t.status];
            return (
              <div key={t.id} className={`rounded-xl border p-4 transition-all ${cfg.bg} ${cfg.border} ${selected?.id === t.id ? "ring-1 ring-white/20" : ""}`}>
                <div className="flex items-start justify-between">
                  <button onClick={() => setSelected(selected?.id === t.id ? null : t)} className="flex-1 text-left">
                    <span className="font-bold text-lg font-['Poppins']">{t.id}</span>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Users size={10} /> {t.seat} kursi</p>
                      {t.pax && <p className="text-xs text-muted-foreground">{t.pax} tamu</p>}
                      {t.total && <p className={`text-sm font-bold ${cfg.color}`}>{rp(t.total)}</p>}
                    </div>
                  </button>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{cfg.label}</span>
                    <button
                      onClick={() => setQrTable(t.id)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5 transition-colors"
                    >
                      <QrCode size={9} /> QR
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="w-64 bg-card border border-border rounded-xl p-5 flex-shrink-0 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Meja {selected.id}</h3>
              <button onClick={() => setSelected(null)} aria-label="Tutup detail" className="text-muted-foreground hover:text-foreground"><XCircle size={16} /></button>
            </div>
            <div className={`rounded-lg p-3 border ${tableStatusConfig[selected.status].bg} ${tableStatusConfig[selected.status].border}`}>
              <p className={`text-sm font-semibold ${tableStatusConfig[selected.status].color}`}>{tableStatusConfig[selected.status].label}</p>
            </div>
            {selected.orders && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Pesanan</p>
                <div className="space-y-1.5">
                  {selected.orders.map((o, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" /><span>{o}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selected.total && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Total Sementara</p>
                <p className="font-bold text-green-400 text-lg font-['Poppins']">{rp(selected.total)}</p>
              </div>
            )}
            {selected.status !== "available" && (
              <div className="space-y-2 pt-2">
                <button className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-indigo-500 transition-colors">Cetak Struk</button>
                <button onClick={() => handleClearTable(selected.id)} disabled={updating}
                  className="w-full py-2 rounded-lg bg-secondary border border-border text-muted-foreground text-xs hover:text-foreground transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {updating ? <><RefreshCw size={10} className="animate-spin" /> Mengupdate...</> : "Kosongkan Meja"}
                </button>
              </div>
            )}
            <button onClick={() => setQrTable(selected.id)} className="w-full py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-1.5">
              <QrCode size={12} /> Lihat QR Code Meja
            </button>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setQrTable(null)}>
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="font-bold text-lg font-['Poppins']">QR Code Meja {qrTable}</h3>
              <p className="text-xs text-muted-foreground mt-1">Tempel QR ini di meja agar tamu bisa pesan mandiri</p>
            </div>
            <div className="bg-white p-4 rounded-xl">
              <QRCode value={`${baseUrl}/menu/${qrTable}`} size={200} />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground font-mono break-all bg-secondary px-3 py-2 rounded-lg border border-border">
                {baseUrl}/menu/{qrTable}
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => { navigator.clipboard.writeText(`${baseUrl}/menu/${qrTable}`); }}
                className="flex-1 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
              >
                <Copy size={12} /> Salin Link
              </button>
              <button
                onClick={() => window.open(`${baseUrl}/menu/${qrTable}`, "_blank")}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-indigo-500 flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={12} /> Buka Link
              </button>
            </div>
            <button onClick={() => setQrTable(null)} className="text-xs text-muted-foreground hover:text-foreground">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Katalog Menu — digantikan oleh <MenuManagement /> ────────────────────────

// ─── Promo ────────────────────────────────────────────────────────────────────
function PromoModule({ promos, onTogglePromo, onAddPromo }: { promos: Promo[]; onTogglePromo: (id: string) => void; onAddPromo: (promo: Promo) => void }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPromo, setNewPromo] = useState<Omit<Promo, "id" | "active">>({
    name: "",
    description: "",
    discount: 0,
    type: "percentage",
    code: "",
    min_order: 0,
    valid_until: ""
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Manajemen Promo</h3>
          <p className="text-muted-foreground text-xs mt-0.5">{promos.filter(p => p.active).length} promo aktif</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"><Plus size={14} /> Buat Promo</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {promos.map(promo => (
          <div key={promo.id} className={`bg-card border rounded-xl p-5 transition-all ${promo.active ? "border-border" : "border-border opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-sm text-foreground">{promo.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${promo.active ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-secondary border-border text-muted-foreground"}`}>
                    {promo.active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{promo.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-lg text-primary font-['Poppins']">
                  {promo.type === "percentage" ? `${promo.discount}%` : rp(promo.discount)}
                </p>
                <p className="text-[10px] text-muted-foreground">{promo.type === "percentage" ? "diskon" : "potongan"}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div>
                {promo.code && (
                  <span className="text-xs font-mono bg-secondary border border-border px-2 py-0.5 rounded text-muted-foreground">{promo.code}</span>
                )}
                {promo.min_order && (
                  <p className="text-[10px] text-muted-foreground mt-1">Min. order {rp(promo.min_order)}</p>
                )}
                {promo.valid_until && (
                  <p className="text-[10px] text-muted-foreground">s/d {promo.valid_until}</p>
                )}
              </div>
              <button
                onClick={() => onTogglePromo(promo.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${promo.active ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"}`}
              >
                {promo.active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Buat Promo */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="font-bold text-lg font-['Poppins']">Buat Promo Baru</h3>
              <p className="text-xs text-muted-foreground mt-1">Tambahkan promo baru untuk pelanggan</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nama Promo</label>
                <input type="text" value={newPromo.name} onChange={e => setNewPromo({ ...newPromo, name: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: Promo Keluarga" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Deskripsi</label>
                <input type="text" value={newPromo.description} onChange={e => setNewPromo({ ...newPromo, description: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: Diskon untuk makan bersama keluarga" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promo-type" className="text-xs font-semibold text-muted-foreground">Tipe</label>
                  <select id="promo-type" value={newPromo.type} onChange={e => setNewPromo({ ...newPromo, type: e.target.value as "percentage" | "fixed" })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Diskon</label>
                  <input type="number" value={newPromo.discount} onChange={e => setNewPromo({ ...newPromo, discount: Number(e.target.value) })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: 10 atau 15000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Kode Promo (Opsional)</label>
                  <input type="text" value={newPromo.code} onChange={e => setNewPromo({ ...newPromo, code: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: KELUARGA" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Min. Order (Opsional)</label>
                  <input type="number" value={newPromo.min_order} onChange={e => setNewPromo({ ...newPromo, min_order: Number(e.target.value) })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: 100000" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Berlaku Sampai (Opsional)</label>
                <input type="text" value={newPromo.valid_until} onChange={e => setNewPromo({ ...newPromo, valid_until: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: 31 Des 2026" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground">Batal</button>
              <button 
                onClick={() => {
                  if (!newPromo.name || !newPromo.discount) return;
                  const promo: Promo = {
                    id: `PROMO-${Date.now().toString(36).toUpperCase()}`,
                    ...newPromo,
                    active: true
                  };
                  onAddPromo(promo);
                  setIsCreateModalOpen(false);
                  setNewPromo({ name: "", description: "", discount: 0, type: "percentage", code: "", min_order: 0, valid_until: "" });
                }}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-indigo-500"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Petty Cash ───────────────────────────────────────────────────────────────
function PettyCashModule() {
  const dummyLogs = [
    { id: 1, date: "13 Mei 2026, 10:00", description: "Modal awal laci kasir", type: "in", amount: 500000 },
    { id: 2, date: "13 Mei 2026, 14:30", description: "Beli es batu kristal", type: "out", amount: 15000 },
    { id: 3, date: "13 Mei 2026, 16:00", description: "Bayar parkir kurir", type: "out", amount: 2000 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Petty Cash (Kas Kecil)</h3>
          <p className="text-muted-foreground text-xs mt-0.5">Catat uang masuk dan keluar kecil untuk operasional</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors">
          <Plus size={14} /> Catat Transaksi
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase mb-1">Saldo Saat Ini</p>
          <p className="font-bold text-xl text-foreground font-['Poppins']">{rp(483000)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase mb-1">Total Masuk</p>
          <p className="font-bold text-xl text-green-400 font-['Poppins']">{rp(500000)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase mb-1">Total Keluar</p>
          <p className="font-bold text-xl text-red-400 font-['Poppins']">{rp(17000)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left text-muted-foreground p-4 font-medium">Tanggal</th>
              <th className="text-left text-muted-foreground p-4 font-medium">Keterangan</th>
              <th className="text-right text-muted-foreground p-4 font-medium">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {dummyLogs.map(log => (
              <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="p-4 font-mono text-muted-foreground">{log.date}</td>
                <td className="p-4 font-semibold text-foreground">{log.description}</td>
                <td className={`p-4 text-right font-bold ${log.type === "in" ? "text-green-400" : "text-red-400"}`}>
                  {log.type === "in" ? "+" : "-"}{rp(log.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground">Fitur Petty Cash ini dalam tahap pengembangan visual. Integrasi database akan dilakukan pada tahap berikutnya.</p>
      </div>
    </div>
  );
}

// ─── Inventaris ───────────────────────────────────────────────────────────────
function getExpiryStatus(expDate: string) {
  const exp = new Date(expDate); const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  if (diff <= 0) return { label: "Kadaluarsa", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: <XCircle size={12} /> };
  if (diff <= 2) return { label: `${diff}h lagi`, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: <AlertTriangle size={12} /> };
  if (diff <= 7) return { label: `${diff}h lagi`, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: <Clock size={12} /> };
  return { label: `${diff}h lagi`, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: <CheckCircle2 size={12} /> };
}

function InventarisModule({ inventory, logs, onAdd, onUpdate, onDelete }: { inventory: InventoryItem[]; logs: any[]; onAdd: (item: InventoryItem) => void; onUpdate: (item: InventoryItem) => void; onDelete: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilterState] = useState<"all" | "critical" | "warning">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Omit<InventoryItem, "id">>({
    name: "",
    category: "",
    qty: 0,
    unit: "",
    min_stock: 0,
    method: "FIFO",
    exp_date: "",
    stock: 0
  });

  const getStatus = (item: InventoryItem) => {
    const exp = new Date(item.exp_date); const now = new Date(); now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
    if (diff <= 0) return "expired"; if (diff <= 2) return "critical"; if (diff <= 7) return "warning"; return "ok";
  };

  const filtered = inventory.filter(item => {
    const s = getStatus(item);
    if (filter === "critical" && s !== "critical" && s !== "expired") return false;
    if (filter === "warning" && s !== "warning") return false;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  const expiredCount = inventory.filter(i => getStatus(i) === "expired").length;
  const criticalCount = inventory.filter(i => getStatus(i) === "critical").length;
  const warningCount = inventory.filter(i => getStatus(i) === "warning").length;

  const openModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        qty: item.qty,
        unit: item.unit,
        min_stock: item.min_stock,
        method: item.method,
        exp_date: item.exp_date,
        stock: item.stock
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        category: "",
        qty: 0,
        unit: "",
        min_stock: 0,
        method: "FIFO",
        exp_date: "",
        stock: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.exp_date) return;
    
    if (editingItem) {
      onUpdate({ ...editingItem, ...formData });
    } else {
      onAdd({
        id: `INV-${Date.now().toString(36).toUpperCase()}`,
        ...formData,
        qty: formData.stock // Sync qty with stock for simplicity
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {(expiredCount > 0 || criticalCount > 0) && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-red-400">Perhatian: </span>
            <span className="text-muted-foreground">
              {expiredCount > 0 && <span>{expiredCount} bahan <strong>kadaluarsa</strong>, </span>}
              {criticalCount > 0 && <span>{criticalCount} bahan <strong>kritis (≤2 hari)</strong></span>}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-4 gap-3 flex-1 mr-4">
          {[
            { val: expiredCount, label: "Kadaluarsa", color: "text-red-400", border: "border-red-500/20" },
            { val: criticalCount, label: "Kritis (≤2h)", color: "text-orange-400", border: "border-orange-500/20" },
            { val: warningCount, label: "Perlu Perhatian", color: "text-yellow-400", border: "border-yellow-500/20" },
            { val: inventory.length, label: "Total Item", color: "text-foreground", border: "border-border" },
          ].map(m => (
            <div key={m.label} className={`bg-card border ${m.border} rounded-xl p-4`}>
              <p className={`text-xl font-bold ${m.color} font-['Poppins']`}>{m.val}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-colors h-fit"><Plus size={14} /> Tambah Bahan</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari bahan baku..." className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary/50 transition-colors" />
        </div>
        {(["all", "critical", "warning"] as const).map(f => (
          <button key={f} onClick={() => setFilterState(f)} className={`px-3 py-2.5 rounded-lg text-xs border transition-colors ${filter === f ? "bg-primary border-primary text-white" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "Semua" : f === "critical" ? "Kritis" : "Perhatian"}
          </button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {["Nama Bahan", "Kategori", "Stok", "Metode", "Tgl Exp.", "Status", "Aksi"].map(h => (
                <th key={h} className={`text-left text-muted-foreground p-4 font-medium ${h === "Stok" ? "text-right" : ""} ${h === "Aksi" ? "text-center" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const exp = getExpiryStatus(item.exp_date);
              const lowStock = item.stock < item.min_stock;
              return (
                <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-semibold text-foreground">{item.name}</td>
                  <td className="p-4 text-muted-foreground">{item.category}</td>
                  <td className="p-4 text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`font-mono font-semibold cursor-pointer ${lowStock ? "text-red-400" : "text-foreground"}`}>{item.stock} {item.unit}</span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover text-popover-foreground border border-border p-3 shadow-xl max-w-xs">
                          <div className="space-y-2">
                            <p className="font-semibold text-xs text-primary">Riwayat Belanja</p>
                            {logs && logs.filter(l => l.inventory_id === item.id && l.type === 'in').length > 0 ? (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {logs
                                  .filter(l => l.inventory_id === item.id && l.type === 'in')
                                  .map(log => (
                                    <div key={log.id} className="flex justify-between gap-4 text-[10px]">
                                      <span className="text-muted-foreground">{format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}</span>
                                      <span className="font-bold text-emerald-400">+{log.quantity} {item.unit}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">Belum ada riwayat belanja</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {lowStock && <span className="ml-2 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">Stok Rendah</span>}
                  </td>
                  <td className="p-4"><span className="text-[10px] font-mono bg-secondary border border-border px-2 py-0.5 rounded">{item.method}</span></td>
                  <td className="p-4 font-mono text-muted-foreground">{item.exp_date}</td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-[11px] font-semibold border ${exp.bg} ${exp.color}`}>{exp.icon} {exp.label}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openModal(item)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Edit2 size={12} /></button>
                      <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Hapus"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah/Edit Bahan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="font-bold text-lg font-['Poppins']">{editingItem ? "Edit Bahan Baku" : "Tambah Bahan Baku"}</h3>
              <p className="text-xs text-muted-foreground mt-1">{editingItem ? "Perbarui data bahan baku" : "Tambahkan bahan baku baru ke inventaris"}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nama Bahan</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: Ayam Broiler" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Kategori</label>
                <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: Daging / Sayur" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inv-stock" className="text-xs font-semibold text-muted-foreground">Stok Saat Ini</label>
                  <input id="inv-stock" type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value), qty: Number(e.target.value) })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Satuan</label>
                  <input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Misal: kg / pcs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inv-min-stock" className="text-xs font-semibold text-muted-foreground">Minimal Stok</label>
                  <input id="inv-min-stock" type="number" value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: Number(e.target.value) })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" />
                </div>
                <div>
                  <label htmlFor="inv-method" className="text-xs font-semibold text-muted-foreground">Metode</label>
                  <select id="inv-method" value={formData.method} onChange={e => setFormData({ ...formData, method: e.target.value as "FIFO" | "LIFO" })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="FIFO">FIFO</option>
                    <option value="LIFO">LIFO</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="inv-exp-date" className="text-xs font-semibold text-muted-foreground">Tanggal Kadaluarsa</label>
                <input id="inv-exp-date" type="date" value={formData.exp_date} onChange={e => setFormData({ ...formData, exp_date: e.target.value })} className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground">Batal</button>
              <button onClick={handleSubmit} className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-indigo-500">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Laporan ──────────────────────────────────────────────────────────────────
function LaporanModule({ transactions }: { transactions: Transaction[] }) {
  const weekDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const daySales = transactions.filter(tx => tx.created_at.startsWith(dayStr)).reduce((s, tx) => s + tx.total, 0);
    return { day: weekDays[d.getDay()], sales: daySales };
  });
  const hasRealData = weeklyData.some(d => d.sales > 0);
  const displayData = hasRealData ? weeklyData : [
    { day: "Sen", sales: 3420000 }, { day: "Sel", sales: 4872000 },
    { day: "Rab", sales: 5100000 }, { day: "Kam", sales: 4650000 },
    { day: "Jum", sales: 6200000 }, { day: "Sab", sales: 7800000 }, { day: "Min", sales: 5900000 },
  ];
  const weekTotal = displayData.reduce((s, d) => s + d.sales, 0);
  const txCount = transactions.length;
  const avgTx = txCount > 0 ? Math.round(transactions.reduce((s, tx) => s + tx.total, 0) / txCount) : 100640;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Penjualan Minggu Ini", val: rp(weekTotal || 37942000), trend: "+18.3% vs minggu lalu" },
          { label: "Total Transaksi", val: String(txCount || 377), trend: "+22 transaksi" },
          { label: "Rata-rata per Transaksi", val: rp(avgTx), trend: null },
        ].map(m => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2">{m.label}</p>
            <p className="font-bold text-2xl text-foreground font-['Poppins']">{m.val}</p>
            {m.trend && <p className="text-green-400 text-xs font-semibold mt-1 flex items-center gap-1"><ArrowUpRight size={12} /> {m.trend}</p>}
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Penjualan 7 Hari Terakhir</h3>
          {hasRealData && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Database size={10} className="text-indigo-400" /> Data real dari Supabase</span>}
        </div>
        <WeeklySalesChart data={displayData} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">Produk Terlaris</h3>
          <div className="space-y-2">
            {BEST_SELLER_DATA.map((d, i) => (
              <div key={d.name} className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground w-4">{i + 1}.</span>
                <span className="flex-1 text-foreground">{d.name}</span>
                <span className="font-bold text-primary">{d.qty}x</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">Metode Pembayaran</h3>
          <div className="space-y-2.5">
            {PAYMENT_DATA.map(d => {
              const bgClass = d.color === "#6366F1" ? "bg-indigo-500" : d.color === "#22C55E" ? "bg-green-500" : d.color === "#F59E0B" ? "bg-amber-500" : "bg-pink-500";
              const textClass = d.color === "#6366F1" ? "text-indigo-500" : d.color === "#22C55E" ? "text-green-500" : d.color === "#F59E0B" ? "text-amber-500" : "text-pink-500";
              return (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${bgClass}`} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className={`font-semibold ${textClass}`}>{d.value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Buku Menu Digital ──────────────────────────────────────────────────────────
function QrMenuModule({ tables }: { tables: TableData[] }) {
  const baseUrl = GUEST_BASE_URL;

  function handleDownload(tableId: string) {
    const svg = document.querySelector(`#qr-code-${tableId} svg`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 120;
      canvas.height = 120;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_Meja_${tableId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  }

  function handlePrintAll() {
    const printContent = tables.map(t => `
      <div style="page-break-inside:avoid; display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed #ccc; border-radius:16px; padding:24px; margin:12px; width:280px; height:320px;">
        <p style="font-family:Poppins,sans-serif; font-size:20px; font-weight:700; margin:0 0 4px; color:#1F2937;">Buku Menu Digital</p>
        <p style="font-family:Poppins,sans-serif; font-size:14px; font-weight:600; color:#6B7280; margin:0 0 16px;">Kedai Elvera 57</p>
        <div style="background:#fff; padding:8px; border-radius:8px;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${baseUrl}/menu/${t.id}`)}" width="180" height="180" />
        </div>
        <p style="font-family:Poppins,sans-serif; font-size:24px; font-weight:700; margin:16px 0 0; color:#1F2937;">Meja ${t.id}</p>
      </div>
    `).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>QR Menu - Kedai Elvera 57</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        body { margin:0; display:flex; flex-wrap:wrap; justify-content:center; font-family:Poppins,sans-serif; }
        @media print { 
          @page { margin: 0; }
          body { margin: 1cm; }
        }
      </style></head><body>${printContent}
      <script>
        window.onload = () => {
          setTimeout(() => window.print(), 500);
        };
      </script></body></html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Buku Menu Digital</h3>
          <p className="text-muted-foreground text-xs mt-0.5">QR Code untuk setiap meja — tamu scan langsung lihat menu &amp; pesan mandiri</p>
        </div>
        <button
          onClick={handlePrintAll}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"
        >
          <Printer size={14} /> Cetak Semua Stiker
        </button>
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 flex items-start gap-3">
        <QrCode size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Cara kerja:</strong> Cetak QR stiker untuk setiap meja, tempel di meja. Tamu scan QR → buka menu digital → pilih item → pesan langsung ke dapur.</p>
          <p>URL dasar: <code className="bg-secondary border border-border px-1.5 py-0.5 rounded font-mono text-[10px]">{baseUrl}/menu/{"{meja}"}</code></p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map(t => {
          const url = `${baseUrl}/menu/${t.id}`;
          return (
            <div key={t.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col items-center p-5 gap-3 group hover:border-primary/30 transition-colors">
              <p className="font-bold text-sm font-['Poppins']">Meja {t.id}</p>
              <div id={`qr-code-${t.id}`} className="bg-white p-2 rounded-lg">
                <QRCode value={url} size={120} />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono break-all text-center leading-tight">{url}</p>
              <div className="flex gap-2 w-full mt-auto">
                <button
                  onClick={() => handleDownload(t.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-secondary border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download size={10} /> Unduh
                </button>
                <button
                  onClick={() => window.open(url, "_blank")}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <ExternalLink size={10} /> Buka
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeModule, setActiveModule] = useState<Module>("transaksi");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [time, setTime] = useState(new Date());
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [sdmSubModule, setSdmSubModule] = useState<"karyawan" | "shift">("karyawan");
  const [stokSubModule, setStokSubModule] = useState<"bahan" | "asset">("bahan");
  const [transaksiSubModule, setTransaksiSubModule] = useState<"summary" | "laporan">("summary");
  const [kasirSubModule, setKasirSubModule] = useState<"pos" | "promo" | "petty">("pos");

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

  // Auth check
  useEffect(() => {
    const s = localStorage.getItem("pawon_session");
    if (!s) { navigate("/"); return; }
    const parsed = JSON.parse(s) as UserSession;
    if (parsed.role !== "admin") { navigate("/waiter"); return; }
    setSession(parsed);
    preloadVoices();
  }, [navigate]);

  // Clock
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(t); }, []);

  // Load orders from server
  const loadOrders = useCallback(async () => {
    try {
      const orders = await fetchOrders();
      // Filter hanya pesanan yang aktif (belum selesai/dibatalkan) agar sama dengan modul waiter
      const active = orders.filter(o => o.status !== "served" && o.status !== "cancelled");
      setLiveOrders(active);
    } catch (e) { console.log("Error loading orders:", e); }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 8000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Supabase init
  useEffect(() => {
    let mejaChannel: ReturnType<typeof supabase.channel> | null = null;
    let txChannel: ReturnType<typeof supabase.channel> | null = null;

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

        const { data: txRows } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
        if (txRows) setTransactions(txRows.map((r: any) => ({ id: r.id, table_id: r.table_id, items: r.items || [], subtotal: r.subtotal, tax: r.tax, total: r.total, method: r.method, created_at: r.created_at })));

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
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, payload => {
            const r = payload.new as any;
            const newTx: Transaction = { id: r.id, table_id: r.table_id, items: r.items || [], subtotal: r.subtotal, tax: r.tax, total: r.total, method: r.method, created_at: r.created_at };
            setTransactions(prev => [newTx, ...prev].slice(0, 200));
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
    };
  }, []);

  const handleTransaction = useCallback(async (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    if (connected) {
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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex-shrink-0 flex flex-col border-r border-border bg-sidebar transition-all duration-200 ${sidebarOpen ? "w-56" : "w-14"}`}>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Kedai Elvera 57" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="font-bold text-sm text-foreground leading-tight font-['Poppins']">Kedai Elvera 57</p>
                <p className="text-xs text-muted-foreground leading-tight">Admin Panel</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            const hasBadge = (item.id === "stok" && criticalAlerts > 0) || (item.id === "orders" && pendingOrdersCount > 0);
            const badgeCount = item.id === "stok" ? criticalAlerts : pendingOrdersCount;
            return (
              <button key={item.id} onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-xs ${active ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"}`}>
                <Icon size={15} className="flex-shrink-0" />
                {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
                {sidebarOpen && hasBadge && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badgeCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-sidebar-border">
          {sidebarOpen && <div className="px-3 py-2 mb-1"><ConnectionBadge connected={connected} /></div>}
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors text-xs">
            <LogOut size={15} className="flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-5 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle Sidebar" className="text-muted-foreground hover:text-foreground transition-colors">
            <Grid3X3 size={16} />
          </button>
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Kedai Elvera 57" className="w-8 h-8 rounded-full object-cover" />
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <span className="font-medium">Kedai Elvera 57</span>
              <ChevronRight size={12} />
              <span className="text-foreground font-medium">{moduleLabels[activeModule]}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {seeding && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><RefreshCw size={10} className="animate-spin text-indigo-400" /> Sinkronisasi...</span>}
            <span className="text-xs text-muted-foreground font-mono hidden sm:block">
              {time.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} · {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {/* TTS Toggle */}
            <button
              onClick={() => setTtsEnabled(v => !v)}
              title={ttsEnabled ? "Matikan notifikasi suara" : "Aktifkan notifikasi suara"}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-all ${
                ttsEnabled
                  ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              <span className="hidden lg:inline">{ttsEnabled ? "TTS On" : "TTS Off"}</span>
            </button>

            {/* Supabase Toggle */}
            <button
              onClick={() => setConnected(v => !v)}
              title={connected ? "Matikan koneksi Supabase" : "Aktifkan koneksi Supabase"}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-all ${
                connected
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-indigo-400" : "bg-rose-400"}`} />
              <span className="hidden lg:inline">{connected ? "Supabase On" : "Supabase Off"}</span>
            </button>

            {/* Tes TTS Button */}
            <button
              onClick={() => speak("Tes suara notifikasi. Pesanan baru masuk dari tamu.")}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-border bg-secondary hover:text-foreground transition-all"
              title="Uji coba suara TTS"
            >
              <Volume2 size={12} />
              <span className="hidden lg:inline">Tes Suara</span>
            </button>

            <button onClick={() => setActiveModule("orders")} className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={16} />
              {(criticalAlerts + pendingOrdersCount) > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{criticalAlerts + pendingOrdersCount}</span>
              )}
            </button>
            <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-[10px] font-bold">AD</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          <div className="max-w-7xl mx-auto">
            {activeModule === "transaksi" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-border">
                  <div className="flex">
                    <button
                      onClick={() => setTransaksiSubModule("summary")}
                      className={`px-4 py-2 text-sm font-semibold transition-colors ${transaksiSubModule === "summary" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => setTransaksiSubModule("laporan")}
                      className={`px-4 py-2 text-sm font-semibold transition-colors ${transaksiSubModule === "laporan" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Laporan
                    </button>
                  </div>
                  
                  {/* Filter Button */}
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="flex items-center gap-2 px-3 py-1.5 mb-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-all"
                  >
                    <Calendar size={12} />
                    {dateRange?.from && dateRange?.to ? (
                      <span>{format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM")}</span>
                    ) : (
                      <span>Filter Tanggal</span>
                    )}
                  </button>
                </div>

                {/* Date Picker Modal */}
                {showDatePicker && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="relative max-w-4xl w-full">
                      <button 
                        onClick={() => setShowDatePicker(false)}
                        title="Tutup"
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
                      >
                        <XCircle size={20} />
                      </button>
                      <DateRangePicker 
                        onSelect={(range) => setDateRange(range)} 
                        onClose={() => setShowDatePicker(false)} 
                      />
                    </div>
                  </div>
                )}

                {transaksiSubModule === "summary" && <DashboardModule transactions={filteredTransactions} liveOrders={liveOrders} connected={connected} />}
                {transaksiSubModule === "laporan" && <LaporanModule transactions={filteredTransactions} />}
              </div>
            )}
            {activeModule === "orders" && <OrdersModule orders={liveOrders} onRefresh={loadOrders} connected={connected} />}
            {activeModule === "stok" && (
              <div className="space-y-5">
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setStokSubModule("bahan")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${stokSubModule === "bahan" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Bahan Baku
                  </button>
                  <button
                    onClick={() => setStokSubModule("asset")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${stokSubModule === "asset" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Asset Restoran
                  </button>
                </div>
                {stokSubModule === "bahan" && <InventarisModule inventory={inventory} logs={inventoryLogs} onAdd={addInventory} onUpdate={updateInventory} onDelete={deleteInventory} />}
                {stokSubModule === "asset" && <AssetModule />}
              </div>
            )}
            {activeModule === "sdm" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-border">
                  <div className="flex">
                    <button
                      onClick={() => setSdmSubModule("karyawan")}
                      className={`px-4 py-2 text-sm font-semibold transition-colors ${sdmSubModule === "karyawan" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Daftar Karyawan
                    </button>
                    <button
                      onClick={() => setSdmSubModule("shift")}
                      className={`px-4 py-2 text-sm font-semibold transition-colors ${sdmSubModule === "shift" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Jadwal Shift
                    </button>
                  </div>
                  
                  {/* Filter Button */}
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="flex items-center gap-2 px-3 py-1.5 mb-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-all"
                  >
                    <Calendar size={12} />
                    {dateRange?.from && dateRange?.to ? (
                      <span>{format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM")}</span>
                    ) : (
                      <span>Filter Tanggal</span>
                    )}
                  </button>
                </div>
                {sdmSubModule === "karyawan" && <KaryawanModule />}
                {sdmSubModule === "shift" && <JadwalShift dateRange={dateRange} />}
              </div>
            )}
            {activeModule === "hpp" && <KalkulatorHPP />}
            {activeModule === "kasir" && (
              <div className="space-y-5">
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setKasirSubModule("pos")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${kasirSubModule === "pos" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Kasir
                  </button>
                  <button
                    onClick={() => setKasirSubModule("promo")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${kasirSubModule === "promo" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Promo
                  </button>
                  <button
                    onClick={() => setKasirSubModule("petty")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${kasirSubModule === "petty" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Petty Cash
                  </button>
                </div>
                {kasirSubModule === "pos" && <KasirModule menuItems={menuItems} onTransaction={handleTransaction} promos={promos} tables={tables} />}
                {kasirSubModule === "promo" && <PromoModule promos={promos} onTogglePromo={togglePromo} onAddPromo={addPromo} />}
                {kasirSubModule === "petty" && <PettyCashModule />}
              </div>
            )}
            {activeModule === "meja" && <MejaModule tables={tables} onUpdateStatus={handleUpdateTableStatus} />}
            {activeModule === "menu" && (
              <MenuManagement
                menuItems={menuItems}
                connected={connected}
                onSaveItem={handleSaveMenuItem}
                onDeleteItem={handleDeleteMenuItem}
                onToggleAvailability={handleToggleAvailability}
                onReorder={handleReorderMenuItems}
              />
            )}
            {activeModule === "qr-menu" && <QrMenuModule tables={tables} />}


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
        </main>
      </div>
    </div>
  );
}
