import { toast } from "sonner";
import { ReceiptTemplate } from "./receiptTemplate";
import type { Transaction, Order } from "../app/types";
import EscPosEncoder from 'esc-pos-encoder';

interface BluetoothSerial {
  isEnabled: (success: () => void, failure: (err?: string) => void) => void;
  list: (success: (devices: any[]) => void, failure: (err: any) => void) => void;
  connectInsecure: (address: string, success: () => void, failure: (err: any) => void) => void;
  disconnect: (success: () => void, failure: (err: any) => void) => void;
  write: (data: ArrayBuffer | string, success: () => void, failure: (err: any) => void) => void;
}

declare const bluetoothSerial: BluetoothSerial;

export interface BluetoothDevice {
  name: string;
  address: string;
  id: string;
}

class PrintService {
  private isConnected: boolean = false;
  private serialPort: any = null;
  private serialWriter: any = null;
  
  // HARDCODE MAC PRINTER ANDA
  private readonly DEFAULT_MAC = '06:2B:E0:4C:71:DF';

  public getIsConnected() { return this.isConnected; }

  /**
   * Cek ketersediaan fitur Bluetooth/Serial di perangkat
   */
  async checkAvailability(): Promise<boolean> {
    if (typeof bluetoothSerial !== 'undefined') return true;
    if (typeof navigator !== 'undefined' && 'serial' in navigator) return true;
    return false;
  }

  async listDevices(): Promise<BluetoothDevice[]> {
    if (typeof bluetoothSerial !== 'undefined') {
      return new Promise((resolve) => {
        bluetoothSerial.list(
          (devices) => {
            // Selalu tambahkan RPP02N sebagai opsi utama jika belum ada
            const hasRPP = devices.some(d => d.address === this.DEFAULT_MAC);
            if (!hasRPP) {
              devices.unshift({
                name: "PRINTER RPP02N (UTAMA)",
                address: this.DEFAULT_MAC,
                id: this.DEFAULT_MAC
              });
            }
            resolve(devices);
          }, 
          () => resolve([{
            name: "PRINTER RPP02N (UTAMA)",
            address: this.DEFAULT_MAC,
            id: this.DEFAULT_MAC
          }])
        );
      });
    }
    // JIKA DI BROWSER: PAKSA MUNCUL (Agar Tahan Banting)
    return [{ id: 'web-serial', name: 'Gunakan Web Serial (Pilih Port Manual)', address: 'web-serial' }];
  }

