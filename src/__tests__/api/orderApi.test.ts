import { fetchOrders, createOrder, updateOrder, mapOrder } from '../../app/api';
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
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    then: jest.fn(),
  };

  // Enable chainable promises for supabase query builder
  mockQuery.then.mockImplementation(function (onFulfilled) {
    return Promise.resolve({ data: [], error: null }).then(onFulfilled);
  });

  return {
    supabase: {
      from: jest.fn().mockReturnValue(mockQuery),
    },
  };
});

describe('Order API', () => {
  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = supabase.from('orders');
  });

  describe('fetchOrders', () => {
    it('fetches orders successfully', async () => {
      const mockDbOrders = [
        {
          id: 'O-1',
          table_id: 'A1',
          items: [],
          subtotal: 0,
          total: 0,
          status: 'pending',
          type: 'guest',
          order_mode: 'dine-in',
          created_at: '2023-01-01',
          updated_at: '2023-01-01'
        }
      ];

      mockQuery.then.mockImplementationOnce(function (onFulfilled: any) {
        return Promise.resolve({ data: mockDbOrders, error: null }).then(onFulfilled);
      });

      const orders = await fetchOrders();

      expect(orders).toEqual([
        {
          id: 'O-1',
          tableId: 'A1',
          table_id: 'A1',
          items: [],
          subtotal: 0,
          total: 0,
          status: 'pending',
          type: 'guest',
          orderMode: 'dine-in',
          order_mode: 'dine-in',
          created_at: '2023-01-01',
          updated_at: '2023-01-01'
        }
      ]);
      expect(supabase.from).toHaveBeenCalledWith('orders');
    });

    it('handles API errors', async () => {
      mockQuery.then.mockImplementation(function (onFulfilled: any) {
        return Promise.resolve({ data: null, error: new Error('Database connection failed') }).then(onFulfilled);
      });

      await expect(fetchOrders()).rejects.toThrow('Database connection failed');
    }, 15000);
  });

  describe('createOrder', () => {
    it('creates order successfully', async () => {
      const mockDbOrder = {
        id: 'O-1',
        table_id: 'A1',
        items: [],
        subtotal: 0,
        total: 0,
        status: 'pending',
        type: 'guest',
        order_mode: 'dine-in',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      mockQuery.then.mockImplementationOnce(function (onFulfilled: any) {
        return Promise.resolve({ data: mockDbOrder, error: null }).then(onFulfilled);
      });

      const order = await createOrder({
        tableId: 'A1',
        items: [],
        subtotal: 0,
        total: 0,
        orderMode: 'dine-in',
        type: 'guest'
      }); // skipQueue = true is no longer used

      expect(order.tableId).toBe('A1');
      expect(order.orderMode).toBe('dine-in');
      expect(supabase.from).toHaveBeenCalledWith('orders');
    });
  });

  describe('updateOrder', () => {
    it('update status pending → cooking', async () => {
      mockQuery.then.mockImplementationOnce(function (onFulfilled: any) {
        return Promise.resolve({
          data: { id: 'O-1', status: 'cooking' },
          error: null
        }).then(onFulfilled);
      });

      const result = await updateOrder('O-1', { status: 'cooking' });
      expect(result.status).toBe('cooking');
    });

    it('throw error saat update gagal', async () => {
      mockQuery.then.mockImplementationOnce(function (onFulfilled: any) {
        return Promise.resolve({
          data: null,
          error: new Error('Update failed')
        }).then(onFulfilled);
      });

      await expect(updateOrder('O-1', { status: 'cooking' }))
        .rejects.toThrow('Update failed');
    });
  });

  describe('mapOrder DTO adapter', () => {
    it('memetakan table_id ke tableId', () => {
      const raw = { table_id: 'B2', tableId: undefined } as any;
      const mapped = mapOrder(raw);
      expect(mapped.tableId).toBe('B2');
    });

    it('memetakan order_mode ke orderMode', () => {
      const raw = { order_mode: 'take-away' } as any;
      const mapped = mapOrder(raw);
      expect(mapped.orderMode).toBe('take-away');
    });

    it('fallback ke dine-in jika order_mode tidak ada', () => {
      const raw = {} as any;
      const mapped = mapOrder(raw);
      expect(mapped.orderMode).toBe('dine-in');
    });

    it('return falsy value jika input null/undefined', () => {
      expect(mapOrder(null as any)).toBeFalsy();
      expect(mapOrder(undefined as any)).toBeFalsy();
    });
  });
});
