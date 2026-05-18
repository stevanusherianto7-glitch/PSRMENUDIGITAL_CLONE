/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI DASHBOARD ANALITIK DAN VISUALISASI DATA (RECHARTS) PAWON SALAM.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN LAPORAN KEUANGAN TIDAK AKURAT. ⚠️
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Database, ArrowUpRight, ArrowDownRight, PieChart as PieIcon, BarChart as BarIcon, Download, Clock, Wifi, WifiOff, Activity } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { rp } from "../data";
import { subscribeToOrders } from "../api";
import { useSupabaseStatus } from "../hooks/useSupabaseStatus";
import type { Transaction, Order } from "../types";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend 
} from "recharts";

interface DashboardModuleProps {
  transactions: Transaction[];
  liveOrders: Order[];
  connected: boolean;
}

export const DashboardModule = ({ transactions, liveOrders, connected }: DashboardModuleProps) => {
  const { status: dbStatus, lastCheck } = useSupabaseStatus();
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    activeOrdersCount: 0,
    totalTransactions: 0,
    averageBill: 0,
    weeklyData: [] as { name: string; revenue: number; txCount: number }[],
    categoryData: [] as { name: string; value: number }[],
    peakHours: [] as { hour: string; count: number }[],
    recentSales: [] as any[],
  });

  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Reconnection logic for Supabase
  const handleReconnect = useCallback(async () => {
    if (isReconnecting) return;

    setIsReconnecting(true);
    setConnectionError(null);

    try {
      // Try to reconnect to Supabase
      const { data, error } = await supabase.from('orders').select('*').limit(1);

      if (error) {
        throw error;
      }

      // If connection successful, reset status
      setConnectionError(null);
      setRetryCount(0);

      // Show success toast
      if (typeof window !== 'undefined' && window.alert) {
        // Fallback to alert if toast not available
        alert('Koneksi Supabase berhasil dipulihkan!');
      }

    } catch (error: any) {
      console.error('Reconnection failed:', error);
      setConnectionError(error.message || 'Gagal terhubung ke Supabase');

      // Increment retry count and schedule next attempt
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      // Exponential backoff: 2s, 4s, 8s, 16s, etc.
      const delay = Math.min(2000 * Math.pow(2, newRetryCount), 30000); // Max 30 seconds

      reconnectTimeoutRef.current = setTimeout(() => {
        handleReconnect();
      }, delay);

    } finally {
      setIsReconnecting(false);
    }
  }, [isReconnecting, retryCount]);

  // 3. Auto-reconnect when status is offline
  useEffect(() => {
    if (dbStatus === 'offline' && !isReconnecting) {
      handleReconnect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [dbStatus, isReconnecting, handleReconnect]);

  // 1. Fetch metrics from DB or calculate locally
  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Current Date Range (Hari Ini)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // A. Ambil transaksi hari ini dari database
      const { data: todayTx, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());

      if (txError) throw txError;

      const txList = (todayTx as Transaction[]) || [];
      const todayRevenue = txList.reduce((sum, tx) => sum + Number(tx.total), 0);
      const totalTransactions = txList.length;
      const averageBill = totalTransactions > 0 ? Math.round(todayRevenue / totalTransactions) : 0;

      // B. Hitung Weekly Revenue & Transaction counts (7 hari terakhir)
      const weeklyRevenueMap = new Map<string, { revenue: number; txCount: number }>();
      const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = days[d.getDay()];
        weeklyRevenueMap.set(dayLabel, { revenue: 0, txCount: 0 });
      }

      transactions.forEach(tx => {
        const txDate = new Date(tx.created_at);
        const dayLabel = days[txDate.getDay()];
        if (weeklyRevenueMap.has(dayLabel)) {
          const current = weeklyRevenueMap.get(dayLabel)!;
          weeklyRevenueMap.set(dayLabel, {
            revenue: current.revenue + Number(tx.total),
            txCount: current.txCount + 1
          });
        }
      });

      const weeklyData = Array.from(weeklyRevenueMap.entries()).map(([name, data]) => ({
        name,
        revenue: data.revenue,
        txCount: data.txCount
      }));

      // C. Laporan Penjualan per Kategori Menu
      const categoryMap = new Map<string, number>();
      transactions.forEach(tx => {
        (tx.items || []).forEach(item => {
          const cat = item.category || "Lainnya";
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.qty || 0));
        });
      });

      const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value
      }));

      // D. Jam Sibuk Restoran (Peak Hours)
      const hourlyMap = new Map<number, number>();
      for (let h = 8; h <= 22; h++) {
        hourlyMap.set(h, 0);
      }

      transactions.forEach(tx => {
        const hour = new Date(tx.created_at).getHours();
        if (hourlyMap.has(hour)) {
          hourlyMap.set(hour, hourlyMap.get(hour)! + 1);
        }
      });

      const peakHours = Array.from(hourlyMap.entries()).map(([hour, count]) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        count
      }));

      // E. Daftar Penjualan Terbaru
      const recentSales = transactions.slice(0, 5).map(tx => ({
        id: tx.id,
        table: tx.table_id || "-",
        total: tx.total,
        time: new Date(tx.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        itemsCount: (tx.items || []).reduce((sum, item) => sum + (item.qty || 0), 0)
      }));

      setMetrics({
        todayRevenue,
        activeOrdersCount: liveOrders.filter(o => o.status !== "served" && o.status !== "cancelled").length,
        totalTransactions,
        averageBill,
        weeklyData,
        categoryData,
        peakHours,
        recentSales
      });
      setLoading(false);
    } catch (err) {
      console.error("Dashboard metrics calculation error:", err);
      setConnectionError(err instanceof Error ? err.message : 'Gagal memuat data dashboard');

      // Retry connection up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = 3000 * (retryCount + 1); // 3s, 6s, 9s
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, delay);
      } else {
        setLoading(false);
        setConnectionError('Koneksi database gagal. Silakan coba lagi nanti.');
      }
    }
  };

  // Trigger metrics refresh on transactions, liveOrders, or dbStatus changes
  useEffect(() => {
    fetchMetrics();
  }, [transactions, liveOrders, dbStatus]);

  // Add custom CSS animations for neon blinking effects
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flicker {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      @keyframes blink-red {
        0%, 50% { opacity: 1; transform: scale(1); }
        51%, 100% { opacity: 0.3; transform: scale(0.8); }
      }
      @keyframes blink-amber {
        0%, 50% { opacity: 1; transform: scale(1); }
        51%, 100% { opacity: 0.5; transform: scale(0.9); }
      }
      @keyframes pulse-green {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Real-time Database Observer
  useEffect(() => {
    let transactionsSubscription: any = null;
    let ordersSubscription: any = null;
    let interval: any = null;

    if (connected) {
      // Subscribe to real-time transactions insertions
      transactionsSubscription = supabase
        .channel('dashboard-tx-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        }, () => {
          fetchMetrics();
        })
        .subscribe();

      ordersSubscription = subscribeToOrders(() => {
        console.log('Orders updated via realtime');
      });

      interval = setInterval(fetchMetrics, 30000);
    } else {
      console.warn("[Dashboard] Offline mode. Real-time updates temporarily suspended.");
    }

    return () => {
      if (interval) clearInterval(interval);
      if (transactionsSubscription) transactionsSubscription.unsubscribe();
      if (ordersSubscription) ordersSubscription();
    };
  }, [connected, retryCount]);

  // Connection Status Bar
  const ConnectionStatusBar = () => (
    <div className="mb-6">
      <div className={`p-4 rounded-lg border ${
        dbStatus === 'online'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              dbStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="font-medium">
              {dbStatus === 'online' ? '🟢 Database Terhubung' : '🔴 Database Offline'}
            </span>
            {isReconnecting && (
              <span className="text-sm ml-2">🔄 Menghubungkan ulang...</span>
            )}
          </div>
          {dbStatus === 'offline' && (
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isReconnecting ? 'Menghubungkan...' : 'Hubungkan Ulang'}
            </button>
          )}
        </div>
        {connectionError && (
          <div className="mt-2 text-sm opacity-80">
            {connectionError}
          </div>
        )}
      </div>
    </div>
  );

  // Render Skeleton Loading while loading DB metrics
  if (loading) {
    return (
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-card border border-border rounded-3xl p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-muted rounded-full w-1/2"></div>
            <div className="h-8 bg-muted rounded-full w-3/4"></div>
            <div className="h-3 bg-muted rounded-full w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Curated Sleek HSL colors for high-end styling
  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#38bdf8", "#fbbf24", "#f43f5e"];

  return (
    <div className="space-y-6">
      {/* ── SUPABASE CONNECTION STATUS NEON BAR ── */}
      <div className="flex items-center justify-between px-5 py-3 rounded-2xl border transition-all duration-500 shadow-lg"
        style={{
          borderColor: dbStatus === 'online'
            ? 'rgba(16,185,129,0.4)'
            : dbStatus === 'offline'
              ? 'rgba(239,68,68,0.4)'
              : 'rgba(251,191,36,0.4)',
          background: dbStatus === 'online'
            ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)'
            : dbStatus === 'offline'
              ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)'
              : 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.02) 100%)',
          boxShadow: dbStatus === 'online'
            ? '0 0 20px rgba(16,185,129,0.15), 0 0 60px rgba(16,185,129,0.05)'
            : dbStatus === 'offline'
              ? '0 0 20px rgba(239,68,68,0.15), 0 0 60px rgba(239,68,68,0.05)'
              : '0 0 20px rgba(251,191,36,0.15), 0 0 60px rgba(251,191,36,0.05)',
          animation: dbStatus === 'offline' ? 'flicker 1.5s ease-in-out infinite' : 'none'
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {dbStatus === 'online' ? (
              <Wifi size={18} className="text-emerald-400" style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.6))' }} />
            ) : dbStatus === 'offline' ? (
              <WifiOff size={18} className="text-red-400 animate-pulse" style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))' }} />
            ) : (
              <Activity size={18} className="text-amber-400 animate-pulse" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.6))' }} />
            )}
            {/* Neon pulse ring */}
            <span className="absolute -inset-1 rounded-full animate-ping opacity-30"
              style={{
                backgroundColor: dbStatus === 'online'
                  ? 'rgba(16,185,129,0.3)'
                  : dbStatus === 'offline'
                    ? 'rgba(239,68,68,0.3)'
                    : 'rgba(251,191,36,0.3)',
                animation: dbStatus === 'offline' ? 'ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite' : 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
              }}
            />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest"
              style={{
                color: dbStatus === 'online' ? '#34d399' : dbStatus === 'offline' ? '#f87171' : '#fbbf24',
                textShadow: dbStatus === 'online'
                  ? '0 0 10px rgba(16,185,129,0.5)'
                  : dbStatus === 'offline'
                    ? '0 0 10px rgba(239,68,68,0.5)'
                    : '0 0 10px rgba(251,191,36,0.5)',
                animation: dbStatus === 'offline' ? 'flicker 1.2s ease-in-out infinite' : 'none'
              }}
            >
              {dbStatus === 'online' ? 'Supabase Online' : dbStatus === 'offline' ? 'Supabase Offline' : 'Menghubungkan...'}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              Terakhir dicek: {lastCheck.toLocaleTimeString('id-ID')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: dbStatus === 'online' ? '#34d399' : dbStatus === 'offline' ? '#f87171' : '#fbbf24',
              boxShadow: dbStatus === 'online'
                ? '0 0 8px #34d399, 0 0 20px rgba(52,211,153,0.4)'
                : dbStatus === 'offline'
                  ? '0 0 8px #f87171, 0 0 20px rgba(248,113,113,0.4)'
                  : '0 0 8px #fbbf24, 0 0 20px rgba(251,191,36,0.4)',
              animation: dbStatus === 'offline' ? 'blink-red 0.5s ease-in-out infinite' : dbStatus === 'loading' ? 'blink-amber 0.8s ease-in-out infinite' : 'pulse-green 2s ease-in-out infinite'
            }}
          />
          {dbStatus === 'offline' && (
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1"
              style={{
                boxShadow: '0 0 10px rgba(239,68,68,0.3)'
              }}
            >
              <RefreshCw size={12} className={isReconnecting ? 'animate-spin' : ''} />
              {isReconnecting ? 'Menghubungkan...' : 'Hubungkan Ulang'}
            </button>
          )}
        </div>
      </div>

      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Today Revenue */}
        <div className="bg-card border border-border/60 hover:border-border rounded-3xl p-6 transition-all duration-300 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full transition-all group-hover:scale-110"></div>
          <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">Pendapatan Hari Ini</p>
          <h3 className="text-2xl font-black font-poppins mt-2 text-foreground tracking-tight">{rp(metrics.todayRevenue)}</h3>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-2 bg-emerald-500/10 px-2 py-0.5 rounded-lg w-fit">
            <ArrowUpRight size={12} />
            <span>+14.2% vs kemarin</span>
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-card border border-border/60 hover:border-border rounded-3xl p-6 transition-all duration-300 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full transition-all group-hover:scale-110"></div>
          <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">Pesanan Sedang Aktif</p>
          <h3 className="text-2xl font-black font-poppins mt-2 text-foreground tracking-tight">{metrics.activeOrdersCount} <span className="text-xs font-semibold text-muted-foreground">pesanan</span></h3>
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 mt-2 bg-amber-500/10 px-2 py-0.5 rounded-lg w-fit">
            <Clock size={12} />
            <span>Sedang diproses</span>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-card border border-border/60 hover:border-border rounded-3xl p-6 transition-all duration-300 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-bl-full transition-all group-hover:scale-110"></div>
          <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">Jumlah Transaksi (Bill)</p>
          <h3 className="text-2xl font-black font-poppins mt-2 text-foreground tracking-tight">{metrics.totalTransactions} <span className="text-xs font-semibold text-muted-foreground">struk</span></h3>
          <div className="flex items-center gap-1 text-[11px] font-bold text-sky-400 mt-2 bg-sky-500/10 px-2 py-0.5 rounded-lg w-fit">
            <Database size={12} />
            <span>Supabase realtime</span>
          </div>
        </div>

        {/* Average Transaction Value */}
        <div className="bg-card border border-border/60 hover:border-border rounded-3xl p-6 transition-all duration-300 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full transition-all group-hover:scale-110"></div>
          <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">Rata-Rata per Bill</p>
          <h3 className="text-2xl font-black font-poppins mt-2 text-foreground tracking-tight">{rp(metrics.averageBill)}</h3>
          <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 mt-2 bg-rose-500/10 px-2 py-0.5 rounded-lg w-fit">
            <ArrowDownRight size={12} />
            <span>-2.1% vs rata-rata</span>
          </div>
        </div>
      </div>

      {/* ── CHARTS SECTION ── */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        {/* Weekly Revenue Trend Area Chart */}
        <div className="dash-card xl:col-span-2">
          <div className="dash-card-content">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="dash-card-title">Tren Pendapatan Mingguan</h4>
                <p className="dash-card-subtitle">Grafik omset harian dan volume transaksi</p>
              </div>
              <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-xl transition-all bg-white/50 dark:bg-white/5 active:scale-95">
                <Download size={12} /> Ekspor CSV
              </button>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#fff", borderColor: "rgba(0,0,0,0.1)", borderRadius: "16px", color: "#333" }} 
                    formatter={(v: any) => [rp(Number(v)), "Omset"]}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Category Share Donut Pie Chart */}
        <div className="dash-card flex flex-col justify-between">
          <div className="dash-card-content flex flex-col justify-between h-full">
            <div>
              <h4 className="dash-card-title">Menu Terlaris (Kategori)</h4>
              <p className="dash-card-subtitle">Persentase jumlah item terjual per kategori</p>
            </div>
            <div className="h-56 w-full relative flex items-center justify-center my-4">
              {metrics.categoryData.length === 0 ? (
                <div className="text-center text-xs flex flex-col items-center gap-2" style={{ color: 'rgba(87,77,51,0.4)' }}>
                  <PieIcon size={24} className="opacity-20" />
                  <span>Belum ada transaksi hari ini</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {metrics.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#fff", borderColor: "rgba(0,0,0,0.1)", borderRadius: "16px" }}
                      formatter={(v: any) => [`${v} porsi`, "Porsi Terjual"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px] font-bold border-t pt-4" style={{ borderColor: 'rgba(87,77,51,0.1)', color: 'rgba(87,77,51,0.55)' }}>
              {metrics.categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="uppercase">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        {/* Restoran Hourly Traffic Bar Chart */}
        <div className="dash-card xl:col-span-2">
          <div className="dash-card-content">
            <div>
              <h4 className="dash-card-title">Jam Sibuk Restoran (Peak Hours)</h4>
              <p className="dash-card-subtitle">Analisis frekuensi transaksi berdasarkan jam operasional</p>
            </div>
            <div className="h-56 w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.peakHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="hour" stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#fff", borderColor: "rgba(0,0,0,0.1)", borderRadius: "16px" }}
                    formatter={(v: any) => [`${v} Transaksi`, "Volume"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]}>
                    {metrics.peakHours.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.count > 3 ? "hsl(var(--primary))" : "hsl(var(--accent))"} 
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Transactions List Panel */}
        <div className="dash-card flex flex-col justify-between">
          <div className="dash-card-content flex flex-col justify-between h-full">
            <div>
              <h4 className="dash-card-title">Transaksi Terkini</h4>
              <p className="dash-card-subtitle">5 transaksi pembayaran realtime terakhir</p>
            </div>
            <div className="mt-4 flex-1" style={{ borderColor: 'rgba(87,77,51,0.1)' }}>
              {metrics.recentSales.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs" style={{ color: 'rgba(87,77,51,0.4)' }}>
                  Tidak ada riwayat transaksi masuk
                </div>
              ) : (
                metrics.recentSales.map((tx, idx) => (
                  <div key={tx.id || idx} className="py-3 flex items-center justify-between text-xs gap-3" style={{ borderBottom: '1px solid rgba(87,77,51,0.08)' }}>
                    <div className="min-w-0">
                      <p className="font-black uppercase truncate" style={{ color: 'rgba(87,77,51,0.85)' }}>Meja {tx.table}</p>
                      <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'rgba(87,77,51,0.35)' }}>{tx.id}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-emerald-500">{rp(tx.total)}</p>
                      <p className="text-[10px] font-black mt-0.5" style={{ color: 'rgba(87,77,51,0.4)' }}>{tx.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="text-center text-[10px] font-bold pt-4 uppercase tracking-widest" style={{ borderTop: '1px solid rgba(87,77,51,0.1)', color: 'rgba(87,77,51,0.4)' }}>
              Sistem Kasir Terkoneksi Realtime
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
