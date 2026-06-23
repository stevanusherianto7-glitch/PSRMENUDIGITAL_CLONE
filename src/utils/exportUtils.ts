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
      <title>Jadwal Shift Bulanan</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 15mm 20mm; color: #2A1F18; background-color: #FFFBF3; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 2px solid #E87722; padding-bottom: 15px; }
        .header h1 { color: #E87722; font-size: 28px; margin: 0; font-weight: 800; }
        .header p.subtitle { color: #7A6A57; font-size: 14px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        th, td { border: 1px solid #E8E3D3; padding: 10px; text-align: center; }
        th { background-color: #E5E7EB !important; color: #374151 !important; font-weight: 800; text-transform: uppercase; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        th.emp-col, td.emp-col { text-align: left; font-weight: 800; background-color: #FFFBF3 !important; position: sticky; left: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        .shift-P { background-color: #E0F2FE !important; color: #0369A1 !important; font-weight: 800; border-radius: 4px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        .shift-M { background-color: #D1FAE5 !important; color: #047857 !important; font-weight: 800; border-radius: 4px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        .shift-O { background-color: #FEE2E2 !important; color: #B91C1C !important; font-weight: 800; border-radius: 4px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        .legend { display: flex; justify-content: center; gap: 20px; font-size: 12px; margin-top: 20px; }
        .legend-item { display: flex; items-center; gap: 5px; }
        .legend-box { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; }
        @page {
          size: landscape;
          margin: 0;
        }
        @media print {
          body { padding: 15mm 20mm; background-color: #fff; }
          .no-print { display: none; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="text-align: left;">
          <h1>Jadwal Shift Karyawan</h1>
          <p class="subtitle">Periode: ${monthYearStr}</p>
        </div>
        <div style="font-weight: 800; font-size: 14px; color: #E87722; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 5px;">
          Jadwal Shift Bulanan
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="emp-col">Nama Karyawan</th>
            ${dates.map(d => {
              const [y, m, dVal] = d.split('-').map(Number);
              const date = new Date(y, m - 1, dVal);
              const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' }); // "Sen", "Sel", etc.
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const textColor = isWeekend ? '#EF4444' : '#1F2937';
              const dayColor = isWeekend ? '#F87171' : '#4B5563';
              return `<th>
                <div style="font-size: 8px; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; opacity: 0.8; color: ${dayColor};">${dayName}</div>
                <div style="font-size: 11px; font-weight: 800; color: ${textColor};">${d.slice(8, 10)}</div>
              </th>`;
            }).join('')}
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
      
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #7A6A57; margin-top: 45px; border-top: 1px dashed #E8E3D3; padding-top: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
        <span>kedai elvera 57 resto</span>
        <span>Halaman 1 / 1</span>
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
        
        @media print {
          body { padding: 0; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PAWON SALAM</h1>
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
        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 15mm 20mm; color: #2A1F18; background-color: #FFFBF3; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 2px solid #E87722; padding-bottom: 15px; }
        .header h1 { color: #E87722; font-size: 28px; margin: 0; font-weight: 800; }
        .header p.subtitle { color: #7A6A57; font-size: 14px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        th, td { border: 1px solid #E8E3D3; padding: 12px; text-align: center; }
        th { background-color: #E5E7EB !important; color: #374151 !important; font-weight: 800; text-transform: uppercase; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        th.emp-col, td.emp-col { text-align: left; font-weight: 800; background-color: #FFFBF3 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        .shift-P { background-color: #E0F2FE !important; color: #0369A1 !important; font-weight: 800; border-radius: 4px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        .shift-M { background-color: #D1FAE5 !important; color: #047857 !important; font-weight: 800; border-radius: 4px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        .shift-O { background-color: #FEE2E2 !important; color: #B91C1C !important; font-weight: 800; border-radius: 4px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        .legend { display: flex; justify-content: center; gap: 20px; font-size: 12px; margin-top: 20px; }
        .legend-item { display: flex; items-center; gap: 5px; }
        .legend-box { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; }
        @page {
          size: landscape;
          margin: 0;
        }
        @media print {
          body { padding: 15mm 20mm; background-color: #fff; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="text-align: left;">
          <h1>POLA MINGGUAN JADWAL SHIFT</h1>
          <p class="subtitle">Berlaku Mulai: ${dateStr}</p>
        </div>
        <div style="font-weight: 800; font-size: 14px; color: #E87722; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 5px;">
          Jadwal Shift Mingguan
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="emp-col">Nama Karyawan</th>
            ${DAYS.map(d => {
              const isWeekend = d === 'SABTU' || d === 'MINGGU';
              const textColor = isWeekend ? '#EF4444' : '#374151';
              return `<th style="color: ${textColor} !important;">${d}</th>`;
            }).join('')}
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
      
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #7A6A57; margin-top: 45px; border-top: 1px dashed #E8E3D3; padding-top: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
        <span>kedai elvera 57 resto</span>
        <span>Halaman 1 / 1</span>
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
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>PAWON SALAM</h1>
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
            <th style="width: 35%">Nama Bahan / Item</th>
            <th style="width: 15%">Kategori</th>
            <th style="width: 15%">Sisa Stok</th>
            <th style="width: 15%">Min. Stok</th>
            <th style="width: 15%">Kadaluarsa</th>
          </tr>
        </thead>
        <tbody>
          ${inventory.map((item, idx) => {
            const lowStock = item.stock < item.min_stock;
            return `
              <tr>
                <td>${idx + 1}</td>
                <td style="font-weight: 800">${item.name}</td>
                <td>${item.category}</td>
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
