
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registerSW } from "virtual:pwa-register";

// Register the PWA service worker safely without early DOM/React dependencies
if ("serviceWorker" in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Expose the update function globally and dispatch an event for React
      (window as any).pwaUpdateSW = updateSW;
      window.dispatchEvent(new Event("pwa_update"));
    },
    onOfflineReady() {
      window.dispatchEvent(new Event("pwa_offline"));
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);





