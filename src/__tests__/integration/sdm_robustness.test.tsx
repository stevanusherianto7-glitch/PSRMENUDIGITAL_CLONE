import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { JadwalShift } from '../../app/components/JadwalShift';
import { supabase } from '../../lib/supabase';

// Mock Supabase client
jest.mock('../../lib/supabase', () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    then: jest.fn(),
  };

  return {
    supabase: {
      from: jest.fn().mockReturnValue(mockQuery),
    },
  };
});

describe('SDM Shift Schedule - Robustness & Offline Fallback Simulations', () => {
  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = supabase.from('jadwal_shift');
    localStorage.clear();
  });

  it('should fallback to hardcoded mock employee schedule data when database connection is offline or fails', async () => {
    // Mock the database query returning an error (e.g. offline/network connection timeout)
    mockQuery.then.mockImplementation((onFulfilled: any) => {
      return Promise.resolve({
        data: null,
        error: { code: '57P01', message: 'Database connection failed / timeout' },
      }).then(onFulfilled);
    });

    render(<JadwalShift dateRange={undefined} />);

    // Wait for the fallback rendering to complete and display fallback employees
    await waitFor(() => {
      expect(screen.getAllByText(/Budi Santoso/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Siti Aminah/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Agus Setiawan/i)[0]).toBeInTheDocument();
    });

    // Verify it rendered the employee roles
    expect(screen.getAllByText(/Kasir/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Waiter/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Chef/i)[0]).toBeInTheDocument();
  });

  it('should load and render employee schedule data successfully when database connection is active', async () => {
    const mockDbData = [
      { id: '10', employee_name: 'Antg Staff 1', role: 'Kasir', schedule: ['P', 'P', 'M', 'M', 'O', 'P', 'P'] },
      { id: '11', employee_name: 'Antg Staff 2', role: 'Waiter', schedule: ['M', 'M', 'O', 'P', 'P', 'M', 'M'] },
    ];

    // Mock the database query returning successful data
    mockQuery.then.mockImplementation((onFulfilled: any) => {
      return Promise.resolve({
        data: mockDbData,
        error: null,
      }).then(onFulfilled);
    });

    render(<JadwalShift dateRange={undefined} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Antg Staff 1/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Antg Staff 2/i)[0]).toBeInTheDocument();
    });

    expect(screen.queryByText(/Budi Santoso/i)).toBeNull();
  });
});
