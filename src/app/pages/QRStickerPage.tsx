import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import QRCode from "react-qr-code";
import {
  Printer, ArrowLeft, Download, QrCode,
  CheckCircle2, UtensilsCrossed, Loader2, ImageDown,
} from "lucide-react";
import html2canvas from "html2canvas";
const logoImg = "/imports/logo_pawon_salam.png";
import { SEED_TABLES } from "../data";
import "../../styles/QRStickerPage.css";

const BASE_URL = import.meta.env.VITE_GUEST_BASE_URL || "https://psrmenudigital.vercel.app";

// ─── Palette (sama untuk semua stiker — luxury monochrome + gold) ─────────────
const PALETTE = {
  bg:        "#0C0C0E",
  surface:   "#141418",
  gold:      "#C8A96E",
  goldLight: "#E2C98A",
  goldFaint: "#C8A96E18",
  goldBorder:"#C8A96E35",
  white:     "#FFFFFF",
  muted:     "#FFFFFF30",
  dimmed:    "#FFFFFF15",
};

// ─── Print area wrapper: crop-marks + sticker ────────────────────────────────
interface StickerWrapperProps {
  tableId: string;
  index: number;
  size: "sm" | "md" | "lg";
  wrapperRef?: (el: HTMLDivElement | null) => void;
}

const SIZES = {
  sm: { card: 230, qr: 88,  pad: 18, h1: 11.5, h2: 8.5, tableFs: 52, labelFs: 7,  bleed: 14, mark: 10 },
  md: { card: 270, qr: 108, pad: 22, h1: 13,   h2: 9.5, tableFs: 62, labelFs: 7.5,bleed: 16, mark: 12 },
  lg: { card: 320, qr: 130, pad: 26, h1: 15,   h2: 11,  tableFs: 76, labelFs: 8.5,bleed: 18, mark: 14 },
};



function StickerWithPrintArea({ tableId, index, size, wrapperRef }: StickerWrapperProps) {
  return (
    <div
      ref={wrapperRef}
      className={`sticker-print-wrap size-${size}`}
    >
      {/* ── Crop marks at 4 corners ── */}
      {/* Top-left */}
      <div className="corner-box top-0 left-0">
        <div className="corner-line-h left-0" />
        <div className="corner-line-v top-0" />
      </div>
      {/* Top-right */}
      <div className="corner-box top-0 right-0">
        <div className="corner-line-h right-0" />
        <div className="corner-line-v top-0" />
      </div>
      {/* Bottom-left */}
      <div className="corner-box bottom-0 left-0">
        <div className="corner-line-h left-0" />
        <div className="corner-line-v bottom-0" />
      </div>
      {/* Bottom-right */}
      <div className="corner-box bottom-0 right-0">
        <div className="corner-line-h right-0" />
        <div className="corner-line-v bottom-0" />
      </div>

      {/* ── Bleed border indicator (dashed) ── */}
      <div className="bleed-border" />

      {/* ── The sticker itself ── */}
      <div className="relative z-10">
        <StickerCard tableId={tableId} size={size} />
      </div>

      {/* ── Size label (tiny, for reference) ── */}
      <div className="size-label">
        {tableId} · cut here
      </div>
    </div>
  );
}

