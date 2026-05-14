import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import QRCode from "react-qr-code";
import {
  Printer, ArrowLeft, Download, QrCode,
  CheckCircle2, UtensilsCrossed, Loader2, ImageDown,
} from "lucide-react";
import html2canvas from "html2canvas";
const logoImg = "/imports/logo_kedai_Elvera57.png";
import { SEED_TABLES } from "../data";
import "../../styles/QRStickerPage.css";

const BASE_URL = "https://psrmenudigital.vercel.app";

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
          </button>

          <div className="flex items-center gap-3 ml-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center gold-icon-wrapper">
              <QrCode size={16} className="text-gold" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Stiker QR Meja</p>
              <p className="text-xs text-gold-dimmed">Kedai Elvera 57 — Cetak & Tempel</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{selectedTables.length} meja dipilih</span>

            {/* Download All */}
            <button
              onClick={downloadAll}
              disabled={downloadingAll || tables.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 btn-gold-outline"
            >
              {downloadingAll
                ? <Loader2 size={14} className="animate-spin" />
                : <ImageDown size={14} />}
              Download Semua
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-black font-bold text-sm transition-all btn-gold-gradient"
            >
              <Printer size={15} /> Cetak Stiker
            </button>
          </div>
        </div>

        <div className="no-print flex gap-6 p-6 max-w-[1500px] mx-auto">

          {/* ── Sidebar settings ── */}
          <div className="w-60 flex-shrink-0 space-y-4">

            {/* Ukuran */}
            <div className="sidebar-box">
              <p className="sidebar-title text-[var(--ps-gold)] opacity-50">Ukuran Stiker</p>
              <div className="space-y-2">
                {(["sm", "md", "lg"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStickerSize(s)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                      stickerSize === s
                        ? 'bg-[var(--ps-gold-faint)] border border-[rgba(200, 169, 110, 0.37)] text-[var(--ps-gold-light)] font-bold'
                        : 'bg-transparent border border-[rgba(255, 255, 255, 0.1)] text-white/25'
                    }`}
                  >
                    <span>{sizeLabels[s]}</span>
                    {stickerSize === s && <CheckCircle2 size={13} className="text-[var(--ps-gold)]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Kolom */}
            <div className="sidebar-box">
              <p className="sidebar-title text-[var(--ps-gold)] opacity-50">Kolom per Baris</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setCols(n)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                      cols === n
                        ? 'bg-gradient-to-br from-[var(--ps-gold)] to-[var(--ps-gold-light)] text-[#0C0C0E]'
                        : 'bg-transparent border border-[rgba(255, 255, 255, 0.1)] text-white/25'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Pilih meja */}
            <div className="sidebar-box">
              <div className="flex items-center justify-between mb-3">
                <p className="sidebar-title text-[var(--ps-gold)] opacity-50 mb-0">Pilih Meja</p>
                <button
                  onClick={() =>
                    selectedTables.length === SEED_TABLES.length
                      ? setSelectedTables([])
                      : setSelectedTables(SEED_TABLES.map(t => t.id))
                  }
                  className="text-[10px] font-semibold transition-colors text-[var(--ps-gold)]"
                >
                  {selectedTables.length === SEED_TABLES.length ? "Hapus Semua" : "Pilih Semua"}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {SEED_TABLES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTable(t.id)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      selectedTables.includes(t.id)
                        ? 'bg-[var(--ps-gold-faint)] border border-[rgba(200, 169, 110, 0.31)] text-[var(--ps-gold)]'
                        : 'bg-transparent border border-[rgba(255, 255, 255, 0.1)] text-white/15'
                    }`}
                  >
                    {t.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl p-4 space-y-2 bg-[var(--ps-gold-faint)] border border-[var(--ps-gold-border)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-[var(--ps-gold)]">💡 Tips Cetak</p>
              {[
                "Kertas glossy A4 — hasil terbaik",
                "Print skala 100%, tanpa scaling",
                "Gunting di sepanjang garis putus",
                "Laminating agar tahan lama",
                "Download PNG untuk cetak offline",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0 bg-[var(--ps-gold)]" />
                  <p className="text-xs text-[var(--ps-gold)] opacity-90 leading-[1.5]">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Preview area ── */}
          <div className="flex-1 min-w-0">
            <div className="preview-box">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-base font-bold text-white">Preview Stiker</p>
                  <p className="text-xs mt-0.5 text-white/25">
                    Garis putus-putus = area potong · Tanda L = crop mark cetak
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 url-badge">
                  <UtensilsCrossed size={11} />
                  <span>{BASE_URL}/menu/[meja]</span>
                </div>
              </div>

              {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <QrCode size={44} className="text-white/5 mb-3" />
                  <p className="text-sm text-white/15">Pilih minimal satu meja</p>
                </div>
              ) : (
                <div
                  className="grid gap-6 justify-start"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, max-content)`,
                  }}
                >
                  {tables.map((t, i) => (
                    <div key={t.id} className="group relative">
                      <StickerWithPrintArea
                        tableId={t.id}
                        index={i}
                        size={stickerSize}
                        wrapperRef={el => { wrapperRefs.current[t.id] = el; }}
                      />
                      {/* Per-sticker download button */}
                      <button
                        onClick={() => downloadSticker(t.id)}
                        disabled={downloading === t.id}
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10 bg-gradient-to-br from-[var(--ps-gold)] to-[var(--ps-gold-light)] text-[#0C0C0E]"
                        title={`Download stiker ${t.id}`}
                      >
                        {downloading === t.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Download size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Print area (hidden on screen, shown on print) ── */}
        <div id="print-area" className="hidden">
          <div
            className="grid gap-5 justify-start p-[8mm] bg-[#F5F5F5]"
            style={{
              gridTemplateColumns: `repeat(${cols}, max-content)`,
            }}
          >
            {tables.map((t, i) => (
              <StickerWithPrintArea key={t.id} tableId={t.id} index={i} size={stickerSize} />
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
