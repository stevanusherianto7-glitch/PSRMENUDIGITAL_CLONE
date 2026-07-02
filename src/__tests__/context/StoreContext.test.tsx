/**
 * StoreContext — Extended Branch Coverage Test Suite
 *
 * Covers ALL branches in StoreContext.tsx:
 *   - refreshOrders: success, error (catch), active filter (served/cancelled)
 *   - refreshMenu: empty, null, DB merge (lines 49-72), throw catch (lines 77-78)
 *   - realtime channel callback triggers refreshOrders (line 96)
 *   - useStore outside provider throws
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { StoreProvider, useStore } from '../../app/context/StoreContext';
import { supabase } from '../../lib/supabase';
import { SEED_MENU } from '../../app/data';

// ─── MODULE-LEVEL MOCK STATE ──────────────────────────────────────────────────

let mockMenuData: any[] | null = [];
let mockMenuShouldThrow = false;
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
};

// ─── FACTORY THAT RESTORES CORRECT MOCK ──────────────────────────────────────

function setupSupabaseMock() {
  (supabase.from as jest.Mock).mockImplementation((table: string) => ({
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    // Proper thenable: accept both onFulfilled and onRejected
    then: jest.fn((onFulfilled: any, onRejected: any) => {
      if (table === 'menu_items') {
        if (mockMenuShouldThrow) {
          const err = new Error('DB unavailable');
          if (onRejected) return Promise.resolve().then(() => onRejected(err));
          return Promise.reject(err);
        }
        return Promise.resolve({ data: mockMenuData, error: null }).then(onFulfilled, onRejected);
      }
      // Other tables: return empty
      return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
    }),
  }));

  (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
  (supabase.removeChannel as jest.Mock).mockReturnValue(undefined);
}

// ─── MOCK SUPABASE & API ──────────────────────────────────────────────────────

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../../app/api', () => ({
  fetchOrders: jest.fn(),
}));

import { fetchOrders } from '../../app/api';
const mockFetchOrders = fetchOrders as jest.Mock;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const makeOrder = (status: string, id = 'ORD-001') => ({
  id,
  table_id: 'A1',
  tableId: 'A1',
  items: [],
  subtotal: 0,
  total: 0,
  status,
  type: 'guest',
  orderMode: 'dine-in',
  order_mode: 'dine-in',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

function TestConsumer() {
  const { orders, menuItems, loadingOrders, loadingMenu, refreshOrders, refreshMenu } = useStore();
  return (
    <div>
      <div data-testid="loading-orders">{loadingOrders ? 'loading' : 'done'}</div>
      <div data-testid="loading-menu">{loadingMenu ? 'loading' : 'done'}</div>
      <div data-testid="order-count">{orders.length}</div>
      <div data-testid="menu-count">{menuItems.length}</div>
      <button onClick={refreshOrders}>Refresh Orders</button>
      <button onClick={refreshMenu}>Refresh Menu</button>
    </div>
  );
}

// ─── TESTS: ORDERS ────────────────────────────────────────────────────────────

describe('StoreContext — orders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMenuData = [];
    mockMenuShouldThrow = false;
    setupSupabaseMock();
  });

  it('loads active (pending/cooking/ready) orders on mount', async () => {
    mockFetchOrders.mockResolvedValue([makeOrder('pending'), makeOrder('cooking', 'ORD-002')]);
    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-orders').textContent).toBe('done'));
    expect(screen.getByTestId('order-count').textContent).toBe('2');
  });

  it('filters out served orders (branch: status !== served)', async () => {
    mockFetchOrders.mockResolvedValue([
      makeOrder('pending'),
      makeOrder('served', 'ORD-SERVED'),
    ]);
    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-orders').textContent).toBe('done'));
    expect(screen.getByTestId('order-count').textContent).toBe('1');
  });

  it('filters out cancelled orders (branch: status !== cancelled)', async () => {
    mockFetchOrders.mockResolvedValue([
      makeOrder('pending'),
      makeOrder('cancelled', 'ORD-CANCELLED'),
    ]);
    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-orders').textContent).toBe('done'));
    expect(screen.getByTestId('order-count').textContent).toBe('1');
  });

  it('catches fetchOrders error and keeps orders empty (branch: catch block)', async () => {
    mockFetchOrders.mockRejectedValue(new Error('Network error'));
    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-orders').textContent).toBe('done'));
    expect(screen.getByTestId('order-count').textContent).toBe('0');
  });

  it('refreshOrders updates state on manual call', async () => {
    mockFetchOrders
      .mockResolvedValueOnce([makeOrder('pending')])
      .mockResolvedValueOnce([makeOrder('pending'), makeOrder('cooking', 'ORD-002')]);

    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('order-count').textContent).toBe('1'));

    await act(async () => {
      screen.getByRole('button', { name: 'Refresh Orders' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('order-count').textContent).toBe('2'));
  });

  it('realtime channel on() callback triggers refreshOrders (line 96 branch)', async () => {
    let capturedCallback: (() => void) | null = null;
    mockChannel.on.mockImplementation((_event: any, _filter: any, callback: any) => {
      capturedCallback = callback;
      return mockChannel;
    });

    mockFetchOrders
      .mockResolvedValueOnce([makeOrder('pending')])
      .mockResolvedValueOnce([makeOrder('pending'), makeOrder('cooking', 'ORD-002')]);

    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('order-count').textContent).toBe('1'));

    // Trigger the realtime callback
    await act(async () => {
      capturedCallback?.();
    });

    await waitFor(() => expect(screen.getByTestId('order-count').textContent).toBe('2'));
  });
});

// ─── TESTS: MENU ─────────────────────────────────────────────────────────────

describe('StoreContext — menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMenuData = [];
    mockMenuShouldThrow = false;
    mockFetchOrders.mockResolvedValue([]);
    // Restore correct mock implementation every time (avoids bleeding from overrides)
    setupSupabaseMock();
  });

  it('falls back to SEED_MENU when data is empty array (branch: else)', async () => {
    mockMenuData = [];
    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-menu').textContent).toBe('done'));
    const count = parseInt(screen.getByTestId('menu-count').textContent || '0');
    expect(count).toBeGreaterThan(0);
  });

  it('falls back to SEED_MENU when data is null (branch: else)', async () => {
    mockMenuData = null;
    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-menu').textContent).toBe('done'));
    const count = parseInt(screen.getByTestId('menu-count').textContent || '0');
    expect(count).toBeGreaterThan(0);
  });

  it('merges DB menu items with SEED_MENU (branch: if data && data.length > 0, lines 49-72)', async () => {
    // Provide a seed item with overridden price so the merge branch is taken
    const firstSeed = SEED_MENU[0];
    mockMenuData = [{ ...firstSeed, price: 99999, available: false }];

    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-menu').textContent).toBe('done'));

    const count = parseInt(screen.getByTestId('menu-count').textContent || '0');
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('includes extra DB items not in SEED_MENU (branch: extras mapping, line 60-71)', async () => {
    mockMenuData = [{
      id: 'extra-item-999',
      name: 'Menu Spesial',
      category: 'Minuman',
      price: 15000,
      image: 'https://example.com/img.jpg',
      available: true,
      tag: 'new',
      description: 'Menu istimewa',
    }];

    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-menu').textContent).toBe('done'));

    // SEED_MENU + 1 extra
    const count = parseInt(screen.getByTestId('menu-count').textContent || '0');
    expect(count).toBe(SEED_MENU.length + 1);
  });

  it('falls back to SEED_MENU when fetchMenu throws (branch: catch, lines 77-78)', async () => {
    mockMenuShouldThrow = true;
    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-menu').textContent).toBe('done'));
    const count = parseInt(screen.getByTestId('menu-count').textContent || '0');
    expect(count).toBeGreaterThan(0);
  });

  it('refreshMenu can be called manually', async () => {
    mockMenuData = [];
    render(<StoreProvider><TestConsumer /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId('loading-menu').textContent).toBe('done'));

    await act(async () => {
      screen.getByRole('button', { name: 'Refresh Menu' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('loading-menu').textContent).toBe('done'));
  });
});

// ─── TESTS: useStore guard ────────────────────────────────────────────────────

describe('useStore — outside provider', () => {
  it('throws when useStore is used outside StoreProvider', () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    function BrokenComponent() {
      useStore();
      return null;
    }

    expect(() => render(<BrokenComponent />)).toThrow('useStore must be used within a StoreProvider');
    console.error = originalConsoleError;
  });
});
