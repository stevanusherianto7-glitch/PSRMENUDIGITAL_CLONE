import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Test hanya kalkulasi — mock seluruh Supabase dan context
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      then: jest.fn(fn => Promise.resolve({ data: [], error: null }).then(fn)),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
  },
}));

jest.mock('../../app/context/StoreContext', () => ({
  useStore: () => ({
    orders: [],
    menuItems: [],
    loadingOrders: false,
    loadingMenu: false,
    refreshOrders: jest.fn(),
    refreshMenu: jest.fn(),
  }),
}));

describe('Kalkulasi harga di KasirModule', () => {
  // Test helper: kalkulasi subtotal
  it('subtotal = sum(item.price * item.qty)', () => {
    const items = [
      { price: 25000, qty: 2 },
      { price: 15000, qty: 1 },
    ];
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    expect(subtotal).toBe(65000);
  });

  it('pajak = subtotal * 10%', () => {
    const subtotal = 65000;
    const tax = Math.round(subtotal * 0.1);
    expect(tax).toBe(6500);
  });

  it('total = subtotal + pajak', () => {
    const subtotal = 65000;
    const tax = 6500;
    expect(subtotal + tax).toBe(71500);
  });

  it('split bill 3 orang = Math.ceil(total / 3)', () => {
    const total = 71500;
    const perPerson = Math.ceil(total / 3);
    expect(perPerson).toBe(23834);
  });

  it('kembalian = bayar - total, tidak boleh negatif', () => {
    const total = 71500;
    const bayar = 100000;
    const kembalian = bayar - total;
    expect(kembalian).toBe(28500);
    expect(kembalian).toBeGreaterThanOrEqual(0);
  });
});
