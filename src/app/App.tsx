import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { StoreProvider } from "./context/StoreContext";
import { useThemeStore } from "./hooks/useThemeStore";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

export default function App() {
  useThemeStore(); // Registers root listener for instant theme changes across all pages

  useEffect(() => {
    const handlePwaUpdate = () => {
      toast.info("Pembaruan Aplikasi Tersedia", {
        description: "Versi terbaru siap digunakan untuk performa maksimal.",
        action: {
          label: "Muat Ulang",
          onClick: () => {
            if ((window as any).pwaUpdateSW) {
              (window as any).pwaUpdateSW(true);
            } else {
              window.location.reload();
            }
          }
        },
        duration: Infinity, // Keep it visible until user action
        position: "bottom-center",
        style: { fontSize: "11px", fontWeight: "bold", border: "1px solid rgba(167, 109, 51, 0.3)" }
      });
    };

    const handlePwaOffline = () => {
      toast.success("Mode Offline Aktif!", {
        description: "Menu digital dapat diakses tanpa koneksi internet.",
        duration: 5000,
        position: "bottom-center",
        style: { fontSize: "10px" }
      });
    };

    window.addEventListener("pwa_update", handlePwaUpdate);
    window.addEventListener("pwa_offline", handlePwaOffline);

    return () => {
      window.removeEventListener("pwa_update", handlePwaUpdate);
      window.removeEventListener("pwa_offline", handlePwaOffline);
    };
  }, []);

  return (
    <StoreProvider>
      <RouterProvider router={router} />
      <Toaster />
    </StoreProvider>
  );
}
