import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { StoreProvider, useStore } from '../../app/context/StoreContext';

const mockOrders = [
  {
    id: 'ORD-TEST-001',
    table_id: 'A1',
    items: [{ id: 'm1', name: 'Nasi Goreng', qty: 1, price: 25000 }],
    subtotal: 25000,
    total: 27500,
    status: 'pending',
    type: 'guest',
    order_mode: 'dine-in',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      then: jest.fn(fn =>
        Promise.resolve({ data: mockOrders, error: null }).then(fn)
      ),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

// Test component yang mengakses store
function TestConsumer() {
  const { orders, loadingOrders, refreshOrders } = useStore();
  return (
    <div>
      <div data-testid="loading">{loadingOrders ? 'loading' : 'done'}</div>
      <div data-testid="order-count">{orders.length}</div>
      <button onClick={refreshOrders}>Refresh</button>
    </div>
  );
}

describe('StoreContext', () => {
  it('menyediakan orders setelah initial load', async () => {
    render(
      <StoreProvider>
        <TestConsumer />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done');
    });

    expect(screen.getByTestId('order-count').textContent).toBe('1');
  });

  it('refreshOrders memperbarui state', async () => {
    render(
      <StoreProvider>
        <TestConsumer />
      </StoreProvider>
    );

    await waitFor(() => screen.getByTestId('loading').textContent === 'done');

    await act(async () => {
      screen.getByRole('button', { name: 'Refresh' }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('done')
    );
  });
});
