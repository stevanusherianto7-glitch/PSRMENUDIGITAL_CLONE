import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import KitchenPage from "./pages/KitchenPage";
import WaiterPage from "./pages/WaiterPage";
import GuestMenuPage from "./pages/GuestMenuPage";
import QRStickerPage from "./pages/QRStickerPage";

function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-center p-6">
      <div className="space-y-3">
        <p className="text-6xl font-bold text-muted-foreground/20" style={{ fontFamily: "Poppins" }}>404</p>
        <p className="text-foreground font-semibold">Halaman tidak ditemukan</p>
        <a href="/" className="text-xs text-primary hover:text-indigo-400">Kembali ke Login</a>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/admin",
    Component: AdminPage,
  },
  {
    path: "/waiter",
    Component: WaiterPage,
  },
  {
    path: "/kitchen",
    Component: WaiterPage,
  },
  {
    path: "/menu/:tableId",
    Component: GuestMenuPage,
  },
  {
    path: "/qr-stickers",
    Component: QRStickerPage,
  },
  {
    path: "*",
    Component: NotFound,
  },
]);