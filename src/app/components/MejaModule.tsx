import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode, Printer, Users, XCircle, RefreshCw, Copy, ExternalLink
} from "lucide-react";
import QRCode from "react-qr-code";
import { rp } from "../data";
import { GUEST_BASE_URL, tableStatusConfig } from "../pages/AdminPage";
import type { TableData } from "../types";

interface MejaModuleProps {
  tables: TableData[];
  onUpdateStatus: (id: string, status: TableData["status"]) => Promise<void>;
}

export function MejaModule({ tables, onUpdateStatus }: MejaModuleProps) {
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
