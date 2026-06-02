import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registerSW } from "virtual:pwa-register";

// Daftarkan PWA Service Worker
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);





