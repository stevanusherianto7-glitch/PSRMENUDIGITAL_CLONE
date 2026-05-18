import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchOrders, fetchTransactions } from '../api';
import type { 
  Module, 
  Order, 
  MenuItem, 
  TableData, 
  Transaction, 
  InventoryItem, 
  Promo, 
  UserSession 
} from '../types';
import { SEED_TABLES, SEED_MENU, SEED_INVENTORY, SEED_PROMOS } from '../data';

interface AdminState {
  // Navigation
  activeModule: Module;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  
  // User Session
  session: UserSession | null;
  
  // Data States
  tables: TableData[];
  menuItems: MenuItem[];
  liveOrders: Order[];
  transactions: Transaction[];
  inventory: InventoryItem[];
  promos: Promo[];
  inventoryLogs: any[];
  
  // UI States
  connected: boolean;
  seeding: boolean;
  ttsEnabled: boolean;
  time: Date;
  
  // Sub-modules
  sdmSubModule: 'karyawan' | 'shift';
  stokSubModule: 'bahan' | 'asset';
  transaksiSubModule: 'summary' | 'laporan';
  kasirSubModule: 'pos' | 'promo' | 'petty';
}

interface AdminActions {
  // Navigation
  setActiveModule: (module: Module) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  
  // Data Operations
  loadOrders: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  refreshData: () => void;
  
  // State Updates
  setTables: (tables: TableData[]) => void;
  setMenuItems: (items: MenuItem[]) => void;
  setOrders: (orders: Order[]) => void;
  setTransactions: (tx: Transaction[]) => void;
  
  // UI Controls
  setTtsEnabled: (enabled: boolean) => void;
  
  // Logout
  logout: () => void;
}

export function useAdminState(): AdminState & AdminActions {
  const navigate = useNavigate();
  
  // State initialization
  const [activeModule, setActiveModule] = useState<Module>('transaksi');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('pawon_sidebar_open');
    return saved ? saved === 'true' : window.innerWidth > 1024;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [tables, setTables] = useState<TableData[]>(SEED_TABLES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(SEED_MENU);
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>(SEED_INVENTORY);
  const [promos, setPromos] = useState<Promo[]>(SEED_PROMOS);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [time, setTime] = useState(new Date());
  const [sdmSubModule, setSdmSubModule] = useState<'karyawan' | 'shift'>('karyawan');
  const [stokSubModule, setStokSubModule] = useState<'bahan' | 'asset'>('bahan');
  const [transaksiSubModule, setTransaksiSubModule] = useState<'summary' | 'laporan'>('summary');
  const [kasirSubModule, setKasirSubModule] = useState<'pos' | 'promo' | 'petty'>('pos');

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('pawon_sidebar_open', sidebarOpen.toString());
  }, [sidebarOpen]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Auth check
  useEffect(() => {
    try {
      const s = localStorage.getItem('pawon_session');
      if (!s) {
        navigate('/');
        return;
      }
      const parsed = JSON.parse(s) as UserSession;
      if (parsed.role !== 'admin') {
        navigate('/waiter');
        return;
      }
      setSession(parsed);
    } catch (e) {
      console.error('Failed to parse session:', e);
      localStorage.removeItem('pawon_session');
      navigate('/');
    }
  }, [navigate]);

  // Data loading functions
  const loadOrders = useCallback(async () => {
    try {
      const orders = await fetchOrders();
      const active = orders.filter(o => o.status !== 'cancelled');
      setLiveOrders(active);
    } catch (e) {
      console.error('Failed to load orders:', e);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const { data: txRows } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (txRows) {
        const txs = txRows.map((r: any) => ({
          id: r.id,
          table_id: r.table_id,
          items: r.items || [],
          subtotal: r.subtotal,
          tax: r.tax,
          total: r.total,
          method: r.method,
          created_at: r.created_at
        }));
        setTransactions(txs);
      }
    } catch (e) {
      console.error('Failed to load transactions:', e);
    }
  }, []);

  const refreshData = useCallback(() => {
    loadOrders();
    loadTransactions();
  }, [loadOrders, loadTransactions]);

  // Auto-refresh
  useEffect(() => {
    loadOrders();
    loadTransactions();
    const interval = setInterval(() => {
      loadOrders();
      loadTransactions();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadOrders, loadTransactions]);

  // Initialize Supabase
  useEffect(() => {
    const mejaChannel: any = null;
    const txChannel: any = null;
    const ordersChannel: any = null;

    const initSupabase = async () => {
      setSeeding(true);
      try {
        const { error: pingError } = await supabase
          .from('meja')
          .select('id')
          .limit(1);
        
        if (pingError) throw pingError;
        setConnected(true);

        // Initialize data (keep existing logic)
        // ... (copy existing initialization logic from AdminPage)
        
      } catch (err) {
        console.warn('Supabase connection failed:', err);
        setConnected(false);
      } finally {
        setSeeding(false);
      }
    };

    initSupabase();

    return () => {
      if (mejaChannel) supabase.removeChannel(mejaChannel);
      if (txChannel) supabase.removeChannel(txChannel);
      if (ordersChannel) supabase.removeChannel(ordersChannel);
    };
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(v => !v);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pawon_session');
    navigate('/');
  }, [navigate]);

  return {
    // State
    activeModule,
    sidebarOpen,
    mobileSidebarOpen,
    session,
    tables,
    menuItems,
    liveOrders,
    transactions,
    inventory,
    promos,
    inventoryLogs,
    connected,
    seeding,
    ttsEnabled,
    time,
    sdmSubModule,
    stokSubModule,
    transaksiSubModule,
    kasirSubModule,
    
    // Actions
    setActiveModule,
    toggleSidebar,
    setMobileSidebarOpen,
    loadOrders,
    loadTransactions,
    refreshData,
    setTables,
    setMenuItems,
    setOrders: setLiveOrders,
    setTransactions,
    setTtsEnabled,
    logout
  };
}
