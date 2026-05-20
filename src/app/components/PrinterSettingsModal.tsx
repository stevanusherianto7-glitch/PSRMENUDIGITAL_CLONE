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
      // 1. Prioritaskan alamat printer yang tersimpan di localStorage jika ada di list
      const savedAddress = localStorage.getItem("connectedPrinterAddress");
      const savedDevice = devices.find(d => d.address === savedAddress);
      if (savedDevice) {
        setSelectedDevice(savedDevice.address);
      } else {
        // 2. Prioritaskan RPP02N / RPP jika ada di daftar
        const rppDevice = devices.find(d => 
          d.name && (d.name.toUpperCase().includes('RPP02N') || d.name.toUpperCase().includes('RPP'))
        );
        if (rppDevice) {
          setSelectedDevice(rppDevice.address);
        } else {
          // 3. Fallback ke perangkat pertama di daftar
          setSelectedDevice(devices[0].address);
        }
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950/90 border border-white/10 rounded-[28px] w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 flex-shrink-0 bg-white/[0.02]">
          <div>
            <h2 className="font-black text-sm text-foreground uppercase tracking-widest flex items-center gap-2">
              <Printer size={16} className="text-primary" /> Pengaturan Printer
            </h2>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter">
              Konektivitas Thermal Receipt 58mm
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all duration-300" 
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6 custom-scrollbar">
          {/* Status Bluetooth */}
          <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 relative overflow-hidden ${
            isEnabled 
              ? "border-green-500/20 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.05)]" 
              : "border-amber-500/20 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
          }`}>
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                {isEnabled && (
                  <span className="absolute -inset-1 rounded-full bg-green-500/30 blur animate-ping duration-1000" />
                )}
                <div className={`p-2.5 rounded-xl ${isEnabled ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                  <Bluetooth size={16} />
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-foreground">Bluetooth System</p>
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter mt-1">
                  {isEnabled ? "Hardware status: Armed & Ready" : "Hardware status: Offline / Perm. Denied"}
                </p>
              </div>
            </div>
            {!isEnabled && (
              <button
                type="button"
                onClick={checkBluetooth}
                className="text-[9px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all hover:scale-[1.02]"
              >
                Cek Izin
              </button>
            )}
          </div>

          {/* List Devices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Perangkat Tersedia (Paired)
              </label>
              <button
                type="button"
                onClick={loadDevices}
                disabled={scanning || !isEnabled}
                className="p-1.5 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-all duration-300"
                title="Refresh"
              >
                <RefreshCw size={14} className={scanning ? "animate-spin" : ""} />
              </button>
            </div>

            {!isEnabled ? (
              <div className="text-center py-8 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
                Aktifkan Bluetooth untuk mendeteksi printer
              </div>
            ) : scanning ? (
              <div className="space-y-3">
                <div className="animate-pulse bg-white/[0.02] border border-white/5 h-16 w-full rounded-2xl" />
                <div className="animate-pulse bg-white/[0.02] border border-white/5 h-16 w-full rounded-2xl" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground bg-white/[0.02] rounded-2xl border border-dashed border-white/5 px-4">
                Tidak ada printer terdeteksi.<br />
                <span className="text-[9px] font-bold text-amber-500 lowercase tracking-normal block mt-1">
                  Harap pairing printer thermal Anda di Settings Android / PC terlebih dahulu.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {devices.map((device) => {
                  const isSelected = selectedDevice === device.address;
                  const isCurrentConnection = connectedAddress === device.address && isPrinterConnected;
                  const isThisConnecting = connecting === device.address;

                  return (
                    <button
                      key={device.address}
                      type="button"
                      onClick={(e) => {
                        setSelectedDevice(device.address);
                        if (isCurrentConnection) {
                          handleDisconnect(e);
                        } else if (!isThisConnecting) {
                          handleConnect(e, device.address);
                        }
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                        isCurrentConnection
                          ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                          : isSelected
                          ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                          : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10 hover:text-foreground"
                      }`}
                    >
                      {/* Glow Backdrop Hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`p-2.5 rounded-xl transition-colors duration-300 ${
                          isCurrentConnection 
                            ? "bg-green-500/20 text-green-400" 
                            : isSelected 
                            ? "bg-primary/20 text-primary" 
                            : "bg-white/5 text-muted-foreground"
                        }`}>
                          <Printer size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-wider">{device.name || "Unknown Printer"}</p>
                          <p className="text-[9px] font-mono text-muted-foreground mt-0.5 tracking-widest">{device.address}</p>
                        </div>
                      </div>

                      <div className="relative z-10">
                        {isThisConnecting ? (
                          <RefreshCw size={14} className="animate-spin text-primary" />
                        ) : isCurrentConnection ? (
                          <div className="flex items-center gap-1.5 bg-green-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Connected
                          </div>
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                            Hubungkan
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={(e) => handleTestPrint(e)}
              disabled={printing}
              className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-gradient-to-r from-primary to-orange-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all duration-300"
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
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between flex-shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
            <AlertTriangle size={12} className="text-amber-500" />
            Lebar 58mm (32 kolom)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/20 transition-all duration-300"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
