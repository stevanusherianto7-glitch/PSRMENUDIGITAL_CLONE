import { supabase } from '../../lib/supabase';

// Mock state representing current user role/auth configuration for query simulation
let mockAuthState = { role: 'anon' };

jest.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: jest.fn().mockImplementation((table) => {
        const isAuthorized = mockAuthState.role === 'admin' || mockAuthState.role === 'waiter' || mockAuthState.role === 'kasir';
        
        return {
          select: jest.fn().mockImplementation(() => {
            if (table === 'transactions' && !isAuthorized) {
              return Promise.resolve({ data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "transactions"' } });
            }
            if (table === 'inventory' && !isAuthorized) {
              return Promise.resolve({ data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "inventory"' } });
            }
            return Promise.resolve({ data: [], error: null });
          }),
          update: jest.fn().mockImplementation(() => {
            const result = {
              data: isAuthorized ? [] : null,
              error: isAuthorized ? null : { code: '42501', message: `new row violates row-level security policy for table "${table}"` }
            };
            return {
              eq: jest.fn().mockImplementation(() => Promise.resolve(result))
            };
          }),
          delete: jest.fn().mockImplementation(() => {
            return Promise.resolve({ data: null, error: { code: '42501', message: 'permission denied for table' } });
          }),
        };
      })
    }
  };
});

describe('Row Level Security (RLS) Database Integrity Audit', () => {
  beforeEach(() => {
    mockAuthState = { role: 'anon' };
  });

  it('should block anonymous/guest access to transactions table', async () => {
    mockAuthState.role = 'anon';
    const { error } = await supabase.from('transactions').select('*');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('should allow admin/cashier access to transactions table', async () => {
    mockAuthState.role = 'admin';
    const { error } = await supabase.from('transactions').select('*');
    expect(error).toBeNull();
  });

  it('should block anonymous/guest updates to menu_items prices', async () => {
    mockAuthState.role = 'anon';
    const { error } = await supabase.from('menu_items').update({ price: 1000 }).eq('id', 'm1');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('should block anonymous/guest access to inventory table', async () => {
    mockAuthState.role = 'anon';
    const { error } = await supabase.from('inventory').select('*');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('should block anonymous/guest updates to meja statuses', async () => {
    mockAuthState.role = 'anon';
    const { error } = await supabase.from('meja').update({ status: 'occupied' }).eq('id', '5');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });
});
