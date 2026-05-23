
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

// Register the PWA service worker with premium interactive toast notifications
if ("serviceWorker" in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast.info("Pembaruan Aplikasi Tersedia", {
        description: "Versi terbaru siap digunakan untuk performa maksimal.",
        action: {
          label: "Muat Ulang",
          onClick: () => {
            updateSW(true);
          }
        },
        duration: Infinity, // Keep it visible until the user decides
        position: "bottom-center",
        style: { fontSize: "11px", fontWeight: "bold", border: "1px solid rgba(167, 109, 51, 0.3)" }
      });
    },
    onOfflineReady() {
      toast.success("Mode Offline Aktif!", {
        description: "Menu digital dapat diakses tanpa koneksi internet.",
        duration: 5000,
        position: "bottom-center",
        style: { fontSize: "10px" }
      });
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);





