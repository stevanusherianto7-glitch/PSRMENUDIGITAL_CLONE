import { ShiftType, Employee } from '../app/types';

export function exportMonthlyPDF(
  currentDate: Date,
  dates: string[],
  employees: Employee[],
  shifts: Record<string, Record<string, ShiftType>>
) {
  const monthYearStr = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  
  let html = `
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
        <h1>JADWAL SHIFT KEDAI ELVERA 57</h1>
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

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}

export function exportWeeklyPDF(
  effectiveDate: string | undefined,
  employees: Employee[],
  patterns: Record<string, ShiftType[]>
) {
  const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
  const dateStr = effectiveDate ? new Date(effectiveDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "Segera";

  let html = `
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

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}
