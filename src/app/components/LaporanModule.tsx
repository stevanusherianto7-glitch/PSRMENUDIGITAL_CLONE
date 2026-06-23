/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI LOGIKA PELAPORAN DATA PENJUALAN DAN GRAFIK ANALITIK PAWON SALAM.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN KETIDAKSESUAIAN DATA FINANSIAL. ⚠️
 */

import { useState, useRef } from "react";
import { 
  ArrowUpRight, Database, 
  PieChart as PieIcon, BarChart3, Clock, Download
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from "recharts";
import { rp } from "../data";
import type { Transaction } from "../types";
import { exportCategorySalesReport } from "../../utils/exportUtils";

interface LaporanModuleProps {
  transactions: Transaction[];
}

const CATEGORY_COLORS = ["#C8A96E", "#E2C98A", "#6366F1"];

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

function TiltCard({ children, className = "", glowColor = "rgba(200, 169, 110, 0.15)" }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCoords({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  const rotateX = isHovered ? -coords.y * 12 : 0;
  const rotateY = isHovered ? coords.x * 12 : 0;

  const cardStyle: React.CSSProperties = {
    transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.01 : 1}, ${isHovered ? 1.01 : 1}, 1)`,
    transition: isHovered ? "transform 0.05s ease-out" : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
    boxShadow: isHovered 
      ? `0 20px 40px rgba(0, 0, 0, 0.5), 0 0 25px ${glowColor}`
      : "0 4px 20px rgba(0, 0, 0, 0.15)",
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={cardStyle}
      className={`bg-card border border-border/60 rounded-3xl p-6 transition-shadow duration-500 ease-out select-none cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
}

export function LaporanModule({ transactions }: LaporanModuleProps) {

  // 1. Data Penjualan per Kategori (Makanan, Snack, Minuman)
  const categories = ["Makanan", "Snack", "Minuman"];
  const categorySales = categories.map(cat => {
    const amount = transactions.reduce((sum, tx) => {
      const catItems = tx.items.filter(item => item.category === cat);
      return sum + catItems.reduce((s, i) => s + (i.price * i.qty), 0);
    }, 0);
    return { name: cat, amount };
  });
  
  // Fallback data jika belum ada transaksi (Agar Tampilan Tetap Wow)
  const hasTx = transactions.length > 0;
  const rawCatData = hasTx ? categorySales : [
    { name: "Makanan", amount: 15400000 },
    { name: "Snack", amount: 4200000 },
    { name: "Minuman", amount: 8900000 }
  ];

  const totalSales = rawCatData.reduce((s, c) => s + c.amount, 0);
  const categoryData = rawCatData.map(c => ({
    name: c.name,
    amount: c.amount,
    value: Math.round((c.amount / (totalSales || 1)) * 100)
  }));

  // 2. Data Jam Ramai Transaksi (10:00 - 22:00)
  // Fix Bug#5: removed Math.random() mock — use 0 for hours with no real data
  const hourlyData = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 10;
    const count = hasTx ? transactions.filter(tx => {
      if (!tx.created_at) return false;
      const txDate = new Date(tx.created_at);
      return !isNaN(txDate.getTime()) && txDate.getHours() === hour;
    }).length : 0;
    return { name: `${hour}:00`, total: count };
  });

  // Fix Bug#6: remove hardcoded fallback numbers — show 0 if no real data
  const weekTotal = transactions.reduce((s, tx) => s + (tx.total || 0), 0);
  const txCount = transactions.length;
  const avgTx = txCount > 0 ? Math.round(weekTotal / txCount) : 0;

  // Fix Bug#8: Compute best sellers from real transaction items
  const itemSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
  transactions.forEach(tx => {
    (tx.items || []).forEach(item => {
      const existing = itemSalesMap.get(item.id) || { name: item.name, qty: 0, revenue: 0 };
      itemSalesMap.set(item.id, {
        name: item.name,
        qty: existing.qty + (item.qty || 0),
        revenue: existing.revenue + ((item.price || 0) * (item.qty || 0)),
      });
    });
  });
  const realBestSellers = Array.from(itemSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const bestSellerDisplay = hasTx ? realBestSellers : [];

  // Fix Bug#9: Compute payment method breakdown from real transaction data
  const paymentBreakdown = (() => {
    const methods = ["QRIS", "Tunai", "Debit"];
    const totals = methods.map(m => ({
      name: m,
      amount: transactions.filter(tx => tx.method === m).reduce((s, tx) => s + (tx.total || 0), 0),
    }));
    const grandTotal = totals.reduce((s, t) => s + t.amount, 0);
    return totals.map((t, i) => ({
      name: t.name,
      value: grandTotal > 0 ? Math.round((t.amount / grandTotal) * 100) : 0,
      color: ["#6366F1", "#10B981", "#F59E0B"][i],
    }));
  })();

  return (
    <div className="space-y-4 pb-10">
      
      {/* Header Stats — Fix Bug#7: removed hardcoded trend strings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Omzet Penjualan", val: rp(weekTotal), sub: hasTx ? `${txCount} transaksi` : "Belum ada data", accent: "text-primary" },
          { label: "Volume Transaksi", val: hasTx ? `${txCount} Order` : "0 Order", sub: hasTx ? `avg ${rp(avgTx)}` : "-", accent: "text-foreground" },
          { label: "Rata-rata Struk", val: rp(avgTx), sub: hasTx ? "per transaksi" : "Belum ada data", accent: "text-foreground" },
        ].map(m => (
          <div key={m.label} className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <p className="text-muted-foreground text-[9px] font-black uppercase tracking-[0.15em] mb-1">{m.label}</p>
            <p className={`font-black text-lg leading-tight font-['Poppins'] truncate ${m.accent}`}>{m.val}</p>
            <p className="text-muted-foreground text-[10px] font-bold mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* ── Grafik Penjualan Per Kategori ── */}
        <TiltCard glowColor="rgba(200, 169, 110, 0.2)">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold-faint flex items-center justify-center">
                <PieIcon size={16} className="text-gold" />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase tracking-widest text-foreground">Penjualan Per Kategori</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Food, Snack & Drinks</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                exportCategorySalesReport(categoryData, totalSales);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-secondary/80 transition-all border border-border"
            >
              <Download size={12} /> PDF
            </button>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="amount"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141418', border: '1px solid #C8A96E', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => rp(value)}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </TiltCard>

        {/* ── Grafik Jam Ramai Transaksi ── */}
        <TiltCard glowColor="rgba(99, 102, 241, 0.2)">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <BarChart3 size={16} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest text-foreground">Jam Ramai Transaksi</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Traffic Analysis (10:00 - 22:00)</p>
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tick={{ fill: '#6B7080' }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <YAxis 
                  fontSize={10} 
                  fontWeight="bold" 
                  tick={{ fill: '#6B7080' }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(200, 169, 110, 0.05)' }}
                  contentStyle={{ backgroundColor: '#141418', border: '1px solid #6366F1', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {hourlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#6366F1" : "#818CF8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TiltCard>

      </div>




      {/* ── Table Top Products & Payment (Simplified) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-gold" />
            <h3 className="font-black text-xs uppercase tracking-widest text-foreground">Menu Terlaris</h3>
          </div>
          <div className="space-y-3">
            {bestSellerDisplay.length > 0 ? bestSellerDisplay.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-[10px] font-black">0{i+1}</span>
                  <span className="text-xs font-bold text-foreground">{d.name}</span>
                </div>
                <span className="text-xs font-black text-gold">{d.qty} Porsi</span>
              </div>
            )) : (
              <p className="text-center text-[11px] text-muted-foreground py-6 opacity-50">Belum ada transaksi</p>
            )}
          </div>
        </div>
        
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-indigo-400" />
            <h3 className="font-black text-xs uppercase tracking-widest text-foreground">Metode Pembayaran</h3>
          </div>
          <div className="space-y-4">
            {paymentBreakdown.every(d => d.value === 0) ? (
              <p className="text-center text-[11px] text-muted-foreground py-6 opacity-50">Belum ada transaksi</p>
            ) : paymentBreakdown.map(d => (
              <div key={d.name} className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{d.name}</span>
                  <span className="text-xs font-black text-foreground">{d.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${d.value}%`, backgroundColor: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
