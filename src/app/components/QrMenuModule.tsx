import { useState } from "react";
import { Printer, Download, ExternalLink, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import { GUEST_BASE_URL } from "../pages/AdminPage";
import type { TableData } from "../types";

interface QrMenuModuleProps {
  tables: TableData[];
}

export function QrMenuModule({ tables }: QrMenuModuleProps) {
  const baseUrl = GUEST_BASE_URL;
  const [selectedTable, setSelectedTable] = useState<string>("all");

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

  function handlePrint() {
    const tablesToPrint = selectedTable === "all" ? tables : tables.filter(t => t.id === selectedTable);
    
    const printContent = tablesToPrint.map(t => `
      <div style="page-break-inside:avoid; display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed #C8A96E; border-radius:20px; padding:32px 28px; margin:16px; width:380px; background:#fff;">
        <p style="font-family:Poppins,sans-serif; font-size:20px; font-weight:800; margin:0 0 4px; color:#1F2937; letter-spacing:0.5px;">Buku Menu Digital</p>
        <p style="font-family:Poppins,sans-serif; font-size:12px; font-weight:600; color:#C8A96E; margin:0 0 24px; text-transform:uppercase; letter-spacing:2px;">Kedai Elvera 57</p>
        <div style="background:#fff; padding:16px; border:1px solid #E5E7EB; border-radius:16px; box-shadow:0 4px 12px -2px rgba(0,0,0,0.08);">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${baseUrl}/#/menu/${t.id}`)}" width="220" height="220" />
        </div>
        <img src="https://ugfpbkjuxrdgveyfbfks.supabase.co/storage/v1/object/public/logo/ID_halal.png" style="height:56px; margin:20px 0 4px; object-fit:contain;" crossorigin="anonymous" />
        <p style="font-family:Poppins,sans-serif; font-size:11px; font-weight:600; color:#9CA3AF; margin:0; text-transform:uppercase; letter-spacing:3px;">Nomor Meja</p>
        <p style="font-family:Poppins,sans-serif; font-size:36px; font-weight:900; margin:4px 0 0; color:#1F2937; letter-spacing:1px;">MEJA ${t.id}</p>
        <p style="font-family:Poppins,sans-serif; font-size:10px; color:#9CA3AF; margin-top:12px;">Scan QR untuk pesan menu favorit Anda</p>
      </div>
    `).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>QR Menu - KEDAI ELVERA 57</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
        body { margin:0; display:flex; flex-wrap:wrap; justify-content:center; font-family:Poppins,sans-serif; background:#f3f4f6; }
        @media print { 
          @page { margin: 0; }
          body { margin: 0; background:#fff; }
        }
      </style></head><body>${printContent}
      <script>
        window.onload = () => {
          setTimeout(() => { window.print(); window.close(); }, 500);
        };
      </script></body></html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">Buku Menu Digital</h3>
          <p className="text-muted-foreground text-xs mt-0.5">QR Code untuk setiap meja — tamu scan langsung lihat menu &amp; pesan mandiri</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            title="Pilih meja"
            aria-label="Pilih meja"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary transition-colors"
          >
            <option value="all">Semua Meja</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>Meja {t.id}</option>
            ))}
          </select>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors whitespace-nowrap"
          >
            <Printer size={14} /> {selectedTable === "all" ? "Cetak Semua" : `Cetak Meja ${selectedTable}`}
          </button>
        </div>
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 flex items-start gap-3">
        <QrCode size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Cara kerja:</strong> Cetak QR stiker untuk setiap meja, tempel di meja. Tamu scan QR → buka menu digital → pilih item → pesan langsung ke dapur.</p>
          <p>URL dasar: <code className="bg-secondary border border-border px-1.5 py-0.5 rounded font-mono text-[10px]">{baseUrl}/#/menu/{"{meja}"}</code></p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map(t => {
          const url = `${baseUrl}/#/menu/${t.id}`;
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
