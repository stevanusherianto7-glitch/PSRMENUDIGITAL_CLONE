/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI DRIVER KOMUNIKASI BLUETOOTH UNTUK PRINTER THERMAL 58MM.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN PRINTER TIDAK MERESPON ATAU CETAKAN BERANTAKAN. ⚠️
 */

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
  private connectedAddress: string | null = null;
  private serialPort: any = null;
  private serialWriter: any = null;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private heartbeatInterval: any = null;
  
  // HARDCODE MAC PRINTER ANDA
  private readonly DEFAULT_MAC = '06:2B:E0:4C:71:DF';
  private readonly DEFAULT_NAME = 'RPP02N';

  constructor() {
    this.autoReconnectWebSerial();
    this.autoReconnectBluetooth();
    this.startConnectionHeartbeat();
    this.setupWebSerialHotplugListeners();
  }

  private async autoReconnectBluetooth() {
    const isBluetooth = typeof bluetoothSerial !== 'undefined';
    if (!isBluetooth) return;

    // Tunggu 3 detik setelah startup agar Bluetooth Stack siap
    setTimeout(async () => {
      try {
        const enabled = await this.isBluetoothEnabled();
        if (!enabled) {
          console.log("[PrintService] Bluetooth is disabled. Skipping auto-reconnect.");
          return;
        }

        let targetAddress = typeof localStorage !== 'undefined' ? localStorage.getItem("connectedPrinterAddress") : null;
        if (!targetAddress) {
          console.log("[PrintService] No saved printer address. Scanning paired devices for RPP02N...");
          targetAddress = await this.findPairedRPPAddress();
        }

        if (targetAddress) {
          if (targetAddress === 'rawbt-intent') {
            this.setConnected(true);
            this.connectedAddress = 'rawbt-intent';
            console.log("[PrintService] RawBT intent route restored.");
            return;
          }

          console.log(`[PrintService] Found target printer: ${targetAddress}. Auto-connecting...`);
          
          if (this.isConnected && this.connectedAddress !== targetAddress) {
            const bt = (window as any).bluetoothSerial || (typeof bluetoothSerial !== 'undefined' ? bluetoothSerial : null);
            if (bt) {
              await new Promise((resolve) => {
                bt.disconnect(() => resolve(true), () => resolve(true));
              });
            }
            this.setConnected(false);
            this.connectedAddress = null;
          }

          bluetoothSerial.connectInsecure(
            targetAddress,
            () => {
              this.setConnected(true);
              this.connectedAddress = targetAddress;
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem("connectedPrinterAddress", targetAddress!);
              }
              console.log("[PrintService] Bluetooth printer auto-connected successfully on startup.");
            },
            (err) => {
              console.warn("[PrintService] Bluetooth auto-connect on startup failed:", err);
            }
          );
        }
      } catch (err) {
        console.warn("[PrintService] Background auto-connect error:", err);
      }
    }, 3000);
  }

  /** Mencari MAC address RPP02N/Thermal printer secara dinamis dari daftar paired devices */
  private async findPairedRPPAddress(): Promise<string | null> {
    if (typeof bluetoothSerial === 'undefined') return null;
    return new Promise((resolve) => {
      const listTimeout = setTimeout(() => resolve(null), 2000);
      bluetoothSerial.list(
        (devices) => {
          clearTimeout(listTimeout);
          if (!devices || devices.length === 0) {
            resolve(null);
            return;
          }
          
          // 1. Prioritas Utama: Nama printer mengandung 'RPP02N' atau 'RPP'
          let found = devices.find((d: any) => 
            d.name && (d.name.toUpperCase().includes('RPP02N') || d.name.toUpperCase().includes('RPP'))
          );
          if (found) {
            resolve(found.address);
            return;
          }

          // 2. Prioritas Kedua: Kata kunci thermal printer umum lainnya
          const keywords = ['THERMAL', 'PRINTER', '58MM', '58PRINTER', 'MTP', 'POS', 'BT-PRINTER'];
          found = devices.find((d: any) => 
            d.name && keywords.some(kw => d.name.toUpperCase().includes(kw))
          );
          if (found) {
            resolve(found.address);
            return;
          }

          // 3. Fallback: Gunakan device pertama dari list paired jika ada
          if (devices[0] && devices[0].address) {
            resolve(devices[0].address);
            return;
          }

          resolve(null);
        },
        () => {
          clearTimeout(listTimeout);
          resolve(null);
        }
      );
    });
  }

  private setupWebSerialHotplugListeners() {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      // Event saat device dicolokkan (plugged in)
      (navigator as any).serial.addEventListener("connect", (event: any) => {
        console.log("[PrintService] Port connected:", event.target);
        toast.info("Perangkat Serial terdeteksi dicolokkan. Menghubungkan...");
        this.autoReconnectWebSerial();
      });

      // Event saat device dicabut (unplugged)
      (navigator as any).serial.addEventListener("disconnect", (event: any) => {
        console.log("[PrintService] Port disconnected:", event.target);
        if (this.serialPort === event.target) {
          this.serialWriter = null;
          this.serialPort = null;
          this.setConnected(false);
          toast.error("Printer Serial dicabut / terputus.");
        }
      });
    }
  }

  private startConnectionHeartbeat() {
    if (typeof window !== 'undefined') {
      this.heartbeatInterval = setInterval(() => {
        this.checkRealtimeConnection();
      }, 5000);
    }
  }

  private async checkRealtimeConnection() {
    if (typeof bluetoothSerial !== 'undefined' && this.isConnected) {
      if (this.connectedAddress === 'rawbt-intent') {
        // RawBT intent is stateless, always assume healthy
        return;
      }
      bluetoothSerial.isConnected(
        () => {
          // connection still healthy
        },
        () => {
          // connection lost!
          this.setConnected(false);
          toast.error("Koneksi printer Bluetooth terputus.");
        }
      );
    } else if (this.serialPort && this.isConnected) {
      // Cek apakah serial port masih terbuka dan writable
      const isClosed = !this.serialPort.readable || !this.serialPort.writable;
      if (isClosed) {
        this.serialWriter = null;
        this.serialPort = null;
        this.setConnected(false);
        toast.error("Printer Serial tidak merespon / terputus.");
      }
    }
  }

  private async autoReconnectWebSerial() {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      try {
        const ports = await (navigator as any).serial.getPorts();
        if (ports && ports.length > 0) {
          const port = ports[0];
          await port.open({ baudRate: 9600 });
          this.serialPort = port;
          this.serialWriter = port.writable.getWriter();
          this.setConnected(true);
          this.connectedAddress = 'web-serial';
          console.log("[PrintService] Auto-reconnected to Web Serial printer.");
        }
      } catch (e) {
        console.warn("[PrintService] Auto-reconnect failed:", e);
      }
    }
  }

  public getIsConnected() { return this.isConnected; }
  public getConnectedAddress() { return this.connectedAddress; }
  public getDefaultMac() { return this.DEFAULT_MAC; }

  /** Subscribe untuk perubahan status koneksi printer */
  public onConnectionChange(listener: (connected: boolean) => void) {
    this.connectionListeners.add(listener);
    return () => { this.connectionListeners.delete(listener); };
  }

  private setConnected(value: boolean) {
    this.isConnected = value;
    this.connectionListeners.forEach(fn => fn(value));
  }

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
                name: this.DEFAULT_NAME,
                address: this.DEFAULT_MAC,
                id: this.DEFAULT_MAC
              });
            }
            resolve(devices);
          }, 
          () => resolve([{
            name: this.DEFAULT_NAME,
            address: this.DEFAULT_MAC,
            id: this.DEFAULT_MAC
          }])
        );
      });
    }
    // JIKA DI BROWSER: PAKSA MUNCUL (Agar Tahan Banting)
    return [
      { id: 'rawbt-intent', name: 'Gunakan RawBT (Android Web Intent)', address: 'rawbt-intent' },
      { id: 'web-serial', name: 'Gunakan Web Serial (Pilih Port Manual)', address: 'web-serial' }
    ];
  }

  /**
   * Koneksi ke Printer
   */
  async connect(address: string): Promise<boolean> {
    try {
      // 1. RawBT Web Intent Route (Android PWA)
      if (address === 'rawbt-intent') {
        this.setConnected(true);
        this.connectedAddress = 'rawbt-intent';
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem("connectedPrinterAddress", 'rawbt-intent');
        }
        toast.success("Mode RawBT Web Intent diaktifkan.");
        return true;
      }

      // Web Serial (Chrome/Edge/Desktop)
      if (address === 'web-serial' || (typeof bluetoothSerial === 'undefined')) {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        this.serialPort = port;
        this.serialWriter = port.writable.getWriter();
        this.setConnected(true);
        this.connectedAddress = 'web-serial';
        toast.success("Printer Serial terhubung.");
        return true;
      }

      // Cek apakah Bluetooth Aktif sebelum koneksi
      const enabled = await this.isBluetoothEnabled();
      if (!enabled) {
        toast.error("Bluetooth mati. Harap aktifkan Bluetooth terlebih dahulu.");
        return false;
      }

      // Capacitor Bluetooth (Android)
      return new Promise((resolve) => {
        // Set timeout manual untuk koneksi agar tidak hang selamanya
        const connectionTimeout = setTimeout(() => {
          this.setConnected(false);
          this.connectedAddress = null;
          toast.error("Koneksi timeout. Pastikan printer nyala.");
          resolve(false);
        }, 15000);

        bluetoothSerial.connectInsecure(address,
          () => {
            clearTimeout(connectionTimeout);
            this.setConnected(true);
            this.connectedAddress = address;
            toast.success("Printer Bluetooth terhubung.");
            resolve(true);
          }, 
          (err) => {
            clearTimeout(connectionTimeout);
            this.setConnected(false);
            this.connectedAddress = null;
            toast.error("Gagal koneksi: " + err);
            resolve(false);
          }
        );
      });
    } catch (err) {
      console.error(err);
      toast.error("Error sistem koneksi: " + (err as Error).message);
      return false;
    }
  }

  /**
   * Kirim Data ke Printer dengan alur: Connect -> Write -> Disconnect
   * Dilengkapi sistem Auto-Retry (Maksimal 3x) agar tahan banting (Robust) terhadap koneksi tidak stabil.
   */
  async printRaw(data: Uint8Array, address?: string): Promise<void> {
    const cleanBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const isBluetooth = typeof bluetoothSerial !== 'undefined';
    const MAX_RETRIES = 3;
    let attempt = 0;

    // Resolve target address secara dinamis
    let targetAddress = address;
    if (!targetAddress || targetAddress === this.DEFAULT_MAC) {
      const savedAddress = typeof localStorage !== 'undefined' ? localStorage.getItem("connectedPrinterAddress") : null;
      if (savedAddress) {
        targetAddress = savedAddress;
      } else {
        const dynamicAddress = isBluetooth ? await this.findPairedRPPAddress() : null;
        targetAddress = dynamicAddress || this.DEFAULT_MAC;
      }
    }

    // 0. CHECK RAWBT INTENT ROUTE
    if (targetAddress === 'rawbt-intent') {
      try {
        let binary = "";
        const len = data.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(data[i]);
        }
        const base64Data = typeof btoa !== 'undefined' 
          ? btoa(binary) 
          : Buffer.from(data).toString('base64');
        const encodedData = encodeURIComponent(base64Data);
        const intentUrl = `intent:base64,${encodedData}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
        
        console.log("[PrintService] Printing via RawBT intent...");
        if (typeof window !== 'undefined') {
          window.location.href = intentUrl;
          toast.success("Membuka RawBT untuk mencetak...");
        }
        return;
      } catch (err) {
        console.error("RawBT Intent Print Error:", err);
        toast.error("Gagal cetak via RawBT: " + (err as Error).message);
        throw err;
      }
    }

    while (attempt < MAX_RETRIES) {
      try {
        attempt++;
        if (attempt > 1) {
          console.warn(`[Printer] Mencoba menyambungkan ulang... (Percobaan ${attempt}/${MAX_RETRIES})`);
          toast.loading(`Mencoba ulang koneksi printer (${attempt}/${MAX_RETRIES})...`);
        }

        // 1. BUKA SOKET (Connect)
        if (isBluetooth) {
          if (!this.isConnected || this.connectedAddress !== targetAddress) {
            // Jika status terhubung tapi ke alamat yang berbeda, putuskan dulu
            if (this.isConnected) {
              const bt = (window as any).bluetoothSerial || (typeof bluetoothSerial !== 'undefined' ? bluetoothSerial : null);
              if (bt) {
                await new Promise((resolve) => {
                  bt.disconnect(() => resolve(true), () => resolve(true));
                });
              }
              this.setConnected(false);
              this.connectedAddress = null;
            }

            await new Promise((resolve, reject) => {
              bluetoothSerial.connectInsecure(targetAddress,
                () => resolve(true),
                (err) => reject(new Error("Gagal membuka soket: " + err))
              );
            });
            this.setConnected(true);
            this.connectedAddress = targetAddress;
          }
        } else if (typeof navigator !== 'undefined' && 'serial' in navigator) {
          // Web Serial fallback
          if (!this.serialPort) {
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate: 9600 });
            this.serialPort = port;
            this.serialWriter = port.writable.getWriter();
            this.connectedAddress = 'web-serial';
          }
          this.setConnected(true);
        }

        // 2. KIRIM DATA (Write)
        if (isBluetooth) {
          await new Promise((resolve, reject) => {
            bluetoothSerial.write(cleanBuffer,
              () => resolve(true),
              (err) => reject(new Error("Gagal mengirim data: " + err))
            );
          });
        } else if (this.serialWriter) {
          await this.serialWriter.write(data);
        }

        // Beri jeda sangat singkat agar buffer terkirim ke hardware
        await new Promise(r => setTimeout(r, 500));

        // Jika berhasil sampai sini, KELUAR DARI LOOP (sukses). Biarkan printer TETAP ONLINE.
        if (attempt > 1) toast.success("Printer berhasil terhubung kembali!");
        return;

      } catch (err) {
        console.error(`Print attempt ${attempt} failed:`, err);
        
        // JIKA GAGAL, baru kita tutup port (disconnect) untuk mereset state sebelum mencoba lagi
        if (isBluetooth) {
          const bt = (window as any).bluetoothSerial || (typeof bluetoothSerial !== 'undefined' ? bluetoothSerial : null);
          if (bt) {
            bt.disconnect(() => {}, () => {});
          }
          this.setConnected(false);
          this.connectedAddress = null;
        }
        
        // Jika sudah mentok 3 kali, lemparkan error ke UI
        if (attempt >= MAX_RETRIES) {
          toast.error("Printer gagal merespon setelah 3x percobaan. Pastikan mesin menyala.");
          throw err;
        }

        // Beri jeda 2 detik sebelum mencoba lagi (Recovery Time)
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  /**
   * Cek status Bluetooth (On/Off) dengan proteksi timeout
   * Sekaligus memancing izin di Android 12+
   */
  async isBluetoothEnabled(): Promise<boolean> {
    if (typeof bluetoothSerial === 'undefined') {
      return true; // Mock browser
    }
    
    // Pancing izin dengan list (Opsional tapi sering membantu di Android 12+)
    try { bluetoothSerial.list(() => {}, () => {}); } catch (e) { /* ignore */ }

    return new Promise((resolve) => {
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
              name: this.DEFAULT_NAME,
              address: this.DEFAULT_MAC,
              id: this.DEFAULT_MAC
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
              name: this.DEFAULT_NAME,
              address: this.DEFAULT_MAC,
              id: this.DEFAULT_MAC
            }]);
          }
        );
      } else {
        // Mock untuk desktop testing / browser PWA
        resolve([
          { name: this.DEFAULT_NAME, address: this.DEFAULT_MAC, id: "1" },
          { name: 'Gunakan RawBT (Android Web Intent)', address: 'rawbt-intent', id: 'rawbt-intent' }
        ]);
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
      .text('PAWON SALAM')
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

    await this.printRaw(data);
  }

  async printTransaction(tx: Transaction) {
    const data = ReceiptTemplate.generateTransaction(tx);
    await this.printRaw(data);
  }

  async printKitchen(order: Order) {
    const receipts = ReceiptTemplate.generateKitchenSplit(order);
    
    for (let i = 0; i < receipts.length; i++) {
      if (i > 0) {
        // Jeda 1 detik antar struk agar printer tidak bentrok
        await new Promise(r => setTimeout(r, 1000));
      }
      await this.printRaw(receipts[i]);
    }
  }

  /**
   * Mencetak laporan closing shift.
   * Menerima data real dari LaporanModule. Jika tidak ada parameter, gunakan data dummy untuk testing.
   */
  async printClosingReport(realData?: {
    bulan: string;
    kasir: string;
    startTime: string;
    endTime: string;
    terjual: number;
    items: { name: string; qty: number }[];
    totalVoid: number;
    pemasukan: { qris: number; debit: number; tunai: number; total: number };
    kasKecil: { awal: number; saldo: number; total: number };
  }): Promise<void> {
    const data = realData || {
      bulan: new Date().toISOString().slice(0, 7),
      kasir: "Admin",
      startTime: new Date().toLocaleString("id-ID"),
      endTime: new Date().toLocaleString("id-ID"),
      terjual: 0,
      items: [],
      totalVoid: 0,
      pemasukan: { qris: 0, debit: 0, tunai: 0, total: 0 },
      kasKecil: { awal: 0, saldo: 0, total: 0 }
    };

    const printData = ReceiptTemplate.generateClosingReport(data);
    await this.printRaw(printData);
  }

  /**
   * Auto-print saat pembayaran — HANYA struk customer.
   * Struk dapur dicetak terpisah via tombol "Kitchen" di UI.
   */
  async printAll(tx: Transaction): Promise<void> {
    const toastId = toast.loading("Menyiapkan printer...");

    try {
      const enabled = await this.isBluetoothEnabled();
      if (!enabled) {
        toast.error("Bluetooth non-aktif", { id: toastId });
        return;
      }
      
      toast.loading("Mencetak Struk Konsumen...", { id: toastId });
      await this.printTransaction(tx);
      toast.success("Struk konsumen berhasil dicetak", { id: toastId });
    } catch (err) {
      console.error("Print error:", err);
      toast.error("Gagal cetak otomatis. Gunakan tombol Cetak Ulang.", { id: toastId });
    }
  }

  async disconnect() {
    try {
      if (this.serialWriter) {
        try { await this.serialWriter.releaseLock(); } catch (e) { /* ignore */ }
        this.serialWriter = null;
      }
      if (this.serialPort) {
        try { await this.serialPort.close(); } catch (e) { /* ignore */ }
        this.serialPort = null;
      }
      
      const bt = (window as any).bluetoothSerial || (typeof bluetoothSerial !== 'undefined' ? bluetoothSerial : null);
      if (bt) {
        await new Promise<void>((resolve) => {
          bt.disconnect(
            () => {
              console.log("Bluetooth disconnected successfully.");
              resolve();
            },
            (err: any) => {
              console.error("Bluetooth disconnect error:", err);
              resolve(); // Resolve anyway to prevent hanging
            }
          );
        });
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      this.setConnected(false);
      this.connectedAddress = null;
    }
  }
}

export const printService = new PrintService();
