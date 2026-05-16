import { useState, useEffect } from "react";
import { X, Printer, RefreshCw, Bluetooth, AlertTriangle } from "lucide-react";
import { printService, BluetoothDevice } from "../../utils/printService";
import { toast } from "sonner";

interface PrinterSettingsModalProps {
  onClose: () => void;
}

export function PrinterSettingsModal({ onClose }: PrinterSettingsModalProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(
    printService.getIsConnected() ? localStorage.getItem("connectedPrinterAddress") : null
  );
  const [printing, setPrinting] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  useEffect(() => {
    checkBluetooth();
  }, []);

  useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      // Prioritaskan RPP02N jika ada di daftar
      const rpp02n = devices.find(d => d.address === "06:2B:E0:4C:71:DF");
      if (rpp02n) {
        setSelectedDevice(rpp02n.address);
      } else {
        setSelectedDevice(devices[0].address);
      }
    }
  }, [devices, selectedDevice]);

  async function checkBluetooth() {
    // Memancing pop-up izin di Android 12+ dengan memanggil listPairedDevices
    try {
      await printService.listPairedDevices();
    } catch (e) {
      console.log("Permission trigger failed or cancelled:", e);
    }

    const enabled = await printService.isBluetoothEnabled();
    setIsEnabled(enabled);
    if (enabled) {
      loadDevices();
    }
  }

  async function loadDevices() {
    setScanning(true);
    try {
      const paired = await printService.listPairedDevices();
      setDevices(paired);
    } catch (error) {
      toast.error("Gagal memuat perangkat Bluetooth");
    } finally {
      setScanning(false);
    }
  }

  async function handleConnect(e: React.MouseEvent, address: string) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setConnecting(address);
    try {
      const success = await printService.connect(address);
      if (success) {
        setConnectedAddress(address);
        localStorage.setItem("connectedPrinterAddress", address);
        toast.success("Printer berhasil terhubung!");
      } else {
        toast.error("Gagal terhubung ke printer");
      }
    } catch (error) {
      toast.error("Error: " + (error as Error).message);
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect(e: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await printService.disconnect();
      setConnectedAddress(null);
      localStorage.removeItem("connectedPrinterAddress");
      toast.success("Koneksi printer diputuskan");
    } catch (error) {
      toast.error("Gagal memutuskan koneksi");
    }
  }

  async function handleTestPrint(e: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setPrinting(true);
    try {
      // Sederhanakan: Langsung cetak saja. 
      // Jika belum terhubung, printService.printRaw akan memberikan Toast peringatan secara internal.
      await printService.printTestPage();
      toast.success("Struk tes berhasil dikirim");
    } catch (error) {
      console.error("Test print error:", error);
      toast.error("Gagal mencetak: " + (error as Error).message);
    } finally {
      setPrinting(false);
    }
  }

  const isPrinterConnected = printService.getIsConnected();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-bold text-base text-foreground font-poppins flex items-center gap-2">
              <Printer size={18} className="text-primary" /> Pengaturan Printer
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hubungkan ke printer thermal 58mm
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Status Bluetooth */}
          <div className={`flex items-center justify-between p-3 rounded-xl border ${isEnabled ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
            <div className="flex items-center gap-2">
              <Bluetooth size={16} className={isEnabled ? "text-green-500" : "text-amber-500"} />
              <div>
                <p className="text-sm font-semibold text-foreground">Bluetooth</p>
                <p className="text-[10px] text-muted-foreground">
                  {isEnabled ? "Aktif & siap digunakan" : "Belum aktif di perangkat"}
                </p>
              </div>
            </div>
            {!isEnabled && (
              <button
                type="button"
                onClick={checkBluetooth}
                className="text-xs font-semibold text-amber-500 hover:text-amber-600"
              >
                Cek Lagi
              </button>
            )}
          </div>

          {/* List Devices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground">
                Perangkat Tersedia (Paired)
              </label>
              <button
                type="button"
                onClick={loadDevices}
                disabled={scanning || !isEnabled}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={14} className={scanning ? "animate-spin" : ""} />
              </button>
            </div>

            {!isEnabled ? (
              <div className="text-center py-6 text-xs text-muted-foreground bg-secondary/50 rounded-xl border border-dashed border-border">
                Aktifkan Bluetooth untuk melihat perangkat
              </div>
            ) : scanning ? (
              <div className="space-y-2">
                <div className="animate-pulse bg-secondary h-12 w-full rounded-xl" />
                <div className="animate-pulse bg-secondary h-12 w-full rounded-xl" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground bg-secondary/50 rounded-xl border border-dashed border-border">
                Tidak ada perangkat yang ditemukan.<br />Pastikan printer sudah di-pairing di pengaturan Android.
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 relative group">
                  <select
                    value={selectedDevice}
                    aria-label="Pilih perangkat printer"
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    disabled={scanning || connecting !== null || connectedAddress !== null}
                    className="w-full bg-secondary/80 border border-border rounded-xl px-4 py-3 text-xs font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>-- Pilih Perangkat --</option>
                    {devices.map((device) => (
                      <option key={device.address} value={device.address} className="bg-card py-2">
                        {device.name || "Unknown"} ({device.address})
                      </option>
                    ))}
                  </select>
                </div>

                {connectedAddress && isPrinterConnected ? (
                  <button
                    type="button"
                    onClick={(e) => handleDisconnect(e)}
                    className="px-6 py-3 rounded-xl bg-red-500 text-white text-xs font-black shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center gap-2"
                  >
                    <X size={14} /> Putuskan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      // Jika dropdown kosong, gunakan HARDCODE MAC RPP02N sebagai default
                      const targetAddress = selectedDevice || '06:2B:E0:4C:71:DF';
                      handleConnect(e, targetAddress);
                    }}
                    disabled={connecting !== null}
                    className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-black shadow-xl shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2 min-w-[120px] justify-center"
                  >
                    {connecting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Sedang Menghubungkan...
                      </>
                    ) : (
                      <>Hubungkan</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={(e) => handleTestPrint(e)}
              disabled={printing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary border-2 border-primary/20 text-xs font-black text-primary hover:bg-primary/5 transition-all"
            >
              {printing ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Printer size={14} />
              )}
              CETAK STRUK TES
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <AlertTriangle size={10} className="text-amber-500" />
            Format dioptimalkan untuk lebar 58mm (32 kolom)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