  /**
   * Koneksi ke Printer
   */
  async connect(address: string): Promise<boolean> {
    try {
      // Web Serial (Chrome/Edge/Desktop)
      if (address === 'web-serial' || (typeof bluetoothSerial === 'undefined')) {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        this.serialPort = port;
        this.serialWriter = port.writable.getWriter();
        this.isConnected = true;
        toast.success("Printer Serial terhubung.");
        return true;
      }

      // Capacitor Bluetooth (Android)
      return new Promise((resolve) => {
        bluetoothSerial.connectInsecure(address, 
          () => {
            this.isConnected = true;
            toast.success("Printer Bluetooth terhubung.");
            resolve(true);
          }, 
          (err) => {
            toast.error("Gagal koneksi: " + err);
            resolve(false);
          }
        );
      });
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  /**
   * Kirim Data Mentah ke Printer
   */
  async printRaw(data: ArrayBuffer): Promise<void> {
    if (!this.isConnected) {
      toast.error("Printer belum terhubung.");
      return;
    }

    if (this.serialWriter) {
      try {
        await this.serialWriter.write(new Uint8Array(data));
        // Jeda singkat untuk memastikan buffer terkirim ke hardware
        await new Promise(r => setTimeout(r, 100));
        return;
      } catch (err) {
        console.error("Serial write error:", err);
        this.isConnected = false;
        toast.error("Koneksi printer terputus.");
        return;
      }
    }

    // Bluetooth (Android)
    if (typeof bluetoothSerial !== 'undefined') {
      return new Promise((resolve, reject) => {
        bluetoothSerial.write(data, 
          () => resolve(), 
          (err) => {
            this.isConnected = false;
            reject(err);
          }
        );
      });
    }
  }

  /**
   * Cek status Bluetooth (On/Off) dengan proteksi timeout
   */
  async isBluetoothEnabled(): Promise<boolean> {
    if (typeof bluetoothSerial === 'undefined') {
      // JIKA DI BROWSER: PAKSA HIJAU (Status Aktif)
      return true;
    }
    
    return new Promise((resolve) => {
      // Set timeout 3 detik agar tidak hang selamanya
      const timeout = setTimeout(() => resolve(false), 3000);

      bluetoothSerial.isEnabled(
        () => {
          clearTimeout(timeout);
          resolve(true);
        }, 
        () => {
          clearTimeout(timeout);
          resolve(false);
        }
      );
    });
  }

  /**
   * Request aktifkan Bluetooth (Android)
   */
  async enableBluetooth(): Promise<boolean> {
    if (typeof bluetoothSerial === 'undefined') return false;
    return new Promise((resolve) => {
      (bluetoothSerial as any).enable(
        () => resolve(true), 
        () => {
          toast.error("Bluetooth gagal diaktifkan");
          resolve(false);
        }
      );
    });
  }

  /**
   * Alias untuk listDevices agar cocok dengan UI
   */
  async listPairedDevices(): Promise<BluetoothDevice[]> {
    return new Promise((resolve) => {
      if (typeof bluetoothSerial !== 'undefined') {
        bluetoothSerial.list(
          (devices) => {
            // Selalu pastikan RPP02N ada di daftar (Injeksi Manual)
            const rpp02n: BluetoothDevice = {
              name: "RPP02N (KASIR)",
              address: "06:2B:E0:4C:71:DF",
              id: "06:2B:E0:4C:71:DF"
            };
            
            // Cek apakah sudah ada di list, jika belum, tambahkan di paling atas
            const exists = devices.some((d: any) => d.address === rpp02n.address);
            if (!exists) {
              resolve([rpp02n, ...devices]);
            } else {
              // Jika sudah ada, pindahkan ke paling atas
              const filtered = devices.filter((d: any) => d.address !== rpp02n.address);
              resolve([rpp02n, ...filtered]);
            }
          },
          (err) => {
            console.error("List devices error:", err);
            // Jika error, minimal kembalikan si RPP02N agar tetap bisa dicoba
            resolve([{
              name: "RPP02N (KASIR)",
              address: "06:2B:E0:4C:71:DF",
              id: "06:2B:E0:4C:71:DF"
            }]);
          }
        );
      } else {
        // Mock untuk desktop testing
        resolve([{ name: "RPP02N (Mock)", address: "06:2B:E0:4C:71:DF", id: "1" }]);
      }
    });
  }

  /**
   * Shortcuts untuk mencetak struk menggunakan Template
   */
  /**
   * Mencetak struk percobaan untuk testing koneksi
   */
  async printTestPage(): Promise<void> {
    const encoder = new EscPosEncoder();
    const data = encoder
      .initialize()
      .codepage('windows1252')
      .raw([0x1B, 0x61, 0x01]) // ESC a 1 (Center)
      .text('--- UJI COBA CETAK ---')
      .newline()
      .text('KEDAI ELVERA 57')
      .newline()
      .text('--------------------------------')
      .newline()
      .raw([0x1B, 0x61, 0x00]) // ESC a 0 (Left)
      .text('Status: Printer Terhubung')
      .newline()
      .text('Waktu : ' + new Date().toLocaleString())
      .newline()
      .text('--------------------------------')
      .newline()
      .newline()
      .newline()
      .newline()
      .newline()
      .encode();

    await this.printRaw(data.buffer);
  }

  async printTransaction(tx: Transaction) {
    const data = ReceiptTemplate.generateTransaction(tx);
    await this.printRaw(data.buffer);
  }

  async printKitchen(order: Order) {
    const data = ReceiptTemplate.generateKitchen(order);
    await this.printRaw(data.buffer);
  }

  /**
   * Mencetak laporan closing shift (Data Mock Sesuai Foto User)
   */
  async printClosingReport(): Promise<void> {
    const dummyData = {
      bulan: "2026-05",
      kasir: "Admin",
      startTime: "10/05/2026, 12:48:44",
      endTime: "10/05/2026, 12:48:44",
      terjual: 74,
      items: [
        { name: "NASI PUTIH", qty: 30 },
        { name: "ES TEH MANIS", qty: 23 },
        { name: "AYAM GORENG", qty: 20 },
        { name: "SOTO AYAM CAMPUR", qty: 15 },
        { name: "MANGUT", qty: 13 },
        { name: "RAWON", qty: 11 },
        { name: "AIR MINERAL", qty: 10 },
        { name: "SOTO AYAM PISAH", qty: 9 },
        { name: "AYAM GORENG TNP NASI", qty: 9 },
        { name: "TAHU GIMBAL", qty: 8 },
        { name: "BAKMIE GODOG ELVERA", qty: 5 },
        { name: "BAKMIE GORENG ELVERA", qty: 5 },
        { name: "AYAM GORENG ELVERA+NASI", qty: 3 },
        { name: "BAKMIE GORENG", qty: 3 },
        { name: "NASI GORENG SPECIAL", qty: 2 },
        { name: "KOPI", qty: 1 },
        { name: "NASI AYAM GORENG", qty: 1 },
        { name: "NASI GORENG", qty: 1 },
        { name: "NASI RAWON", qty: 1 },
        { name: "SOTO AYAM TNP NASI", qty: 1 },
        { name: "SOTO SEMARANG CAMPUR", qty: 1 },
      ],
      totalVoid: 0,
      pemasukan: {
        qris: 1198000,
        debit: 402000,
        tunai: 658000,
        total: 2258000
      },
      kasKecil: {
        awal: 0,
        saldo: 2258000,
        total: 2258000
      }
    };

    const data = ReceiptTemplate.generateClosingReport(dummyData);
    await this.printRaw(data.buffer);
  }

  /**
   * Fungsi antrean untuk mencetak semua struk secara berurutan
   * agar tidak terjadi bentrokan data pada printer Bluetooth.
   */
  async printAll(tx: Transaction): Promise<void> {
    try {
      if (!this.isConnected) {
        toast.error("Printer belum terhubung.");
        return;
      }
      
      // 1. Cetak Struk Konsumen
      await this.printTransaction(tx);
      
      // 2. Jeda agar printer siap untuk slip berikutnya
      await new Promise(r => setTimeout(r, 800)); 
      
      // 3. Cetak Struk Dapur
      const kitchenOrder = {
        id: tx.id,
        items: tx.items,
        tableId: tx.table_id || 'Take Away',
        created_at: tx.created_at
      } as any;
      
      await this.printKitchen(kitchenOrder);
    } catch (err) {
      console.error("Print sequence error:", err);
      toast.error("Gagal mencetak otomatis. Silahkan gunakan tombol Cetak Ulang.");
    }
  }

  async disconnect() {
    if (this.serialWriter) {
      await this.serialWriter.releaseLock();
      await this.serialPort.close();
      this.serialWriter = null;
    } else if (typeof bluetoothSerial !== 'undefined') {
      this.isConnected = false;
  }
}
}

export const printService = new PrintService();
