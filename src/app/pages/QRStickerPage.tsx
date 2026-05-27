/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI LOGIKA PRINTING DAN GENERASI QR CODE TAMU.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN STIKER TIDAK BISA DISCAN OLEH TAMU. ⚠️
 */

import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import QRCode from "react-qr-code";
import {
  Printer, ArrowLeft, Download, Grid3X3,
  CheckCircle2, Loader2, Activity,
} from "lucide-react";
import html2canvas from "html2canvas";
import { SEED_TABLES, APP_LOGO as logoImg } from "../data";
import "../../styles/QRStickerPage.css";

const BASE_URL = import.meta.env.VITE_GUEST_BASE_URL || "https://psrmenudigital.vercel.app";

// ─── Sticker Component ────────────────────────────────────────────────────────
function StickerWithPrintArea({ tableId, size, wrapperRef }: { 
  tableId: string; 
  index: number; 
  size: "sm" | "md" | "lg";
  wrapperRef?: (el: HTMLDivElement | null) => void;
}) {
  const url = `${BASE_URL}/menu/${tableId}`;
  const sizeClass = size === "sm" ? "w-[70mm] h-[70mm]" : size === "md" ? "w-[90mm] h-[90mm]" : "w-[110mm] h-[110mm]";

  return (
    <div className="sticker-print-wrap flex items-center justify-center">
      <div 
        ref={wrapperRef}
        className={`${sizeClass} sticker-main-card relative flex flex-col items-center justify-between p-4 overflow-hidden shadow-2xl rounded-[2.5rem] border border-white/5`}
      >
        {/* Background Texture & Glow */}
        <div className="sticker-bg-overlay absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" />
        <div className="sticker-glow absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[80px]" />

        {/* Branding */}
        <div className="z-10 flex flex-col items-center gap-0.5">
          <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
          <h2 className="text-[9px] font-black uppercase tracking-[0.35em] mb-0 text-gold-theme">Kedai Elvera 57</h2>
          <div className="h-[1px] w-6 bg-gold-gradient-fade mt-0.5" />
        </div>

        {/* QR Code Container */}
        <div className="z-10 relative p-3 bg-white rounded-[1.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.4)] group border-[3px] border-[#141418]">
          <div className="absolute -inset-1 rounded-[1.7rem] opacity-20 group-hover:opacity-30 blur-md transition-opacity bg-gold-gradient" />
          <div className="bg-white p-1.5 rounded-xl relative">
            <QRCode value={url} size={110} level="H" fgColor="#0C0C0E" bgColor="#FFFFFF" />
          </div>
        </div>

        {/* Halal ID + Table Number — compact section */}
        <div className="z-10 flex flex-col items-center gap-1">
          <img 
            src="/ID_halal.png" 
            alt="Halal Indonesia" 
            className="h-5 w-auto object-contain drop-shadow-[0_2px_6px_rgba(200,169,110,0.25)]"
            crossOrigin="anonymous"
          />
          <div className="px-4 py-1 rounded-full border border-white/10 flex flex-col items-center shadow-inner bg-white/5 backdrop-blur-md">
            <span className="text-[7px] uppercase tracking-[0.3em] opacity-40 font-bold text-white">Nomor Meja</span>
            <span className="text-xl font-black leading-none text-gold-theme">{tableId}</span>
          </div>
        </div>

        {/* Footer Text */}
        <div className="z-10 flex items-center gap-2 w-full px-3">
          <div className="h-[1px] flex-1 opacity-20 bg-fade-right" />
          <span className="text-[6px] uppercase tracking-[0.15em] font-black opacity-30 whitespace-nowrap text-white">Scan Untuk Pesan Menu Digital</span>
          <div className="h-[1px] flex-1 opacity-20 bg-fade-left" />
        </div>

        {/* Corner Accents */}
        <div className="absolute top-6 right-6 w-1.5 h-1.5 rounded-full opacity-20 bg-gold-theme" />
        <div className="absolute bottom-6 left-6 w-1.5 h-1.5 rounded-full opacity-20 bg-gold-theme" />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function QRStickerPage() {
  const navigate = useNavigate();
  const [stickerSize, setStickerSize] = useState<"sm" | "md" | "lg">("md");
  const [selectedTableId, setSelectedTableId] = useState<string>(SEED_TABLES[0].id);
  const [downloading, setDownloading] = useState<string | null>(null);

  const wrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function handlePrint() { window.print(); }

  const downloadSticker = useCallback(async (tableId: string) => {
    const el = wrapperRefs.current[tableId];
    if (!el) return;
    setDownloading(tableId);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: "#0C0C0E",
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `stiker-qr-meja-${tableId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Download error:", e);
    }
    setDownloading(null);
  }, []);

  const sizeLabels = { sm: "Kecil (7cm)", md: "Sedang (9cm)", lg: "Besar (11cm)" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

        /* Theme Classes to avoid inline styles */
        .sticker-main-card { background-color: #0C0C0E; }
        .sticker-bg-overlay { background-image: radial-gradient(#C8A96E 0.5px, transparent 0.5px); background-size: 12px 12px; }
        .sticker-glow { background: radial-gradient(circle, rgba(200, 169, 110, 0.09) 0%, transparent 70%); }
        .text-gold-theme { color: #C8A96E; }
        .bg-gold-theme { background-color: #C8A96E; }
        .bg-gold-gradient { background: linear-gradient(45deg, #C8A96E, #E2C98A); }
        .bg-gold-gradient-fade { background: linear-gradient(90deg, transparent, #C8A96E, transparent); opacity: 0.4; }
        .bg-fade-right { background: linear-gradient(to right, transparent, #FFFFFF); }
        .bg-fade-left { background: linear-gradient(to left, transparent, #FFFFFF); }

        @page {
          size: auto;
          margin: 0mm;
        }

        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 9999999 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-background">

        {/* ── Top bar ── */}
        <div className="no-print sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Kembali
          </button>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-gold-dimmed font-bold">Siap Cetak</span>
              <span className="text-sm font-black text-white">Meja {selectedTableId}</span>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-black font-bold text-sm transition-all btn-gold-gradient shadow-[0_0_20px_rgba(200,169,110,0.3)] hover:scale-105 active:scale-95"
            >
              <Printer size={15} /> Cetak Stiker
            </button>
          </div>
        </div>

        <div className="no-print flex gap-8 p-8 max-w-[1200px] mx-auto">

          {/* ── Sidebar settings ── */}
          <div className="w-72 flex-shrink-0 space-y-6">

            {/* Dropdown Pilih Meja */}
            <div className="sidebar-box">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-gold rounded-full" />
                <p className="sidebar-title text-[var(--ps-gold)] mb-0">Pilih Meja</p>
              </div>
              
              <div className="relative group">
                <select 
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  title="Pilih nomor meja untuk dicetak"
                  aria-label="Pilih nomor meja"
                  className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm appearance-none focus:outline-none focus:border-gold/50 transition-all cursor-pointer"
                >
                  {SEED_TABLES.map(t => (
                    <option key={t.id} value={t.id} className="bg-[#1A1A1E]">
                      Meja {t.id} ({t.seat} Kursi)
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 group-hover:text-gold transition-colors">
                  <Grid3X3 size={14} />
                </div>
              </div>
              <p className="text-[10px] text-white/30 mt-3 italic">
                *Pilih nomor meja untuk memperbarui tampilan QR di sebelah kanan.
              </p>
            </div>

            {/* Ukuran */}
            <div className="sidebar-box">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-gold rounded-full" />
                <p className="sidebar-title text-[var(--ps-gold)] mb-0">Ukuran Cetak</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {(["sm", "md", "lg"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStickerSize(s)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                      stickerSize === s
                        ? 'bg-[var(--ps-gold-faint)] border border-gold/40 text-[var(--ps-gold-light)] font-bold shadow-[inset_0_0_20px_rgba(200,169,110,0.1)]'
                        : 'bg-transparent border border-white/5 text-white/25 hover:border-white/10'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-xs uppercase tracking-wider">{s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}</span>
                      <span className="text-[10px] opacity-60 font-medium">{sizeLabels[s]}</span>
                    </div>
                    {stickerSize === s && <CheckCircle2 size={14} className="text-gold" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl p-5 space-y-3 bg-[var(--ps-gold-faint)] border border-[var(--ps-gold-border)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Printer size={40} className="text-gold" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold mb-1">💡 Tips Produksi</p>
              {[
                "Gunakan Kertas Sticker Glossy (A4)",
                "Skala Print 100% (No Scaling)",
                "Laminasi Dingin agar anti-air",
                "Gunting presisi di garis potong",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0 bg-gold" />
                  <p className="text-[11px] text-gold/90 font-medium leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Preview area ── */}
          <div className="flex-1 min-w-0">
            <div className="preview-box">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-white font-['Poppins']">Preview Stiker Meja {selectedTableId}</h3>
                  <p className="text-[11px] mt-1 text-white/40 flex items-center gap-2">
                    <Activity size={10} className="text-gold" /> Tampilan di bawah adalah hasil akhir yang akan dicetak
                  </p>
                </div>
                
                <button
                  onClick={() => downloadSticker(selectedTableId)}
                  disabled={downloading === selectedTableId}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  {downloading === selectedTableId ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Simpan Gambar
                </button>
              </div>

              <div className="flex justify-center items-center py-10 bg-[#0C0C0E]/50 rounded-2xl border border-white/5">
                <div className="relative group">
                  <StickerWithPrintArea
                    tableId={selectedTableId}
                    index={0}
                    size={stickerSize}
                    wrapperRef={el => { wrapperRefs.current[selectedTableId] = el; }}
                  />
                  {/* Floating ID badge */}
                  <div className="absolute -top-3 -left-3 bg-gold text-[#0C0C0E] text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                    READY TO PRINT
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Print area (hanya merender meja yang dipilih) ── */}
        <div id="print-area" className="hidden">
          <div className="w-full h-full flex justify-center items-center bg-white">
            <StickerWithPrintArea tableId={selectedTableId} index={0} size={stickerSize} />
          </div>
        </div>
      </div>
    </>
  );
}
