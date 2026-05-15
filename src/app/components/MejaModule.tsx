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
          const labels = { available: "Kosong", occupied: "Terisi", service: "Layanan", reserved: "Reservasi" };
          return (
            <div key={s} className={`rounded-xl p-3 border ${cfg.bg} ${cfg.border} flex flex-col items-center justify-center gap-0.5 transition-all duration-300 hover:scale-[1.02] hover:shadow-md group shadow-sm`}>
              <span className={`text-2xl font-black ${cfg.color} font-['Poppins'] transition-transform duration-300 group-hover:scale-110`}>{count}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80">{labels[s]}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 bg-secondary/30 border border-border/60 rounded-xl">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground leading-tight">
          <QrCode size={14} className="text-primary" />
          <span>Klik tombol QR di kartu meja untuk generate QR Code scan-order tamu secara mandiri.</span>
        </div>
        <button
          onClick={() => navigate("/qr-stickers")}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
        >
          <Printer size={12} /> Cetak Semua Stiker QR
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-max">
          {tables.map(t => {
            const cfg = tableStatusConfig[t.status];
            const isSelected = selected?.id === t.id;
            return (
              <div key={t.id} className={`rounded-[2rem] border p-4 transition-all duration-300 hover:shadow-xl ${cfg.bg} ${cfg.border} ${isSelected ? `ring-2 ring-primary shadow-lg scale-[1.02]` : "hover:border-primary/20 bg-card"}`}>
                <button
                  onClick={() => setSelected(isSelected ? null : t)}
                  className="w-full flex flex-col items-center text-center gap-3"
                >
                  <span className="font-black text-3xl font-['Poppins'] text-foreground leading-none">{t.id}</span>

                  <div className="flex flex-col items-center gap-2 w-full">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${cfg.bg} ${cfg.color} border ${cfg.border} shadow-sm w-full text-center`}>
                      {cfg.label}
                    </span>

                    <button
                      onClick={(e) => { e.stopPropagation(); setQrTable(t.id); }}
                      className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-muted-foreground hover:text-primary hover:border-primary/30 bg-secondary/50 border border-border/60 rounded-xl py-2 transition-all uppercase tracking-wider"
                    >
                      <QrCode size={12} /> QR Code
                    </button>

                    <div className="flex flex-col items-center gap-0.5 mt-1">
                      <p className="text-[10px] font-black text-muted-foreground/60 flex items-center gap-1.5 uppercase tracking-tighter">
                        <Users size={12} className="opacity-40" /> {t.seat} KURSI
                      </p>
                      {t.total && <p className={`text-sm font-black mt-1 ${cfg.color} drop-shadow-sm`}>{rp(t.total)}</p>}
                    </div>
                  </div>
                </button>
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
