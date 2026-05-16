import EscPosEncoder from 'esc-pos-encoder';
import type { Transaction, Order } from '../app/types';

/**
 * ReceiptTemplate Utility
 * Menghasilkan ArrayBuffer (ESC/POS) untuk printer thermal 58mm (32 kolom)
 */
export const ReceiptTemplate = {
  // Helper: Rata Tengah
  center: (text: string) => {
    const spaces = Math.floor((32 - text.length) / 2);
    return ' '.repeat(Math.max(0, spaces)) + text;
  },

  // Helper: Baris Rata Kiri & Kanan (Contoh: Label ..... Harga)
  formatLine: (label: string, value: string) => {
    const spaces = 32 - label.length - value.length;
    return label + ' '.repeat(Math.max(1, spaces)) + value;
  },

  // Helper: Format Kolom Tabel (Nama, Qty, Harga, Total)
  formatCell: (text: string, width: number, align: 'left' | 'right' = 'left') => {
    const str = text.toString();
    if (str.length > width) return str.substring(0, width);
    const spaces = width - str.length;
    return align === 'left' ? str + ' '.repeat(spaces) : ' '.repeat(spaces) + str;
  },

  /**
   * Struk Pembayaran Konsumen
   */
  generateTransaction: (tx: Transaction) => {
    const encoder = new EscPosEncoder();
    let builder = encoder
      .initialize()
      .codepage('windows1252')
      .raw([0x1B, 0x61, 0x01]) // ESC a 1 (Center)
      .text('KEDAI ELVERA 57')
      .newline()
      .text('Jl. Pertanian No. 57')
      .newline()
      .text('Lebak Bulus, Jak-Sel')
      .newline()
      .text('WA: 0895-3763-48626')
      .newline()
      .newline()
      .raw([0x1B, 0x61, 0x00]) // ESC a 0 (Left) - KEMBALIKAN KE KIRI
      .text(`Tgl: ${new Date(tx.created_at).toLocaleDateString('id-ID')}`)
      .newline()
      .text(`Jam: ${new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`)
      .newline()
      .text(`No : ${tx.id.toUpperCase().slice(-8)}`)
      .newline()
      .text(`Kasir: Verena`)
      .newline()
      .text('--------------------------------') 
      .newline()
      .text('Item         Qty  Harga   Total ')
      .newline()
      .text('--------------------------------')
      .newline();

    tx.items.forEach((item) => {
      const name = ReceiptTemplate.formatCell(item.name.toUpperCase(), 12, 'left');
      const qty = ReceiptTemplate.formatCell(item.qty.toString(), 3, 'right');
      const price = ReceiptTemplate.formatCell((item.price / 1000).toFixed(0) + 'k', 7, 'right');
      const total = ReceiptTemplate.formatCell(((item.price * item.qty) / 1000).toFixed(0) + 'k', 7, 'right');
      builder = builder.text(`${name} ${qty} ${price} ${total}`).newline();
    });

    builder = builder
      .text('--------------------------------')
      .newline()
      .text(ReceiptTemplate.formatLine('Subtotal:', tx.subtotal.toLocaleString('id-ID')))
      .newline();

    if (tx.discount_amount) {
      builder = builder
        .text(ReceiptTemplate.formatLine(`Diskon (${tx.discount}%):`, `-${tx.discount_amount.toLocaleString('id-ID')}`))
        .newline();
    }

    builder = builder
      .text(ReceiptTemplate.formatLine('TOTAL:', tx.total.toLocaleString('id-ID')))
      .newline()
      .text(ReceiptTemplate.formatLine('Metode:', tx.method.toUpperCase()))
      .newline()
      .text(ReceiptTemplate.formatLine('Bayar:', tx.total.toLocaleString('id-ID')))
      .newline()
      .text(ReceiptTemplate.formatLine('Kembali:', '0'))
      .newline()
      .text('--------------------------------')
      .newline()
      .raw([0x1B, 0x61, 0x01]) // ESC a 1 (Center)
      .text('Dukung UMKM Indonesia')
      .newline()
      .text('Tulang Punggung')
      .newline()
      .text('Ekonomi Nasional')
      .newline()
      .raw([0x1B, 0x61, 0x00]) // ESC a 0 (Left) - RESET
      .newline()
      .newline()
      .newline()
      .newline()
      .newline(); 

    return builder.encode();
  },

  /**
   * Struk Dapur (Kitchen)
   */
  generateKitchen: (order: Order) => {
    const encoder = new EscPosEncoder();
    let builder = encoder
      .initialize()
      .codepage('windows1252')
      .raw([0x1B, 0x61, 0x01]) // ESC a 1 (Center)
      .text('*** STRUK DAPUR ***')
      .newline()
      .text('--------------------------------')
      .newline()
      .raw([0x1B, 0x61, 0x00]) // ESC a 0 (Left)
      .text(`TIPE : ${(order as any).orderMode?.toUpperCase() || 'DINE IN'}`)
      .newline()
      .text(`Meja : ${order.tableId || 'Take Away'}`)
      .newline()
      .text(`Jam  : ${new Date().toLocaleTimeString('id-ID')}`)
      .newline()
      .text(`Order: #${order.id.slice(-5).toUpperCase()}`)
      .newline()
      .text('--------------------------------')
      .newline();

    order.items.forEach((item) => {
      builder = builder
        .text(`${item.qty}x ${item.name.toUpperCase()}`)
        .newline();
      if (item.notes) {
        builder = builder.text(`   (Catatan: ${item.notes})`).newline();
      }
    });

    builder = builder
      .text('--------------------------------')
      .newline()
      .newline()
      .newline()
      .newline()
      .newline()
      .newline();

    return builder.encode();
  },

  /**
   * Laporan Rekapitulasi Lengkap (Sesuai Foto)
   */
  generateClosingReport: (data: {
    bulan: string,
    kasir: string,
    startTime: string,
    endTime: string,
    terjual: number,
    items: { name: string, qty: number }[],
    totalVoid: number,
    pemasukan: {
      qris: number,
      debit: number,
      tunai: number,
      total: number
    },
    kasKecil: {
      awal: number,
      saldo: number,
      total: number
    }
  }) => {
    const encoder = new EscPosEncoder();
    let builder = encoder
      .initialize()
      .codepage('windows1252')
      .raw([0x1B, 0x61, 0x01]) // Center
      .text('KEDAI ELVERA 57')
      .newline()
      .text('Jl. Pertanian No. 57')
      .newline()
      .text('Lebak Bulus, Jakarta Selatan')
      .newline()
      .text('WA: 0895-3763-48626')
      .newline()
      .text('--------------------------------')
      .newline()
      .newline()
      .text('LAPORAN REKAPITULASI')
      .newline()
      .raw([0x1B, 0x61, 0x00]) // Left
      .text(ReceiptTemplate.formatLine('Bulan:', data.bulan))
      .newline()
      .text(ReceiptTemplate.formatLine('Kasir:', data.kasir))
      .newline()
      .text(ReceiptTemplate.formatLine('Mulai:', data.startTime))
      .newline()
      .text(ReceiptTemplate.formatLine('Selesai:', data.endTime))
      .newline()
      .text(ReceiptTemplate.formatLine('Terjual:', data.terjual + ' Item'))
      .newline()
      .text('--------------------------------')
      .newline()
      .newline()
      .text('DETAIL TRANSAKSI')
      .newline();

    // List Items
    data.items.forEach(item => {
      const name = item.name.toUpperCase();
      const qty = 'x ' + item.qty;
      builder = builder.text(ReceiptTemplate.formatLine(name, qty)).newline();
    });

    builder = builder
      .text('--------------------------------')
      .newline()
      .newline()
      .text('TRANSAKSI VOID')
      .newline()
      .text(ReceiptTemplate.formatLine('TOTAL VOID', data.totalVoid.toString()))
      .newline()
      .text('--------------------------------')
      .newline()
      .newline()
      .text('DETAIL PEMASUKAN')
      .newline()
      .text(ReceiptTemplate.formatLine('QRIS', 'Rp ' + data.pemasukan.qris.toLocaleString('id-ID')))
      .newline()
      .text(ReceiptTemplate.formatLine('DEBIT CARD', 'Rp ' + data.pemasukan.debit.toLocaleString('id-ID')))
      .newline()
      .text(ReceiptTemplate.formatLine('TUNAI', 'Rp ' + data.pemasukan.tunai.toLocaleString('id-ID')))
      .newline()
      .text(ReceiptTemplate.formatLine('TOTAL PEMASUKAN', 'Rp ' + data.pemasukan.total.toLocaleString('id-ID')))
      .newline()
      .text('--------------------------------')
      .newline()
      .newline()
      .text('DETAIL KAS KECIL')
      .newline()
      .text(ReceiptTemplate.formatLine('KAS AWAL', 'Rp ' + data.kasKecil.awal.toLocaleString('id-ID')))
      .newline()
      .text(ReceiptTemplate.formatLine('SALDO', 'Rp ' + data.kasKecil.saldo.toLocaleString('id-ID')))
      .newline()
      .text(ReceiptTemplate.formatLine('TOTAL KAS', 'Rp ' + data.kasKecil.total.toLocaleString('id-ID')))
      .newline()
      .text('--------------------------------')
      .newline()
      .newline()
      .raw([0x1B, 0x61, 0x01]) // Center
      .text('Diterbitkan Oleh')
      .newline()
      .text('KASIRGO POS APP')
      .newline()
      .text('Jl. Pertanian No. 57')
      .newline()
      .text('Lebak Bulus, Jakarta Selatan')
      .newline()
      .raw([0x1B, 0x61, 0x00]) // Reset
      .newline()
      .newline()
      .newline()
      .newline()
      .newline();

    return builder.encode();
  }
};
