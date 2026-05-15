import { createHashRouter } from "react-router-dom";
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
        <p className="text-6xl font-bold text-muted-foreground/20 font-poppins">404</p>
        <p className="text-foreground font-semibold">Halaman tidak ditemukan</p>
        <a href="/" className="text-xs text-primary hover:text-indigo-400">Kembali ke Login</a>
      </div>
    </div>
  );
}

// Routes configuration
export const router = createHashRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/admin",
    Component: AdminPage,
  },
  {
    path: "/transaksi",
    Component: AdminPage,
  },
  {
    path: "/orders",
    Component: AdminPage,
  },
  {
    path: "/kasir",
    Component: AdminPage,
  },
  {
    path: "/meja",
    Component: AdminPage,
  },
  {
    path: "/menu",
    Component: AdminPage,
  },
  {
    path: "/promo",
    Component: AdminPage,
  },
  {
    path: "/qr-menu",
    Component: AdminPage,
  },
  {
    path: "/stok",
    Component: AdminPage,
  },
  {
    path: "/metrics",
    Component: AdminPage,
  },
  {
    path: "/sdm",
    Component: AdminPage,
  },
  {
    path: "/hpp",
    Component: AdminPage,
  },
  {
    path: "/waiter",
    Component: WaiterPage,
  },
  {
    path: "/kitchen",
    Component: KitchenPage,
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

// Export RouterProvider-ready router for React 19
export default router;