// ─── The actual sticker card ──────────────────────────────────────────────────
function StickerCard({ tableId, size }: { tableId: string; size: "sm" | "md" | "lg" }) {
  const d = SIZES[size];
  const url = `${BASE_URL}/menu/${tableId}`;
  const P = PALETTE;

  return (
    <div className={`sticker-card size-${size}`}>
      {/* ── Top gold accent bar ── */}
      <div className="top-gold-bar" />

      {/* ── Subtle background texture lines ── */}
      <div className="bg-texture" />

      <div className="sticker-content">

        {/* ── HEADER ── */}
        <div className="flex items-center gap-[9px] mb-[14px]">
          <div className="header-logo-wrap">
            <img src={logoImg} alt="logo" className="header-logo" />
          </div>
          <div className="flex-1 min-width-0">
            <div className="header-title">
              Buku Menu Digital
            </div>
            <div className="header-subtitle">
              Kedai Elvera 57
            </div>
          </div>
        </div>

        {/* ── Gold divider ── */}
        <div className="gold-divider" />

        {/* ── QR code area ── */}
        <div className="flex justify-center mb-4">
          <div className="qr-frame">
            {/* Corner accents on QR frame */}
            {[
              "qr-corner-tl",
              "qr-corner-tr",
              "qr-corner-bl",
              "qr-corner-br",
            ].map((cls, i) => (
              <div key={i} className={`qr-corner-accent ${cls}`} />
            ))}
            <QRCode
              value={url}
              size={d.qr}
              bgColor="#FFFFFF"
              fgColor="#0C0C0E"
              level="H"
              style={{ display: "block" }}
            />
          </div>
        </div>

        {/* ── Table number ── */}
        <div className="text-center mb-[14px]">
          <div className="table-number">
            {tableId}
          </div>
        </div>

        {/* ── Gold divider ── */}
        <div className="gold-divider-bottom" />

        {/* ── Scan instruction ── */}
        <div className="text-center">
          <div className="scan-instruction-badge">
            <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5">
              <rect width="5" height="5" x="3" y="3" rx="1"/>
              <rect width="5" height="5" x="16" y="3" rx="1"/>
              <rect width="5" height="5" x="3" y="16" rx="1"/>
              <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
              <path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
              <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/>
              <path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
            </svg>
            <span className="scan-instruction-text">
              Scan untuk Memesan
            </span>
          </div>
          <div className="scan-instruction-sub text-[var(--ps-muted)]">
            Arahkan kamera HP ke QR code di atas
          </div>
        </div>

        {/* ── Bottom micro footer ── */}
        <div className="micro-footer">
          <div className="micro-footer-line" />
          <span className="uppercase">Pesan · Bayar · Selesai</span>
          <div className="micro-footer-line" />
        </div>
      </div>

      {/* ── Bottom gold accent bar ── */}
      <div className="top-gold-bar" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function QRStickerPage() {
  const navigate = useNavigate();
  const [stickerSize, setStickerSize] = useState<"sm" | "md" | "lg">("md");
  const [selectedTables, setSelectedTables] = useState<string[]>(SEED_TABLES.map(t => t.id));
  const [cols, setCols] = useState(3);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Store refs for each sticker wrapper
  const wrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const tables = SEED_TABLES.filter(t => selectedTables.includes(t.id));

  function handlePrint() { window.print(); }
  function toggleTable(id: string) {
    setSelectedTables(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const downloadSticker = useCallback(async (tableId: string) => {
    const el = wrapperRefs.current[tableId];
    if (!el) return;
    setDownloading(tableId);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: "#F5F5F5",
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

  const downloadAll = useCallback(async () => {
    setDownloadingAll(true);
    for (const t of tables) {
      const el = wrapperRefs.current[t.id];
      if (!el) continue;
      try {
        const canvas = await html2canvas(el, {
          scale: 3,
          backgroundColor: "#F5F5F5",
          useCORS: true,
          logging: false,
        });
        const link = document.createElement("a");
        link.download = `stiker-qr-meja-${t.id}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        await new Promise(r => setTimeout(r, 300)); // slight delay between downloads
      } catch (e) {
        console.error("Download error:", e);
      }
    }
    setDownloadingAll(false);
  }, [tables]);

  const sizeLabels = { sm: "Kecil (7cm)", md: "Sedang (9cm)", lg: "Besar (11cm)" };

  return (
    <>
      {/* ── Fonts + Print styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important;
            padding: 8mm !important;
            background: #F5F5F5 !important;
          }
          .sticker-print-wrap {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-background">

        {/* ── Top bar ── */}
        <div className="no-print sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Kembali
                    <div className="ml-auto flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-gold-dimmed font-bold">Siap Cetak</span>
              <span className="text-sm font-black text-white">Meja {selectedTableId}</span>
            </div>

            {/* Print */}
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
          <div className="p-[10mm] flex justify-center items-center bg-white min-h-screen">
            <StickerWithPrintArea tableId={selectedTableId} index={0} size={stickerSize} />
          </div>
        </div>
      </div>
    </>
  );
}
