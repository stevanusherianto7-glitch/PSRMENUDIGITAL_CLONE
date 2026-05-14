import { Printer, Download, ExternalLink, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import { GUEST_BASE_URL } from "../pages/AdminPage";
import type { TableData } from "../types";

interface QrMenuModuleProps {
  tables: TableData[];
}

export function QrMenuModule({ tables }: QrMenuModuleProps) {
  const baseUrl = GUEST_BASE_URL;

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

  function handlePrintAll() {
    const printContent = tables.map(t => `
      <div style="page-break-inside:avoid; display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed #ccc; border-radius:16px; padding:24px; margin:12px; width:280px; height:320px;">
        <p style="font-family:Poppins,sans-serif; font-size:20px; font-weight:700; margin:0 0 4px; color:#1F2937;">Buku Menu Digital</p>
        <p style="font-family:Poppins,sans-serif; font-size:14px; font-weight:600; color:#6B7280; margin:0 0 16px;">Kedai Elvera 57</p>
        <div style="background:#fff; padding:8px; border-radius:8px;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${baseUrl}/menu/${t.id}`)}" width="180" height="180" />
        </div>
        <p style="font-family:Poppins,sans-serif; font-size:24px; font-weight:700; margin:16px 0 0; color:#1F2937;">Meja ${t.id}</p>
      </div>
    `).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>QR Menu - Kedai Elvera 57</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        body { margin:0; display:flex; flex-wrap:wrap; justify-content:center; font-family:Poppins,sans-serif; }
        @media print { 
          @page { margin: 0; }
          body { margin: 1cm; }
        }
      </style></head><body>${printContent}
      <script>
        window.onload = () => {
          setTimeout(() => window.print(), 500);
        };
      </script></body></html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Buku Menu Digital</h3>
          <p className="text-muted-foreground text-xs mt-0.5">QR Code untuk setiap meja — tamu scan langsung lihat menu &amp; pesan mandiri</p>
        </div>
        <button
          onClick={handlePrintAll}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"
        >
          <Printer size={14} /> Cetak Semua Stiker
        </button>
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 flex items-start gap-3">
        <QrCode size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Cara kerja:</strong> Cetak QR stiker untuk setiap meja, tempel di meja. Tamu scan QR → buka menu digital → pilih item → pesan langsung ke dapur.</p>
          <p>URL dasar: <code className="bg-secondary border border-border px-1.5 py-0.5 rounded font-mono text-[10px]">{baseUrl}/menu/{"{meja}"}</code></p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map(t => {
          const url = `${baseUrl}/menu/${t.id}`;
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
