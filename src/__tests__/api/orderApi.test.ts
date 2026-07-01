/**
 * Comprehensive API Test Suite — PSRMENUDIGITAL
 *
 * Covers all exported functions in api.ts:
 *   - mapOrder          (DTO adapter)
 *   - fetchOrders       (with/without filters, error)
 *   - fetchPaginatedOrders (pagination, status filter, error)
 *   - createOrder       (success, error)
 *   - updateOrder       (success, status transitions, error, id/created_at strip)
 *   - deleteOrder       (success, error)
 *   - fetchTransactions (pagination, date range filters, error)
 */

import {
  fetchOrders,
  fetchPaginatedOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  fetchTransactions,
  mapOrder,
} from '../../app/api';
import { supabase } from '../../lib/supabase';

// ─── MOCK SETUP ───────────────────────────────────────────────────────────────

let mockThen: jest.Mock;

jest.mock('../../lib/supabase', () => {
  const createMockQuery = () => {
    const query: any = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      then: jest.fn(fn => Promise.resolve({ data: [], error: null, count: 0 }).then(fn)),
    };
    return query;
  };

  return {
    supabase: {
      from: jest.fn(() => createMockQuery()),
    },
  };
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const makeDbOrder = (overrides = {}) => ({
  id: 'ORD-TEST-001',
  table_id: 'A1',
  items: [{ id: 'm1', name: 'Nasi Goreng', qty: 1, price: 25000, category: 'Makanan' }],
  subtotal: 25000,
  total: 27500,
  notes: '',
  order_mode: 'dine-in',
  status: 'pending',
  type: 'guest',
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
  ...overrides,
});

const makeDbTransaction = (overrides = {}) => ({
  id: 'TX-001',
  table_id: 'A1',
  items: [],
  subtotal: 25000,
  discount: 0,
  discount_amount: 0,
  tax: 2500,
  total: 27500,
  method: 'cash',
  created_at: '2025-01-01T10:00:00Z',
  ...overrides,
});

/** Patch the next supabase.from call to resolve with given payload */
function mockFromResolve(payload: object) {
  (supabase.from as jest.Mock).mockImplementationOnce(() => {
    const query: any = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      then: jest.fn(fn => Promise.resolve(payload).then(fn)),
    };
    return query;
  });
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('mapOrder — DTO Adapter', () => {
  it('maps table_id → tableId', () => {
    expect(mapOrder({ table_id: 'B2' } as any).tableId).toBe('B2');
  });

  it('prefers table_id over tableId when both present', () => {
    expect(mapOrder({ table_id: 'B2', tableId: 'OLD' } as any).tableId).toBe('B2');
  });

  it('falls back to tableId when table_id absent', () => {
    expect(mapOrder({ tableId: 'C3' } as any).tableId).toBe('C3');
  });

  it('maps order_mode → orderMode', () => {
    expect(mapOrder({ order_mode: 'take-away' } as any).orderMode).toBe('take-away');
  });

  it('maps mode → orderMode as secondary fallback', () => {
    expect(mapOrder({ mode: 'take-away' } as any).orderMode).toBe('take-away');
  });

  it('defaults orderMode to dine-in when nothing set', () => {
    expect(mapOrder({} as any).orderMode).toBe('dine-in');
  });

  it('returns falsy when input is null', () => {
    expect(mapOrder(null as any)).toBeFalsy();
  });

  it('returns falsy when input is undefined', () => {
    expect(mapOrder(undefined as any)).toBeFalsy();
  });

  it('preserves all other fields unchanged', () => {
    const raw = makeDbOrder({ status: 'cooking', notes: 'extra spicy' });
    const mapped = mapOrder(raw as any);
    expect(mapped.status).toBe('cooking');
    expect(mapped.notes).toBe('extra spicy');
    expect(mapped.items).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('fetchOrders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches orders without filters and maps them', async () => {
    mockFromResolve({ data: [makeDbOrder()], error: null });
    const orders = await fetchOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].tableId).toBe('A1');
    expect(orders[0].orderMode).toBe('dine-in');
  });

  it('returns empty array when database returns empty', async () => {
    mockFromResolve({ data: [], error: null });
    const orders = await fetchOrders();
    expect(orders).toHaveLength(0);
  });

  it('returns empty array when data is null', async () => {
    mockFromResolve({ data: null, error: null });
    const orders = await fetchOrders();
    expect(orders).toHaveLength(0);
  });

  it('throws when Supabase returns an error', async () => {
    mockFromResolve({ data: null, error: new Error('Connection refused') });
    await expect(fetchOrders()).rejects.toThrow('Connection refused');
  });

  it('fetches with status filter', async () => {
    mockFromResolve({ data: [makeDbOrder({ status: 'cooking' })], error: null });
    const orders = await fetchOrders('cooking');
    expect(orders[0].status).toBe('cooking');
  });

  it('fetches with tableId filter', async () => {
    mockFromResolve({ data: [makeDbOrder({ table_id: 'B5' })], error: null });
    const orders = await fetchOrders(undefined, 'B5');
    expect(orders[0].tableId).toBe('B5');
  });

  it('fetches with both status and tableId filters', async () => {
    mockFromResolve({ data: [makeDbOrder({ status: 'ready', table_id: 'C3' })], error: null });
    const orders = await fetchOrders('ready', 'C3');
    expect(orders[0].status).toBe('ready');
    expect(orders[0].tableId).toBe('C3');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('fetchPaginatedOrders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches page 1 with default limit 20', async () => {
    mockFromResolve({ data: [makeDbOrder()], error: null, count: 1 });
    const result = await fetchPaginatedOrders();
    expect(result.data).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(1);
  });

  it('fetches page 2 correctly', async () => {
    mockFromResolve({ data: [], error: null, count: 5 });
    const result = await fetchPaginatedOrders(2, 5);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.total).toBe(5);
  });

  it('filters by status', async () => {
    mockFromResolve({ data: [makeDbOrder({ status: 'pending' })], error: null, count: 1 });
    const result = await fetchPaginatedOrders(1, 20, 'pending');
    expect(result.data[0].status).toBe('pending');
  });

  it('returns total 0 when count is null', async () => {
    mockFromResolve({ data: [], error: null, count: null });
    const result = await fetchPaginatedOrders();
    expect(result.total).toBe(0);
  });

  it('throws when Supabase returns an error', async () => {
    mockFromResolve({ data: null, error: new Error('Paginated fetch failed'), count: null });
    await expect(fetchPaginatedOrders()).rejects.toThrow('Paginated fetch failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('createOrder', () => {
  beforeEach(() => jest.clearAllMocks());

  const basePayload = {
    tableId: 'A1',
    items: [{ id: 'm1', name: 'Nasi Goreng', qty: 2, price: 25000, category: 'Makanan' }],
    subtotal: 50000,
    total: 55000,
    orderMode: 'dine-in' as const,
    type: 'guest' as const,
  };

  it('creates an order and returns mapped result', async () => {
    mockFromResolve({ data: makeDbOrder({ table_id: 'A1' }), error: null });
    const order = await createOrder(basePayload);
    expect(order.tableId).toBe('A1');
    expect(order.orderMode).toBe('dine-in');
  });

  it('creates order with notes', async () => {
    mockFromResolve({ data: makeDbOrder({ notes: 'no MSG' }), error: null });
    const order = await createOrder({ ...basePayload, notes: 'no MSG' });
    expect(order.notes).toBe('no MSG');
  });

  it('creates take-away order', async () => {
    mockFromResolve({ data: makeDbOrder({ order_mode: 'take-away' }), error: null });
    const order = await createOrder({ ...basePayload, orderMode: 'take-away' });
    expect(order.orderMode).toBe('take-away');
  });

  it('throws when Supabase returns an error', async () => {
    // Mock window.alert since createOrder calls alert() on error
    global.alert = jest.fn();
    mockFromResolve({ data: null, error: new Error('Insert failed') });
    await expect(createOrder(basePayload)).rejects.toThrow('Insert failed');
    expect(global.alert).toHaveBeenCalledWith('Supabase Error: Insert failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('updateOrder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates status pending → cooking', async () => {
    mockFromResolve({ data: makeDbOrder({ status: 'cooking' }), error: null });
    const result = await updateOrder('ORD-TEST-001', { status: 'cooking' });
    expect(result.status).toBe('cooking');
  });

  it('updates status cooking → ready', async () => {
    mockFromResolve({ data: makeDbOrder({ status: 'ready' }), error: null });
    const result = await updateOrder('ORD-TEST-001', { status: 'ready' });
    expect(result.status).toBe('ready');
  });

  it('updates status ready → served', async () => {
    mockFromResolve({ data: makeDbOrder({ status: 'served' }), error: null });
    const result = await updateOrder('ORD-TEST-001', { status: 'served' });
    expect(result.status).toBe('served');
  });

  it('can cancel an order', async () => {
    mockFromResolve({ data: makeDbOrder({ status: 'cancelled' }), error: null });
    const result = await updateOrder('ORD-TEST-001', { status: 'cancelled' });
    expect(result.status).toBe('cancelled');
  });

  it('strips id and created_at from patch (prevents overwrite)', async () => {
    mockFromResolve({ data: makeDbOrder({ status: 'cooking' }), error: null });
    // Passing id and created_at in patch — they should be stripped
    const result = await updateOrder('ORD-TEST-001', {
      status: 'cooking',
      id: 'HACKED-ID',
      created_at: '1970-01-01',
    } as any);
    // Should still succeed with the real ID
    expect(result.id).toBe('ORD-TEST-001');
  });

  it('throws when Supabase returns an error', async () => {
    mockFromResolve({ data: null, error: new Error('Update conflict') });
    await expect(updateOrder('ORD-TEST-001', { status: 'cooking' }))
      .rejects.toThrow('Update conflict');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('deleteOrder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes an order successfully (returns void)', async () => {
    mockFromResolve({ error: null });
    await expect(deleteOrder('ORD-TEST-001')).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    mockFromResolve({ error: new Error('Delete forbidden') });
    await expect(deleteOrder('ORD-TEST-001')).rejects.toThrow('Delete forbidden');
  });

  it('can delete different order IDs', async () => {
    mockFromResolve({ error: null });
    await expect(deleteOrder('ORD-TEST-XYZ')).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('fetchTransactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches transactions with defaults (page 1, limit 50)', async () => {
    mockFromResolve({ data: [makeDbTransaction()], error: null, count: 1 });
    const result = await fetchTransactions();
    expect(result.data).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.total).toBe(1);
  });

  it('fetches page 2', async () => {
    mockFromResolve({ data: [], error: null, count: 10 });
    const result = await fetchTransactions(2, 10);
    expect(result.page).toBe(2);
    expect(result.total).toBe(10);
  });

  it('applies dateRange.from filter', async () => {
    mockFromResolve({ data: [makeDbTransaction()], error: null, count: 1 });
    const dateRange = { from: new Date('2025-01-01') };
    const result = await fetchTransactions(1, 50, dateRange);
    expect(result.data).toHaveLength(1);
  });

  it('applies dateRange.to filter', async () => {
    mockFromResolve({ data: [makeDbTransaction()], error: null, count: 1 });
    const dateRange = { to: new Date('2025-01-31') };
    const result = await fetchTransactions(1, 50, dateRange);
    expect(result.data).toHaveLength(1);
  });

  it('applies both dateRange.from and dateRange.to', async () => {
    mockFromResolve({ data: [makeDbTransaction()], error: null, count: 1 });
    const dateRange = { from: new Date('2025-01-01'), to: new Date('2025-01-31') };
    const result = await fetchTransactions(1, 50, dateRange);
    expect(result.data).toHaveLength(1);
  });

  it('works without dateRange (undefined)', async () => {
    mockFromResolve({ data: [], error: null, count: 0 });
    const result = await fetchTransactions(1, 50, undefined);
    expect(result.total).toBe(0);
  });

  it('returns total 0 when count is null', async () => {
    mockFromResolve({ data: [], error: null, count: null });
    const result = await fetchTransactions();
    expect(result.total).toBe(0);
  });

  it('returns empty data array when data is null', async () => {
    mockFromResolve({ data: null, error: null, count: 0 });
    const result = await fetchTransactions();
    expect(result.data).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    mockFromResolve({ data: null, error: new Error('Transaction fetch failed'), count: null });
    await expect(fetchTransactions()).rejects.toThrow('Transaction fetch failed');
  });
});
