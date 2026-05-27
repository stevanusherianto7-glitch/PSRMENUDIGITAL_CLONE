// ─── Shared Types ─────────────────────────────────────────────────────────────

/**
 * Represents a menu item in the restaurant
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display name of the menu item */
  name: string;
  /** Category the item belongs to (Makanan, Minuman, Snack) */
  category: string;
  /** Price in Indonesian Rupiah */
  price: number;
  /** URL or identifier for the item image */
  image: string;
  /** Whether the item is currently available for order */
  available: boolean;
  /** Optional tag for special categorization (e.g., "Best Seller", "Spesial") */
  tag?: string;
  /** Detailed description of the menu item */
  description?: string;
}

/**
 * Cart item with quantity and optional notes
 */
export interface CartItem extends MenuItem {
  /** Quantity of this item in the cart */
  qty: number;
  /** Optional customer notes for this item */
  notes?: string;
}

/**
 * Available order statuses with progression flow
 */
export type OrderStatus = 
  /** Order received and waiting to be processed */
  | "pending" 
  /** Order is being prepared in the kitchen */
  | "cooking" 
  /** Order is ready for serving */
  | "ready" 
  /** Order has been served to customer */
  | "served" 
  /** Order has been cancelled */
  | "cancelled";

/**
 * Order types based on who placed the order
 */
export type OrderType = 
  /** Order placed by guest via QR scan */
  | "guest" 
  /** Order placed by waiter/staff */
  | "waiter" 
  /** Order placed by kasir/cashier */
  | "kasir";

/**
 * Order modes for service type
 */
export type OrderMode = 
  /** Customer dines at the restaurant */
  | "dine-in" 
  /** Customer takes food away */
  | "take-away";

/**
 * Represents an order placed by a customer
 */
export interface Order {
  /** Unique order identifier */
  id: string;
  /** Table identifier for dine-in orders */
  tableId: string;
  /** List of items in the order */
  items: CartItem[];
  /** Subtotal before tax and discounts */
  subtotal: number;
  /** Total amount including tax and discounts */
  total: number;
  /** Special instructions for the kitchen */
  notes?: string;
  /** Order mode: dine-in or take-away */
  orderMode: OrderMode;
  /** Current status of the order */
  status: OrderStatus;
  /** Order type: guest, waiter, or kasir */
  type: OrderType;
  /** ISO timestamp when order was created */
  created_at: string;
  /** ISO timestamp when order was last updated */
  updated_at: string;
  /** ISO timestamp when order was served to customer */
  served_at?: string;
}

/**
 * Represents a completed transaction
 */
export interface Transaction {
  /** Unique transaction identifier */
  id: string;
  /** Table identifier (null for take-away) */
  table_id: string;
  /** Items purchased in this transaction */
  items: CartItem[];
  /** Subtotal before tax and discounts */
  subtotal: number;
  /** Discount amount applied */
  discount?: number;
  /** Discount percentage or fixed amount */
  discount_amount?: number;
  /** Tax amount */
  tax: number;
  /** Total amount paid */
  total: number;
  /** Payment method used */
  method: string;
  /** ISO timestamp when transaction was created */
  created_at: string;
  /** Reference order identifier */
  order_id?: string;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  /** Array of data items */
  data: T[];
  /** Total number of items available */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
}

/**
 * Table configuration and status
 */
export interface TableData {
  /** Unique table identifier */
  id: string;
  /** Number of seats at the table */
  seat: number;
  /** Current table status */
  status: "available" | "occupied" | "service" | "reserved";
  /** Number of customers currently seated */
  pax?: number;
  /** Current bill total for this table */
  total?: number;
  /** Duration table has been occupied */
  duration?: string;
  /** Array of order IDs for this table */
  orders?: string[];
}

/**
 * Inventory item for stock management
 */
export interface InventoryItem {
  /** Unique inventory item identifier */
  id: string;
  /** Item name */
  name: string;
  /** Current quantity in stock */
  qty: number;
  /** Unit of measurement */
  unit: string;
  /** Expiration date (ISO string) */
  exp_date: string;
  /** Item category */
  category: string;
  /** Stock management method */
  method: "FIFO" | "LIFO";
  /** Current stock level */
  stock: number;
  /** Minimum stock level before alert */
  min_stock: number;
}

/**
 * Promotion or discount configuration
 */
export interface Promo {
  /** Unique promotion identifier */
  id: string;
  /** Promotion display name */
  name: string;
  /** Promotion description */
  description: string;
  /** Discount value (percentage or fixed amount) */
  discount: number;
  /** Discount type */
  type: "percentage" | "fixed";
  /** Whether promotion is currently active */
  active: boolean;
  /** Minimum order amount for promotion to apply */
  min_order?: number;
  /** Promotion validity date (ISO string) */
  valid_until?: string;
  /** Optional promo code */
  code?: string;
}

/**
 * User roles in the system
 */
export type UserRole = "admin" | "manager" | "owner" | "waiter" | "kitchen";

/**
 * User session information
 */
export interface UserSession {
  /** User role */
  role: UserRole;
  /** User display name */
  name: string;
}

/**
 * Shift types for employee scheduling
 */
export enum ShiftType {
  PAGI = "PAGI",
  MIDDLE = "MIDDLE",
  LIBUR = "LIBUR",
}

/**
 * Employee information
 */
export interface Employee {
  /** Unique employee identifier */
  id: string;
  /** Employee name */
  name: string;
  /** Employee role/position */
  role: string;
}

/**
 * Attendance record
 */
export interface Attendance {
  /** Employee identifier */
  employeeId: string;
  /** Date of attendance (ISO string) */
  date: string;
  /** Attendance status */
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';
}

// Module type definitions
export type Module = 
  | "orders" 
  | "kasir" 
  | "meja" 
  | "menu" 
  | "promo" 
  | "qr-menu" 
  | "metrics" 
  | "hpp" 
  | "sdm" 
  | "stok" 
  | "transaksi";
