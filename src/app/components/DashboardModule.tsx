import React, { useState, useEffect } from "react";
import { Bell, Database, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { rp, HOURLY_DATA } from "../data";
import type { Transaction, Order } from "../types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ─── Chart helpers ─────────────────────────────────────────────────────────────
function HourlySalesChart({ data }: { data: { hour: string; sales: number }[] }) {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="hour" stroke="#6B7080" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#6B7080" fontSize={10} tickFormatter={(v) => `Rp${v/1000}k`} tickLine={false} axisLine={false} width={40} />
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            itemStyle={{ color: '#6366F1' }}
            formatter={(value: any) => [rp(value), "Penjualan"]}
          />
          <Area type="monotone" dataKey="sales" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricCard({ label, value, sub, trend, trendUp, accent, loading }: {
  label: string; value: string; sub?: string; trend?: string; trendUp?: boolean; accent?: string; loading?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-500/20">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">{label}</p>
      {loading ? (
        <div className="h-6 bg-secondary animate-pulse rounded-md w-3/4 mt-1"></div>
      ) : (
        <p className={`font-bold leading-none font-['Poppins'] text-[clamp(1.25rem,2vw,1.75rem)] ${accent || "text-[#E8EAF0]"}`}>{value}</p>
      )}
      <div className="flex items-center gap-2 mt-auto">
        {loading ? (
          <div className="h-4 bg-secondary animate-pulse rounded-md w-1/2"></div>
        ) : (
          <>
            {trend && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp ? "text-green-400" : "text-red-400"}`}>
                {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{trend}
              </span>
            )}
            {sub && <span className="text-muted-foreground text-xs">{sub}</span>}
          </>
        )}
      </div>
    </div>
  );
}

interface DashboardModuleProps {
  transactions: Transaction[];
  liveOrders: Order[];
  connected: boolean;
}

export const DashboardModule = ({ transactions, liveOrders, connected }: DashboardModuleProps) => {
  const [todayMetrics, setTodayMetrics] = useState({ totalSales: 0, transactionCount: 0, avgTransaction: 0 });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let transactionsSubscription: any;
    let ordersSubscription: any;

    const fetchMetrics = async () => {
      setLoading(true);
      setFetchError(false);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from('transactions')
          .select('total')
          .gte('created_at', today + 'T00:00:00.000Z')
          .lte('created_at', today + 'T23:59:59.999Z');

        if (error) throw error;

        if (data) {
          const totalSales = data.reduce((sum, tx) => sum + (tx.total || 0), 0);
          const transactionCount = data.length;
          const avgTransaction = transactionCount > 0 ? Math.round(totalSales / transactionCount) : 0;

          setTodayMetrics({ totalSales, transactionCount, avgTransaction });
        }
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    };

    if (connected) {
      fetchMetrics();

      // Set up realtime subscriptions
      transactionsSubscription = supabase
        .channel('transactions-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions'
        }, () => {
          // Refresh metrics when any transaction changes
          fetchMetrics();
        })
        .subscribe();

      ordersSubscription = supabase
        .channel('orders-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders'
        }, () => {
          // Orders updates are handled by parent component
          console.log('Orders updated via realtime');
        })
        .subscribe();

      // Polling fallback every 30 seconds
      interval = setInterval(fetchMetrics, 30000);
    } else {
      setLoading(false);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (transactionsSubscription) transactionsSubscription.unsubscribe();
      if (ordersSubscription) ordersSubscription.unsubscribe();
    };
  }, [connected, transactions, retryCount]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTx = transactions.filter(tx => tx.created_at.startsWith(todayStr));
  const todaySales = connected ? todayMetrics.totalSales : todayTx.reduce((s, tx) => s + tx.total, 0);
  const todayCount = connected ? todayMetrics.transactionCount : todayTx.length;
  const todayAvg = connected ? todayMetrics.avgTransaction : (todayCount > 0 ? Math.round(todaySales / todayCount) : 0);

  const pending = liveOrders.filter(o => o.status === "pending").length;
  const cooking = liveOrders.filter(o => o.status === "cooking").length;

  // Hitung data penjualan per jam secara dinamis
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i.toString().padStart(2, "0") + ":00",
    sales: 0
  }));

  transactions.forEach(tx => {
    if (tx.created_at.startsWith(todayStr)) {
      const hour = new Date(tx.created_at).getHours();
      if (hour >= 0 && hour < 24) {
        hourlyData[hour].sales += tx.total;
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Error Fallback Alert */}
      {fetchError && (
        <div className="flex items-center justify-between gap-3 bg-red-500/5 border border-red-500/15 rounded-xl p-4 animate-fade">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <p className="text-sm text-foreground">
              Gagal memuat data dari Supabase. Menggunakan data lokal (Offline mode).
            </p>
          </div>
          <button 
            onClick={() => setRetryCount(c => c + 1)}
            className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 bg-red-500/10 rounded-lg transition-all"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Live alerts */}
      {(pending > 0 || cooking > 0) && (
        <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-4">
          <Bell size={16} className="text-yellow-400 flex-shrink-0 animate-pulse" />
          <p className="text-sm text-foreground">
            <span className="font-semibold text-yellow-400">{pending} pesanan</span> menunggu konfirmasi ·{" "}
            <span className="font-semibold text-orange-400">{cooking} pesanan</span> sedang dimasak
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Penjualan" value={rp(todaySales)} trend="+12.4%" trendUp sub="vs kemarin" accent="text-[#818CF8]" loading={loading} />
        <MetricCard label="Laba Kotor" value={rp(Math.round(todaySales * 0.5))} trend="+8.1%" trendUp sub="margin 50%" accent="text-[#34D399]" loading={loading} />
        <MetricCard label="Laba Bersih" value={rp(Math.round(todaySales * 0.3))} trend="+5.3%" trendUp sub="margin 30%" accent="text-[#22C55E]" loading={loading} />
        <MetricCard label="Pesanan Aktif" value={String(liveOrders.filter(o => o.status !== "served").length)} sub="realtime" accent="text-[#F59E0B]" loading={loading} />
        <MetricCard label="Transaksi" value={String(todayCount)} trend="+3" trendUp sub={`rata-rata ${rp(todayAvg)}`} accent="text-[#F59E0B]" loading={loading} />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Tren Penjualan Hari Ini</h3>
            <p className="text-muted-foreground text-xs mt-0.5">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border border-border">Live</span>
        </div>
        {loading ? (
          <div className="w-full h-[200px] bg-secondary/30 animate-pulse rounded-lg flex items-center justify-center border border-border/50">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground">Memuat tren penjualan...</span>
            </div>
          </div>
        ) : (
          <HourlySalesChart data={hourlyData} />
        )}
      </div>

      {/* Recent transactions */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Transaksi Terakhir</h3>
          <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border border-border flex items-center gap-1.5">
            <Database size={10} className="text-indigo-400" /> Supabase Live
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {["ID", "Meja", "Item", "Jumlah", "Metode", "Waktu"].map(h => (
                  <th key={h} className={`text-muted-foreground pb-3 pr-4 font-medium ${h === "Jumlah" ? "text-right" : h === "Waktu" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 pr-4"><div className="h-4 bg-secondary animate-pulse rounded w-20"></div></td>
                    <td className="py-3 pr-4"><div className="h-4 bg-secondary animate-pulse rounded w-16"></div></td>
                    <td className="py-3 pr-4"><div className="h-4 bg-secondary animate-pulse rounded w-12"></div></td>
                    <td className="py-3 pr-4 text-right"><div className="h-4 bg-secondary animate-pulse rounded w-16 ml-auto"></div></td>
                    <td className="py-3 pr-4"><div className="h-4 bg-secondary animate-pulse rounded w-12"></div></td>
                    <td className="py-3 text-right"><div className="h-4 bg-secondary animate-pulse rounded w-10 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                transactions.slice(0, 6).map(tx => (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="py-3 pr-4 font-mono text-muted-foreground">{tx.id.slice(0, 10).toUpperCase()}</td>
                    <td className="py-3 pr-4 font-semibold">{tx.table_id || "Walk-in"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{tx.items.reduce((s, i) => s + i.qty, 0)} item</td>
                    <td className="py-3 pr-4 text-right font-semibold text-green-400">{rp(tx.total)}</td>
                    <td className="py-3 pr-4"><span className="bg-secondary border border-border px-2 py-0.5 rounded-full">{tx.method || "Tunai"}</span></td>
                    <td className="py-3 text-right text-muted-foreground font-mono">{new Date(tx.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))
              )}
              {!loading && transactions.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada transaksi. Proses pembayaran di modul Kasir.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
