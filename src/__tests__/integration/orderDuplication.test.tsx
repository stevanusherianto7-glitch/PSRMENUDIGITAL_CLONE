import { createOrder } from '../../app/api';
import { supabase } from '../../lib/supabase';

// Mock the Supabase client
jest.mock('../../lib/supabase', () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    then: jest.fn(),
  };

  mockQuery.then.mockImplementation(function (onFulfilled) {
    return Promise.resolve({ data: [], error: null }).then(onFulfilled);
  });

  return {
    supabase: {
      from: jest.fn().mockReturnValue(mockQuery),
    },
  };
});

describe('Simulation & Stress Testing: Order Duplication Prevention', () => {
  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = supabase.from('orders');
    
    // Default implementation for successful insert
    mockQuery.then.mockImplementation(function (onFulfilled) {
      return Promise.resolve({
        data: {
          id: 'O-TEST-123',
          table_id: 'Meja-1',
          items: [{ id: 'menu-1', name: 'Nasi Goreng', price: 15000, qty: 1, category: 'Makanan' }],
          subtotal: 15000,
          total: 15000,
          status: 'pending',
          type: 'guest',
          order_mode: 'dine-in',
          idempotency_key: 'Meja-1|menu-1:1|123456',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }).then(onFulfilled);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Success with Idempotency Key
  // ---------------------------------------------------------------------------
  it('should successfully create an order and include the idempotency_key in payload', async () => {
    const payload = {
      tableId: 'Meja-1',
      items: [{ id: 'menu-1', name: 'Nasi Goreng', price: 15000, qty: 1, category: 'Makanan' }],
      subtotal: 15000,
      total: 15000,
      orderMode: 'dine-in' as const,
      type: 'guest' as const,
      idempotencyKey: 'Meja-1|menu-1:1|123456',
    };

    const order = await createOrder(payload);

    expect(order.tableId).toBe('Meja-1');
    expect(supabase.from).toHaveBeenCalledWith('orders');
    expect(mockQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        table_id: 'Meja-1',
        idempotency_key: 'Meja-1|menu-1:1|123456',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Reject Duplicate Insert (Server-side Unique Constraint)
  // ---------------------------------------------------------------------------
  it('should propagate a database unique constraint violation error (code 23505) when a duplicate key is inserted', async () => {
    // Mock the insert returning a unique violation error
    mockQuery.then.mockImplementationOnce(function (onFulfilled) {
      return Promise.resolve({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "idx_orders_idempotency_key"',
        },
      }).then(onFulfilled);
    });

    const payload = {
      tableId: 'Meja-1',
      items: [{ id: 'menu-1', name: 'Nasi Goreng', price: 15000, qty: 1, category: 'Makanan' }],
      subtotal: 15000,
      total: 15000,
      orderMode: 'dine-in' as const,
      type: 'guest' as const,
      idempotencyKey: 'Meja-1|menu-1:1|123456',
    };

    await expect(createOrder(payload)).rejects.toEqual(
      expect.objectContaining({
        code: '23505',
        message: expect.stringContaining('duplicate key'),
      })
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Robust Fallback for Missing Schema Column
  // ---------------------------------------------------------------------------
  it('should fallback and retry inserting the order without the idempotency_key if the database schema is missing that column', async () => {
    let callCount = 0;
    mockQuery.then.mockImplementation(function (onFulfilled) {
      callCount++;
      if (callCount === 1) {
        // First call fails with missing column error
        return Promise.resolve({
          data: null,
          error: {
            code: '42703',
            message: 'column "idempotency_key" of relation "orders" does not exist',
          },
        }).then(onFulfilled);
      } else {
        // Second retry call succeeds without the key
        return Promise.resolve({
          data: {
            id: 'O-RETRY-123',
            table_id: 'Meja-1',
            items: [{ id: 'menu-1', name: 'Nasi Goreng', price: 15000, qty: 1, category: 'Makanan' }],
            subtotal: 15000,
            total: 15000,
            status: 'pending',
            type: 'guest',
            order_mode: 'dine-in',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }).then(onFulfilled);
      }
    });

    const payload = {
      tableId: 'Meja-1',
      items: [{ id: 'menu-1', name: 'Nasi Goreng', price: 15000, qty: 1, category: 'Makanan' }],
      subtotal: 15000,
      total: 15000,
      orderMode: 'dine-in' as const,
      type: 'guest' as const,
      idempotencyKey: 'Meja-1|menu-1:1|123456',
    };

    const order = await createOrder(payload);

    expect(order.id).toBe('O-RETRY-123');
    // Ensure insert was called twice (first with key, second without key)
    expect(mockQuery.insert).toHaveBeenCalledTimes(2);
    expect(mockQuery.insert.mock.calls[0][0]).toHaveProperty('idempotency_key');
    expect(mockQuery.insert.mock.calls[1][0]).not.toHaveProperty('idempotency_key');
  });
});
