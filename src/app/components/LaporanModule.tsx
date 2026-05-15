import { useState } from "react";
import { ArrowUpRight, Database, Printer, ExternalLink, RefreshCw } from "lucide-react";
import { rp, BEST_SELLER_DATA, PAYMENT_DATA } from "../data";
import { printService } from "../../utils/printService";
import { ClosingReceipt } from "./ReceiptTemplates";
import { toast } from "sonner";
import type { Transaction } from "../types";

interface LaporanModuleProps {
  transactions: Transaction[];
}

function WeeklySalesChart({ data }: { data: { day: string; sales: number }[] }) {
  const W = 600, H = 160, pl = 68, pr = 8, pt = 8, pb = 24;
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

export function LaporanModule({ transactions }: LaporanModuleProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printType, setPrintType] = useState<'pdf' | null>(null);

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

  // Calculate closing data
  const closingData = {
    date: new Date().toLocaleDateString("id-ID"),
    penjualanBersih: transactions.reduce((s, tx) => s + tx.subtotal, 0) || 37942000,
    pb1: transactions.reduce((s, tx) => s + tx.tax, 0) || 3794200,
    qris: transactions.filter(tx => tx.method === "QRIS").reduce((s, tx) => s + tx.total, 0) || 15000000,
    tunai: transactions.filter(tx => tx.method === "Tunai").reduce((s, tx) => s + tx.total, 0) || 12000000,
    kartu: transactions.filter(tx => tx.method === "Debit").reduce((s, tx) => s + tx.total, 0) || 10942000,
    totalTransaksi: txCount || 377,
    totalItem: transactions.reduce((s, tx) => s + tx.items.reduce((si, item) => si + item.qty, 0), 0) || 500,
    hpp: 0,
    labaKotor: 0
  };
  closingData.hpp = Math.round(closingData.penjualanBersih * 0.4); // Mock HPP 40%
  closingData.labaKotor = closingData.penjualanBersih - closingData.hpp;

  async function handleDirectConnect() {
    toast.info("Mencoba koneksi langsung ke RPP02N...");
    try {
      const success = await printService.connect("06:2B:E0:4C:71:DF");
      if (success) {
        toast.success("Berhasil terhubung ke RPP02N!");
      } else {
        toast.error("Gagal terhubung ke RPP02N.");
      }
    } catch (error) {
      toast.error("Error koneksi: " + (error as Error).message);
    }
  }

  async function handlePrintThermal() {
    alert("Fungsi Cetak Dimulai");
    setIsPrinting(true);
    try {
      alert("Mengirim data ke printService...");
      await printService.printClosingReceipt(closingData);
      toast.success("Laporan closing berhasil dicetak");
    } catch (error) {
      alert("Error tertangkap: " + (error as Error).message);
      toast.error("Gagal mencetak: " + (error as Error).message);
    } finally {
      setIsPrinting(false);
    }
  }

  function handlePrintPDF() {
    setPrintType('pdf');
    setTimeout(() => {
      window.print();
      setPrintType(null);
    }, 100);
  }

  return (
    <div className="space-y-4">
      {/* Header Buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleDirectConnect}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-all shadow-sm"
        >
          <RefreshCw size={12} />
          Konek RPP02N
        </button>
        <button
          onClick={handlePrintThermal}
          disabled={isPrinting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-[10px] font-bold text-foreground hover:bg-secondary/80 transition-all disabled:opacity-50 shadow-sm"
        >
          {isPrinting ? <RefreshCw size={12} className="animate-spin" /> : <Printer size={12} />}
          Closing (Thermal)
        </button>
        <button
          onClick={handlePrintPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-[10px] font-bold text-foreground hover:bg-secondary/80 transition-all shadow-sm"
        >
          <ExternalLink size={12} />
          Closing (PDF)
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Penjualan Minggu Ini", val: rp(weekTotal || 37942000), trend: "+18.3%", accent: "text-primary" },
          { label: "Total Transaksi", val: String(txCount || 377), trend: "+22 tx", accent: "text-foreground" },
          { label: "Avg. per Transaksi", val: rp(avgTx), trend: null, accent: "text-foreground" },
        ].map(m => (
          <div key={m.label} className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
            <p className="text-muted-foreground text-[9px] font-black uppercase tracking-[0.15em] mb-1">{m.label}</p>
            <p className={`font-black text-lg leading-tight font-['Poppins'] truncate ${m.accent}`} title={m.val}>{m.val}</p>
            {m.trend && <p className="text-green-500 text-[10px] font-bold mt-1 flex items-center gap-1"><ArrowUpRight size={10} /> {m.trend}</p>}
          </div>
        ))}
      </div>
      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-foreground/80">Penjualan 7 Hari Terakhir</h3>
          {hasRealData && <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1"><Database size={10} className="text-indigo-400" /> REALTIME</span>}
        </div>
        <WeeklySalesChart data={displayData} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-card border border-border/60 rounded-xl p-4">
          <h3 className="font-black text-xs uppercase tracking-widest mb-3 text-foreground/80">Produk Terlaris</h3>
          <div className="space-y-1.5">
            {BEST_SELLER_DATA.map((d, i) => (
              <div key={d.name} className="flex items-center gap-3 text-[11px] font-semibold py-1 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground w-4">{i + 1}.</span>
                <span className="flex-1 text-foreground truncate">{d.name}</span>
                <span className="font-black text-primary">{d.qty}x</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-4">
          <h3 className="font-black text-xs uppercase tracking-widest mb-3 text-foreground/80">Metode Pembayaran</h3>
          <div className="space-y-2">
            {PAYMENT_DATA.map(d => {
              const bgClass = d.color === "#6366F1" ? "bg-indigo-500" : d.color === "#22C55E" ? "bg-green-500" : d.color === "#F59E0B" ? "bg-amber-500" : "bg-pink-500";
              const textClass = d.color === "#6366F1" ? "text-indigo-500" : d.color === "#22C55E" ? "text-green-500" : d.color === "#F59E0B" ? "text-amber-500" : "text-pink-500";
              return (
                <div key={d.name} className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${bgClass}`} />
                    <span className="text-muted-foreground uppercase tracking-tight">{d.name}</span>
                  </div>
                  <span className={`font-black ${textClass}`}>{d.value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Render Closing Receipt untuk Print Browser (PDF) */}
      {printType === 'pdf' && (
        <div className="receipt-print-wrapper">
          <ClosingReceipt data={closingData} />
        </div>
      )}
    </div>
  );
}
