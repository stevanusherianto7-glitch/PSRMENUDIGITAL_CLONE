/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI STATE MANAGEMENT UTAMA (ZUSTAND/CONTEXT) UNTUK PAWON SALAM.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN SYNC DATA ANTAR MODUL TERPUTUS. ⚠️
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Order, MenuItem } from "../types";
import { fetchOrders } from "../api";
import { supabase } from "../../lib/supabase";
import { SEED_MENU } from "../data";

interface StoreContextType {
  orders: Order[];
  menuItems: MenuItem[];
  loadingOrders: boolean;
  loadingMenu: boolean;
  refreshOrders: () => Promise<void>;
  refreshMenu: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // 1. Fetch Orders
  const refreshOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await fetchOrders();
      const active = data.filter(o => o.status !== "served" && o.status !== "cancelled");
      setOrders(active);
    } catch (e) {
      console.error("Failed to fetch orders in context:", e);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // 2. Fetch Menu
  const refreshMenu = useCallback(async () => {
    setLoadingMenu(true);
    try {
      const { data } = await supabase.from("menu_items").select("*");
      if (data && data.length > 0) {
        const dbById = new Map(data.map((r: any) => [r.id, r]));
        const merged: MenuItem[] = SEED_MENU.map(seed => {
          const r: any = dbById.get(seed.id);
          if (!r) return seed;
          return {
            ...seed,
            price: typeof r.price === "number" ? r.price : seed.price,
            available: typeof r.available === "boolean" ? r.available : seed.available,
          };
        });
        const seedIds = new Set(SEED_MENU.map(m => m.id));
        const extras: MenuItem[] = data
          .filter((r: any) => !seedIds.has(r.id))
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            price: r.price,
            image: r.image && (String(r.image).startsWith("http") || String(r.image).startsWith("blob")) ? r.image : "",
            available: r.available,
            tag: r.tag || undefined,
            description: r.description || "",
          }));
        setMenuItems([...merged, ...extras]);
      } else {
        setMenuItems(SEED_MENU);
      }
    } catch (e) {
      console.error("Failed to fetch menu in context:", e);
      setMenuItems(SEED_MENU);
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshOrders();
    refreshMenu();

    // Setup real-time for orders
    const channel = supabase
      .channel("any-orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          refreshOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshOrders, refreshMenu]);

  return (
    <StoreContext.Provider
      value={{
        orders,
        menuItems,
        loadingOrders,
        loadingMenu,
        refreshOrders,
        refreshMenu,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
