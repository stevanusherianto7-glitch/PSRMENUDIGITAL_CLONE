// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  available: boolean;
  tag?: string;
  description?: string;
}

export interface CartItem extends MenuItem {
  qty: number;
  notes?: string;
}

export type OrderStatus = "pending" | "cooking" | "ready" | "served" | "cancelled";
export type OrderType = "guest" | "waiter" | "kasir";
export type OrderMode = "dine-in" | "take-away";

export interface Order {
  id: string;
  tableId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  notes?: string;        // catatan untuk chef (contoh: masak pedas, tanpa bawang)
  orderMode: OrderMode;  // dine-in atau take-away
  status: OrderStatus;
  type: OrderType;
  created_at: string;
  updated_at: string;
}

export interface TableData {
  id: string;
  seat: number;
  status: "available" | "occupied" | "service" | "reserved";
  pax?: number;
  total?: number;
  duration?: string;
  orders?: string[];
}

export interface Transaction {
  id: string;
  table_id: string;
  items: CartItem[];
  subtotal: number;
  discount?: number;
  discount_amount?: number;
  tax: number;
  total: number;
  method: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  exp_date: string;
  category: string;
  method: "FIFO" | "LIFO";
  stock: number;
  min_stock: number;
}

export interface Promo {
  id: string;
  name: string;
  description: string;
  discount: number;
  type: "percentage" | "fixed";
  active: boolean;
  min_order?: number;
  valid_until?: string;
  code?: string;
}

export type UserRole = "admin" | "manager" | "owner" | "waiter" | "kitchen";

export interface UserSession {
  role: UserRole;
  name: string;
}

export enum ShiftType {
  PAGI = "PAGI",
  MIDDLE = "MIDDLE",
  LIBUR = "LIBUR",
}

export interface Employee {
  id: string;
  name: string;
  role: string;
}

export interface Attendance {
  employeeId: string;
  date: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';
}