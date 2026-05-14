import EscPosEncoder from 'esc-pos-encoder';
import { toast } from "sonner";

// Declare bluetoothSerial for TypeScript
declare let bluetoothSerial: any;

export interface BluetoothDevice {
  name: string;
  address: string;
  id: string;
  class: number;
}

class PrintService {
  private isConnected: boolean = false;

  private checkPlatform(): boolean {
    if (typeof bluetoothSerial === 'undefined') {
      console.warn('Bluetooth Serial plugin tidak tersedia. Pastikan Anda menjalankan di perangkat Android.');
      return false;
    }
    return true;
  }

  /**
   * Cek apakah Bluetooth aktif
   */
  async isBluetoothEnabled(): Promise<boolean> {
    if (!this.checkPlatform()) return false;
    return new Promise((resolve) => {
      bluetoothSerial.isEnabled(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  /**
   * Ambil daftar perangkat yang sudah di-pairing
   */
  async listPairedDevices(): Promise<BluetoothDevice[]> {
    if (!this.checkPlatform()) return [];
    return new Promise((resolve, reject) => {
      bluetoothSerial.list(
        (devices: BluetoothDevice[]) => resolve(devices),
        (err: any) => reject(err)
      );
    });
  }

  /**
   * Koneksi ke printer berdasarkan MAC Address
   */
  async connect(address: string): Promise<boolean> {
    if (!this.checkPlatform()) return false;
    return new Promise((resolve, reject) => {
      bluetoothSerial.connect(
        address,
        () => {
          this.isConnected = true;
          resolve(true);
        },
        (err: any) => reject(err)
      );
    });
  }

  /**
   * Putuskan koneksi
   */
  async disconnect(): Promise<void> {
    if (!this.checkPlatform()) return;
    return new Promise((resolve) => {
      bluetoothSerial.disconnect(
        () => {
          this.isConnected = false;
          resolve();
        },
        () => resolve()
      );
    });
  }

  /**
   * Kirim data raw (ArrayBuffer) ke printer
   */
  async printRaw(data: ArrayBuffer): Promise<boolean> {
    if (!this.checkPlatform()) {
      toast.error('Platform tidak mendukung Bluetooth (harus di HP Android).');
      throw new Error('Platform tidak mendukung.');
    }
    if (!this.isConnected) {
      toast.error('Printer belum terhubung di aplikasi. Silahkan hubungkan lewat Pengaturan Printer.');
      throw new Error('Printer tidak terhubung.');
    }
    
    toast.info('Mengirim data ke printer...');
    
    return new Promise((resolve, reject) => {
      bluetoothSerial.write(
        data,
        () => {
          toast.success('Data berhasil dikirim ke printer.');
          resolve(true);
        },
        (err: any) => {
          toast.error(`Gagal mengirim data: ${err}`);
          reject(err);
        }
      );
    });
  }

  /**
   * Cetak Struk Contoh
   */
  async printTestPage(): Promise<boolean> {
    const encoder = new EscPosEncoder();
    
    // Format untuk kertas 58mm (biasanya 32 karakter per baris)
    const data = encoder
      .initialize()
      .align('center')
      .text('PAWON SALAM')
      .newline()
      .text('Sistem Kasir Digital')
      .newline()
      .text('--------------------------------') // 32 chars
      .newline()
      .align('left')
      .text('Nasi Goreng Spesial  x1  25.000')
      .newline()
      .text('Es Teh Manis        x1   5.000')
      .newline()
      .text('--------------------------------')
      .newline()
      .align('right')
      .text('Total: 30.000')
      .newline()
      .newline()
      .align('center')
      .text('Terima Kasih Atas Kunjungan Anda')
      .newline()
      .newline()
      .newline() // Beri jarak agar tidak terpotong
      .encode();

    return this.printRaw(data.buffer);
  }
  /**
   * Cetak Struk Transaksi Real (Format Sesuai Gambar)
   */
  async printTransaction(tx: any): Promise<boolean> {
    const encoder = new EscPosEncoder();
    
    const formatLine = (label: string, value: string) => {
      const spaces = 32 - label.length - value.length;
      return label + ' '.repeat(Math.max(1, spaces)) + value;
    };

    const formatCell = (text: string, width: number, align: 'left' | 'right' = 'left') => {
      if (text.length > width) {
        return text.substring(0, width);
      }
      const spaces = width - text.length;
      if (align === 'left') {
        return text + ' '.repeat(spaces);
      } else {
        return ' '.repeat(spaces) + text;
      }
    };
    
    let builder = encoder
      .initialize()
      .align('center')
      .text('KEDAI ELVERA 57')
      .newline()
      .text('Jl. Pertanian No. 57')
      .newline()
      .text('Lebak Bulus, Jakarta Selatan')
      .newline()
      .text('WA: 0895-3763-48626')
      .newline()
      .newline()
      .text(`Order #${tx.id}`)
      .newline()
      .text('--------------------------------')
      .newline()
      .align('left')
      .text(`Tgl: ${new Date(tx.created_at).toLocaleDateString('id-ID')}`)
      .newline()
      .text(`Jam: ${new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`)
      .newline()
      .text(`Bill: ${tx.id.toUpperCase()}`)
      .newline()
      .text('Kasir: Admin')
      .newline()
      .text('--------------------------------')
      .newline();

    // Table Headers
    builder = builder
      .text('Transaksi    Qty   Harga   Total')
      .newline()
      .text('--------------------------------')
      .newline();

    // List Items
    tx.items.forEach((item: any) => {
      const name = formatCell(item.name.toUpperCase(), 12, 'left');
      const qty = formatCell(item.qty.toString(), 4, 'right');
      const price = formatCell(item.price.toLocaleString('id-ID'), 8, 'right');
      const total = formatCell((item.price * item.qty).toLocaleString('id-ID'), 8, 'right');
      
      builder = builder.text(`${name}${qty}${price}${total}`).newline();
    });

    builder = builder
      .text('--------------------------------')
      .newline()
      .text(formatLine('Subtotal:', tx.subtotal.toLocaleString('id-ID')))
      .newline();

    if (tx.discount_amount) {
      builder = builder
        .text(formatLine(`Diskon (${tx.discount || 0}%):`, `-${tx.discount_amount.toLocaleString('id-ID')}`))
        .newline();
    }

    builder = builder
      .text(formatLine('TOTAL', tx.total.toLocaleString('id-ID')))
      .newline()
      .text(formatLine('Metode Bayar:', tx.method.toUpperCase()))
      .newline()
      .text(formatLine('Bayar:', tx.total.toLocaleString('id-ID')))
      .newline()
      .text(formatLine('Kembali:', '0'))
      .newline()
      .text('--------------------------------')
      .newline()
      .align('center')
      .text('Dukung UMKM Indonesia')
      .newline()
      .text('Tulang Punggung Ekonomi Nasional')
      .newline()
      .newline()
      .newline();

    const data = builder.encode();
    return this.printRaw(data.buffer);
  }
  /**
   * Cetak Struk Dapur (Kitchen)
   */
  async printKitchenReceipt(order: any): Promise<boolean> {
    const encoder = new EscPosEncoder();
    
    let builder = encoder
      .initialize()
      .align('center')
      .text('STRUK DAPUR')
      .newline()
      .text('--------------------------------')
      .newline()
      .align('left')
      .text(`Meja: ${order.tableId || 'Take Away'}`)
      .newline()
      .text(`Waktu: ${new Date().toLocaleTimeString('id-ID')}`)
      .newline()
      .text('--------------------------------')
      .newline();

    order.items.forEach((item: any) => {
      builder = builder
        .text(`${item.qty}x ${item.name}`)
        .newline();
    });

    builder = builder
      .text('--------------------------------')
      .newline();

    if (order.notes) {
      builder = builder
        .text(`Catatan: ${order.notes}`)
        .newline();
    }

    builder = builder
      .newline()
      .newline()
      .newline();

    const data = builder.encode();
    return this.printRaw(data.buffer);
  }

  /**
   * Cetak Laporan Closing
   */
  async printClosingReceipt(data: any): Promise<boolean> {
    const encoder = new EscPosEncoder();
    
    const formatLine = (label: string, value: string) => {
      const spaces = 32 - label.length - value.length;
      return label + ' '.repeat(Math.max(1, spaces)) + value;
    };
    
    let builder = encoder
      .initialize()
      .align('center')
      .text('LAPORAN CLOSING')
      .newline()
      .text('--------------------------------')
      .newline()
      .align('left')
      .text(`Tanggal: ${data.date}`)
      .newline()
      .text(`Waktu: ${new Date().toLocaleTimeString('id-ID')}`)
      .newline()
      .text('--------------------------------')
      .newline()
      .text(formatLine('Penjualan Bersih', data.penjualanBersih.toLocaleString('id-ID')))
      .newline()
      .text(formatLine('PB1 (10%)', data.pb1.toLocaleString('id-ID')))
      .newline()
      .text('--------------------------------')
      .newline()
      .text('Metode Pembayaran:')
      .newline()
      .text(formatLine('  QRIS', data.qris.toLocaleString('id-ID')))
      .newline()
      .text(formatLine('  TUNAI', data.tunai.toLocaleString('id-ID')))
      .newline()
      .text(formatLine('  KARTU', data.kartu.toLocaleString('id-ID')))
      .newline()
      .text('--------------------------------')
      .newline()
      .text(formatLine('Total Transaksi', data.totalTransaksi.toString()))
      .newline()
      .newline()
      .newline();

    const dataEncoded = builder.encode();
    return this.printRaw(dataEncoded.buffer);
  }
}

export const printService = new PrintService();
