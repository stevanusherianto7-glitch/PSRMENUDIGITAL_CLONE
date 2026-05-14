import { Plus } from "lucide-react";
import { rp } from "../data";

export function PettyCashModule() {
  const dummyLogs = [
    { id: 1, date: "13 Mei 2026, 10:00", description: "Modal awal laci kasir", type: "in", amount: 500000 },
    { id: 2, date: "13 Mei 2026, 14:30", description: "Beli es batu kristal", type: "out", amount: 15000 },
    { id: 3, date: "13 Mei 2026, 16:00", description: "Bayar parkir kurir", type: "out", amount: 2000 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Petty Cash (Kas Kecil)</h3>
          <p className="text-muted-foreground text-xs mt-0.5">Catat uang masuk dan keluar kecil untuk operasional</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors">
          <Plus size={14} /> Catat Transaksi
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase mb-1">Saldo Saat Ini</p>
          <p className="font-bold text-xl text-foreground font-['Poppins']">{rp(483000)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase mb-1">Total Masuk</p>
          <p className="font-bold text-xl text-green-400 font-['Poppins']">{rp(500000)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase mb-1">Total Keluar</p>
          <p className="font-bold text-xl text-red-400 font-['Poppins']">{rp(17000)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left text-muted-foreground p-4 font-medium">Tanggal</th>
              <th className="text-left text-muted-foreground p-4 font-medium">Keterangan</th>
              <th className="text-right text-muted-foreground p-4 font-medium">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {dummyLogs.map(log => (
              <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="p-4 font-mono text-muted-foreground">{log.date}</td>
                <td className="p-4 font-semibold text-foreground">{log.description}</td>
                <td className={`p-4 text-right font-bold ${log.type === "in" ? "text-green-400" : "text-red-400"}`}>
                  {log.type === "in" ? "+" : "-"}{rp(log.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground">Fitur Petty Cash ini dalam tahap pengembangan visual. Integrasi database akan dilakukan pada tahap berikutnya.</p>
      </div>
    </div>
  );
}
