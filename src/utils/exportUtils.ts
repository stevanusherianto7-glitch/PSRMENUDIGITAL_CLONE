import { ShiftType, Employee } from '../app/types';

/**
 * Helper untuk melakukan print menggunakan Hidden Iframe.
 * Lebih stabil di Android WebView/Capacitor daripada window.open.
 */
function printContent(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    // Beri waktu browser memuat font/style sebelum print dialog muncul
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      // Hapus iframe setelah dialog print tertutup (atau dibatalkan)
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 800);
  }
}

export function exportMonthlyPDF(
  currentDate: Date,
  dates: string[],
  employees: Employee[],
  shifts: Record<string, Record<string, ShiftType>>
) {
  const monthYearStr = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Jadwal Shift - ${monthYearStr}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 30px; color: #2A1F18; background-color: #FFFBF3; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #E87722; padding-bottom: 15px; }
        h1 { color: #E87722; font-size: 28px; margin-bottom: 5px; font-weight: 800; }
        p.subtitle { color: #7A6A57; font-size: 14px; margin-top: 0; text-transform: uppercase; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        th, td { border: 1px solid #E8E3D3; padding: 10px; text-align: center; }
        th { background-color: #2A1F18; color: #F7F1E6; font-weight: 800; text-transform: uppercase; }
        th.emp-col, td.emp-col { text-align: left; font-weight: 800; background-color: #FFFBF3; position: sticky; left: 0; }
        .shift-P { background-color: #E0F2FE; color: #0369A1; font-weight: 800; border-radius: 4px; }
        .shift-M { background-color: #D1FAE5; color: #047857; font-weight: 800; border-radius: 4px; }
        .shift-O { background-color: #FEE2E2; color: #B91C1C; font-weight: 800; border-radius: 4px; }
        .legend { display: flex; justify-content: center; gap: 20px; font-size: 12px; margin-top: 20px; }
        .legend-item { display: flex; items-center; gap: 5px; }
        .legend-box { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; }
        @media print {
          body { padding: 0; background-color: #fff; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>JADWAL SHIFT Kedai Elvera 57</h1>
        <p class="subtitle">Periode: ${monthYearStr}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th class="emp-col">Nama Karyawan</th>
            ${dates.map(d => `<th>${d.slice(8, 10)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${employees.map(emp => `
            <tr>
              <td class="emp-col">${emp.name}<br><small style="color:#7A6A57;font-weight:400;">${emp.role}</small></td>
              ${dates.map(dateStr => {
                const type = shifts[emp.id]?.[dateStr];
                const label = type === ShiftType.PAGI ? 'P' : type === ShiftType.MIDDLE ? 'M' : 'O';
                return `<td class="shift-${label}">${label}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="legend">
        <div class="legend-item">
          <div class="legend-box shift-P">P</div>
          <span>Shift Pagi</span>
        </div>
        <div class="legend-item">
          <div class="legend-box shift-M">M</div>
          <span>Shift Middle</span>
        </div>
        <div class="legend-item">
          <div class="legend-box shift-O">O</div>
          <span>Libur</span>
        </div>
      </div>
    </body>
    </html>
  `;

  printContent(html);
}

export function exportCategorySalesReport(
  categoryData: { name: string; value: number; amount: number }[],
  totalSales: number
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan Penjualan Per Kategori - Kedai Elvera 57</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1A1A1E; background-color: #fff; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #C8A96E; padding-bottom: 20px; }
        h1 { color: #C8A96E; font-size: 28px; margin: 0; font-weight: 900; }
        p.subtitle { color: #666; font-size: 14px; margin: 5px 0 0 0; font-weight: 600; text-transform: uppercase; }
        
        .summary-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: #F9F9FB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; text-align: center; }
        .summary-label { font-size: 10px; color: #6B7280; font-weight: 800; text-transform: uppercase; margin-bottom: 5px; }
        .summary-value { font-size: 20px; font-weight: 900; color: #1A1A1E; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { background: #1A1A1E; color: #fff; padding: 12px; text-align: left; font-size: 12px; font-weight: 800; }
        td { padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151; }
        tr:last-child td { border-bottom: 2px solid #1A1A1E; }
        .font-bold { font-weight: 800; }
        
        .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
        .info { font-size: 10px; color: #9CA3AF; }
        .sig-box { width: 200px; text-align: center; }
        .sig-line { border-bottom: 1px solid #1A1A1E; height: 80px; margin-bottom: 10px; }
        
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Kedai Elvera 57</h1>
        <p class="subtitle">Laporan Penjualan Per Kategori</p>
        <p style="font-size: 11px; margin-top: 5px;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <p class="summary-label">Total Omzet</p>
          <p class="summary-value">Rp ${totalSales.toLocaleString('id-ID')}</p>
        </div>
        <div class="summary-card">
          <p class="summary-label">Kategori Terlaris</p>
          <p class="summary-value">${categoryData.reduce((prev, current) => (prev.amount > current.amount) ? prev : current).name}</p>
        </div>
        <div class="summary-card">
          <p class="summary-label">Total Kategori</p>
          <p class="summary-value">${categoryData.length}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th style="text-align: center">Persentase</th>
            <th style="text-align: right">Total Penjualan (IDR)</th>
          </tr>
        </thead>
        <tbody>
          ${categoryData.map(d => `
            <tr>
              <td class="font-bold">${d.name.toUpperCase()}</td>
              <td style="text-align: center">${d.value}%</td>
              <td style="text-align: right" class="font-bold">${d.amount.toLocaleString('id-ID')}</td>
            </tr>
          `).join('')}
          <tr style="background: #F9F9FB">
            <td colspan="2" class="font-bold" style="text-align: right">TOTAL</td>
            <td style="text-align: right" class="font-bold">Rp ${totalSales.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <div class="info">
          * Laporan ini dihasilkan secara otomatis oleh Kedai Elvera 57 POS.<br>
          * Data bersifat rahasia dan hanya untuk keperluan internal.
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <p style="font-weight: 800; font-size: 13px; margin: 5px 0 0 0;">Owner / Manager</p>
        </div>
      </div>
    </body>
    </html>
  `;

  printContent(html);
}

export function exportWeeklyPDF(
  effectiveDate: string | undefined,
  employees: Employee[],
  patterns: Record<string, ShiftType[]>
) {
  const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
  const dateStr = effectiveDate ? new Date(effectiveDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "Segera";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pola Mingguan Jadwal Shift</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 30px; color: #2A1F18; background-color: #FFFBF3; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #E87722; padding-bottom: 15px; }
        h1 { color: #E87722; font-size: 28px; margin-bottom: 5px; font-weight: 800; }
        p.subtitle { color: #7A6A57; font-size: 14px; margin-top: 0; text-transform: uppercase; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        th, td { border: 1px solid #E8E3D3; padding: 12px; text-align: center; }
        th { background-color: #2A1F18; color: #F7F1E6; font-weight: 800; text-transform: uppercase; }
        th.emp-col, td.emp-col { text-align: left; font-weight: 800; background-color: #FFFBF3; }
        .shift-P { background-color: #E0F2FE; color: #0369A1; font-weight: 800; border-radius: 4px; }
        .shift-M { background-color: #D1FAE5; color: #047857; font-weight: 800; border-radius: 4px; }
        .shift-O { background-color: #FEE2E2; color: #B91C1C; font-weight: 800; border-radius: 4px; }
        .legend { display: flex; justify-content: center; gap: 20px; font-size: 12px; margin-top: 20px; }
        .legend-item { display: flex; items-center; gap: 5px; }
        .legend-box { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; }
        @media print {
          body { padding: 0; background-color: #fff; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>POLA MINGGUAN JADWAL SHIFT</h1>
        <p class="subtitle">Berlaku Mulai: ${dateStr}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th class="emp-col">Nama Karyawan</th>
            ${DAYS.map(d => `<th>${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${employees.map(emp => `
            <tr>
              <td class="emp-col">${emp.name}<br><small style="color:#7A6A57;font-weight:400;">${emp.role}</small></td>
              ${[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                const type = patterns[emp.id]?.[dayIdx];
                const label = type === ShiftType.PAGI ? 'P' : type === ShiftType.MIDDLE ? 'M' : 'O';
                return `<td class="shift-${label}">${label}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="legend">
        <div class="legend-item">
          <div class="legend-box shift-P">P</div>
          <span>Shift Pagi</span>
        </div>
        <div class="legend-item">
          <div class="legend-box shift-M">M</div>
          <span>Shift Middle</span>
        </div>
        <div class="legend-item">
          <div class="legend-box shift-O">O</div>
          <span>Libur</span>
        </div>
      </div>
    </body>
    </html>
  `;

  printContent(html);
}

export function exportInventoryPDF(
  inventory: any[],
  startDate: string,
  endDate: string
) {
  const startStr = new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const endStr = new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan Stok Opname - Kedai Elvera 57</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1A1A1E; background-color: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 3px solid #C8A96E; padding-bottom: 20px; }
        .header-left h1 { color: #C8A96E; font-size: 32px; margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
        .header-left p { color: #666; font-size: 14px; margin: 5px 0 0 0; font-weight: 600; }
        .header-right { text-align: right; }
        .header-right p { margin: 2px 0; font-size: 12px; font-weight: 700; color: #1A1A1E; }
        
        .summary-box { background: #F9F9FB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 15px 25px; margin-bottom: 30px; display: flex; gap: 40px; }
        .summary-item { display: flex; flex-direction: column; }
        .summary-label { font-size: 10px; text-transform: uppercase; color: #6B7280; font-weight: 800; letter-spacing: 1px; }
        .summary-value { font-size: 18px; font-weight: 900; color: #1A1A1E; }

        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 40px; }
        th { background-color: #1A1A1E; color: #fff; text-align: left; padding: 12px 15px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; border: 1px solid #1A1A1E; }
        td { padding: 12px 15px; border: 1px solid #E5E7EB; color: #374151; font-weight: 500; }
        tr:nth-child(even) { background-color: #FBFBFC; }
        
        .footer-sig { margin-top: 60px; display: flex; justify-content: flex-end; }
        .sig-box { width: 200px; text-align: center; }
        .sig-line { border-bottom: 1px solid #1A1A1E; margin-bottom: 8px; height: 80px; }
        .sig-name { font-weight: 800; font-size: 14px; }
        .sig-title { font-size: 12px; color: #6B7280; }

        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>Kedai Elvera 57</h1>
          <p>LAPORAN STOK OPNAME INVENTARIS</p>
        </div>
        <div class="header-right">
          <p>Periode: ${startStr} - ${endStr}</p>
          <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div class="summary-box">
        <div class="summary-item">
          <span class="summary-label">Total Bahan</span>
          <span class="summary-value">${inventory.length} Item</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Stok Kritis</span>
          <span class="summary-value">${inventory.filter(i => i.stock < i.min_stock).length} Item</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 5%">No</th>
            <th style="width: 30%">Nama Bahan / Item</th>
            <th style="width: 15%">Divisi</th>
            <th style="width: 15%">Kategori</th>
            <th style="width: 12%">Sisa Stok</th>
            <th style="width: 11%">Min. Stok</th>
            <th style="width: 12%">Kadaluarsa</th>
          </tr>
        </thead>
        <tbody>
          ${inventory.map((item, idx) => {
            const lowStock = item.stock < item.min_stock;
            const parts = (item.category || "").split(":");
            let division = "Dapur";
            let categoryName = item.category || "";
            if (parts.length > 1) {
              division = parts[0].trim();
              categoryName = parts.slice(1).join(":").trim();
            } else {
              const lowerCat = categoryName.toLowerCase();
              if (lowerCat === "dairy" || lowerCat === "minuman" || lowerCat === "susu" || lowerCat === "sirup") {
                division = "Bar";
              }
            }
            return `
              <tr>
                <td>${idx + 1}</td>
                <td style="font-weight: 800">${item.name}</td>
                <td><span style="padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10px; text-transform: uppercase; ${division === 'Bar' ? 'background: rgba(59, 130, 246, 0.1); color: #2563EB;' : 'background: rgba(245, 158, 11, 0.1); color: #D97706;'}">${division}</span></td>
                <td>${categoryName}</td>
                <td style="${lowStock ? 'color: #B91C1C; font-weight: 800;' : ''}">${item.stock} ${item.unit}</td>
                <td>${item.min_stock} ${item.unit}</td>
                <td>${item.exp_date}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="footer-sig">
        <div class="sig-box">
          <p style="margin-bottom: 5px; font-size: 12px;">Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div class="sig-line"></div>
          <p class="sig-name">Admin / Manager</p>
          <p class="sig-title">Kedai Elvera 57 POS System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  printContent(html);
}

export function getUsageUnit(name: string): string {
  if (!name) return '';
  const lowerName = name.toLowerCase();
  
  if (/\b(kg|kilogram)\b/i.test(lowerName) || lowerName.includes('(kg)') || lowerName.includes(' kg') || lowerName.endsWith('kg')) {
    return 'gr';
  }
  if (/\b(liter|ltr|l)\b/i.test(lowerName) || lowerName.includes('(liter)') || lowerName.includes('(l)') || lowerName.includes(' liter') || lowerName.endsWith('liter')) {
    return 'ml';
  }
  if (/\b(pcs|buah|piece|seeds|biji|bh)\b/i.test(lowerName) || lowerName.includes('(pcs)') || lowerName.includes('(buah)') || lowerName.includes(' pcs') || lowerName.endsWith('pcs') || lowerName.includes('(bh)')) {
    return 'pcs';
  }
  if (/\b(pack|bungkus|bks|sachet|sch|dus|box|kotak)\b/i.test(lowerName) || lowerName.includes('(pack)') || lowerName.includes(' pack') || lowerName.endsWith('pack') || lowerName.includes('(bungkus)') || lowerName.includes('(bks)')) {
    return 'pack';
  }
  if (/\b(gram|gr|g)\b/i.test(lowerName) || lowerName.includes('(gr)') || lowerName.includes('(g)') || lowerName.includes(' gram') || lowerName.endsWith('gram')) {
    return 'gr';
  }
  if (/\b(ml|mililiter)\b/i.test(lowerName) || lowerName.includes('(ml)') || lowerName.includes(' ml') || lowerName.endsWith('ml')) {
    return 'ml';
  }
  
  const match = name.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    const unit = match[1].trim().toLowerCase();
    if (unit === 'kg') return 'gr';
    if (unit === 'l' || unit === 'liter' || unit === 'ltr') return 'ml';
    return unit;
  }
  
  return '';
}

export function exportHPPReport(
  brandName: string,
  recipeName: string,
  ingredients: any[],
  shrinkagePercent: number,
  laborCost: number,
  overheadCost: number,
  yieldPortions: number,
  targetMargin: number,
  baseHpp: number,
  wasteCost: number,
  totalHpp: number,
  hppPerPortion: number,
  recommendedSellingPrice: number
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan Kalkulasi HPP - ${recipeName || 'Resep Baru'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        @page {
          size: A4 portrait;
          margin: 20mm 15mm 20mm 15mm;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.5;
          color: #2D3748;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
          border: none;
        }
        .header-table td {
          border: none;
          padding: 0;
          vertical-align: top;
        }
        .header-left {
          text-align: left;
        }
        .brand-name {
          font-size: 20pt;
          font-weight: 800;
          color: #1A202C;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        .doc-subtitle {
          font-size: 9.5pt;
          font-weight: 700;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 5px;
        }
        .header-right {
          text-align: right;
        }
        .doc-code {
          font-size: 9.5pt;
          font-weight: 700;
          color: #1A202C;
        }
        .doc-date {
          font-size: 8.5pt;
          color: #718096;
          margin-top: 5px;
        }
        .header-line {
          border-bottom: 2px solid #2D3748;
          margin-bottom: 25px;
          margin-top: 15px;
          width: 100%;
        }

        .metadata-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          background-color: #F7FAFC;
          border: 1px solid #E2E8F0;
        }
        .metadata-table td {
          padding: 10px 14px;
          border: 1px solid #E2E8F0;
          font-size: 9.5pt;
        }
        .meta-label {
          width: 30%;
          font-weight: 700;
          color: #4A5568;
          text-transform: uppercase;
          background-color: #EDF2F7;
          letter-spacing: 0.5px;
        }
        .meta-value {
          font-weight: 800;
          color: #1A202C;
          letter-spacing: 0.5px;
        }

        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          text-align: center;
        }
        .summary-table th {
          background-color: #2D3748;
          color: #ffffff;
          font-size: 8.5pt;
          font-weight: 700;
          text-transform: uppercase;
          padding: 10px;
          border: 1px solid #2D3748;
          letter-spacing: 0.5px;
        }
        .summary-table td {
          font-size: 13pt;
          font-weight: 800;
          color: #1A202C;
          padding: 14px 10px;
          border: 1px solid #E2E8F0;
          background-color: #F7FAFC;
        }
        .summary-table td.highlight-val {
          color: #DD6B20;
          background-color: #FFFAF0;
        }

        .section-title {
          font-size: 10pt;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          font-weight: 800;
          color: #2D3748;
          border-left: 3px solid #2D3748;
          padding-left: 8px;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          margin-bottom: 25px;
        }
        .details-table th {
          background-color: #4A5568;
          color: #ffffff;
          font-weight: 700;
          text-transform: uppercase;
          padding: 10px 12px;
          border: 1px solid #4A5568;
          font-size: 8pt;
          letter-spacing: 0.5px;
        }
        .details-table td {
          padding: 8px 12px;
          border: 1px solid #E2E8F0;
          color: #2D3748;
        }
        .details-table tr:nth-child(even) {
          background-color: #F7FAFC;
        }
        .total-row td {
          background-color: #EDF2F7;
          border-top: 2px solid #4A5568;
          font-size: 9.5pt;
        }

        .variables-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          margin-bottom: 35px;
        }
        .variables-table th {
          background-color: #718096;
          color: #ffffff;
          text-transform: uppercase;
          padding: 8px 12px;
          font-size: 8pt;
          text-align: left;
          border: 1px solid #718096;
          letter-spacing: 0.5px;
        }
        .variables-table td {
          padding: 8px 12px;
          border: 1px solid #E2E8F0;
        }
        .var-label {
          width: 25%;
          font-weight: 700;
          background-color: #EDF2F7;
          color: #4A5568;
        }
        .var-val {
          width: 25%;
          font-weight: 600;
          color: #1A202C;
        }

        .signature-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 30px;
          border: none;
        }
        .signature-table td {
          border: none;
          padding: 0;
          vertical-align: bottom;
        }
        .sig-note {
          width: 55%;
          font-size: 8pt;
          color: #718096;
          line-height: 1.4;
          text-align: left;
        }
        .sig-space {
          width: 15%;
        }
        .sig-box {
          width: 30%;
          text-align: center;
        }
        .sig-title {
          font-size: 9pt;
          color: #2D3748;
          margin-bottom: 50px;
        }
        .sig-line {
          border-bottom: 1px solid #2D3748;
          width: 80%;
          margin: 0 auto 5px auto;
        }
        .sig-name {
          font-weight: 700;
          font-size: 8.5pt;
          color: #1A202C;
          text-transform: uppercase;
        }
        .sig-brand {
          font-size: 8pt;
          color: #718096;
          margin-top: 2px;
        }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td class="header-left">
            <div class="brand-name">${brandName}</div>
            <div class="doc-subtitle">Cost of Goods Sold (COGS) Report</div>
          </td>
          <td class="header-right">
            <div class="doc-code">DOC REF: HPP-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}</div>
            <div class="doc-date">Dicetak pada: ${new Date().toLocaleString('id-ID')}</div>
          </td>
        </tr>
      </table>
      <div class="header-line"></div>

      <table class="metadata-table">
        <tr>
          <td class="meta-label">Nama Resep Menu Baru</td>
          <td class="meta-value">${recipeName ? recipeName.trim().toUpperCase() : 'RESEP BARU TANPA NAMA'}</td>
        </tr>
        <tr>
          <td class="meta-label">Metode Penghitungan</td>
          <td class="meta-value">Standard Costing & Operational Overhead Allocation</td>
        </tr>
      </table>

      <div class="section-title">Ringkasan Finansial</div>
      <table class="summary-table">
        <thead>
          <tr>
            <th style="width: 25%;">Total HPP</th>
            <th style="width: 25%;">HPP Per Porsi</th>
            <th style="width: 25%;">Target Margin</th>
            <th style="width: 25%;">Rekomendasi Harga Jual</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rp ${Math.round(totalHpp).toLocaleString('id-ID')}</td>
            <td class="highlight-val">Rp ${Math.round(hppPerPortion).toLocaleString('id-ID')}</td>
            <td>${targetMargin}%</td>
            <td class="highlight-val">Rp ${Math.round(recommendedSellingPrice).toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Rincian Pemakaian Bahan Baku</div>
      <table class="details-table">
        <thead>
          <tr>
            <th style="width: 5%; text-align: center;">No</th>
            <th style="width: 45%; text-align: left;">Nama Bahan Baku</th>
            <th style="width: 15%; text-align: right;">Harga Beli</th>
            <th style="width: 12%; text-align: center;">Konversi</th>
            <th style="width: 11%; text-align: center;">Pemakaian</th>
            <th style="width: 12%; text-align: right;">Biaya Riil</th>
          </tr>
        </thead>
        <tbody>
          ${ingredients.map((item, idx) => {
            const pricePerUnit = item.conversionValue > 0 ? item.purchasePrice / item.conversionValue : 0;
            const realCost = item.quantityNeeded * pricePerUnit;
            return `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="font-weight: 700; text-transform: uppercase; text-align: left;">${item.name || 'Bahan Tanpa Nama'}</td>
                <td style="text-align: right;">Rp ${item.purchasePrice.toLocaleString('id-ID')}</td>
                <td style="text-align: center;">${item.conversionValue}</td>
                <td style="text-align: center;">${item.quantityNeeded} ${getUsageUnit(item.name)}</td>
                <td style="text-align: right; font-weight: 700;">Rp ${Math.round(realCost).toLocaleString('id-ID')}</td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="5" style="text-align: right; font-weight: 700;">TOTAL BIAYA BAHAN BAKU (BASE HPP)</td>
            <td style="text-align: right; font-weight: 800; color: #DD6B20;">Rp ${Math.round(baseHpp).toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      <table class="variables-table">
        <thead>
          <tr>
            <th colspan="4">Konstanta Variabel & Biaya Operasional</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="var-label">Penyusutan</td>
            <td class="var-val">${shrinkagePercent}% (Rp ${Math.round(wasteCost).toLocaleString('id-ID')})</td>
            <td class="var-label">Gaji</td>
            <td class="var-val">Rp ${laborCost.toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td class="var-label">Overhead</td>
            <td class="var-val">Rp ${overheadCost.toLocaleString('id-ID')}</td>
            <td class="var-label">Target Porsi</td>
            <td class="var-val">${yieldPortions} Porsi</td>
          </tr>
        </tbody>
      </table>

      <table class="signature-table">
        <tr>
          <td class="sig-note">
            * Laporan ini merupakan lembar kalkulasi proyeksi HPP resmi internal ${brandName}.<br>
            * Estimasi biaya riil dapat berfluktuasi mengikuti kondisi harga pasar bahan baku terbaru.
          </td>
          <td class="sig-space"></td>
          <td class="sig-box">
            <div class="sig-title">Dibuat & Disetujui Oleh,</div>
            <div class="sig-line"></div>
            <div class="sig-name">Chef / Kitchen Manager</div>
            <div class="sig-brand">${brandName} POS System</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Save original title and set temporary title for PDF filename determination
  const originalTitle = document.title;
  const cleanRecipe = recipeName && recipeName.trim() ? recipeName.trim().toUpperCase() : 'RESEP BARU';

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    // Set document title temporarily to affect print dialog filename
    document.title = `Kalkulasi HPP ${brandName} - ${cleanRecipe}`;

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      // Restore original title immediately after triggering print dialog
      document.title = originalTitle;

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 800);
  }
}
