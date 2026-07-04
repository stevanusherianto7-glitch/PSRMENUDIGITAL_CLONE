import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../app/pages/LoginPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage - Integration Test (Jest Simulator)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form and default elements', () => {
    render(<LoginPage />);

    expect(screen.getByText('Selamat datang kembali')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password Admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Masuk/i })).toBeInTheDocument();
  });

  it('changes active role and update password input placeholder', async () => {
    render(<LoginPage />);

    const waiterButton = screen.getByText('Waiter');
    fireEvent.click(waiterButton);

    expect(screen.getByPlaceholderText('Password Waiter')).toBeInTheDocument();
    expect(screen.getByText('Terima & antar pesanan ke meja')).toBeInTheDocument();
  });

  it('shows error message on incorrect credentials', async () => {
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText('Password Admin');
    const submitButton = screen.getByRole('button', { name: /Masuk/i });

    await userEvent.type(passwordInput, 'wrongpass');
    fireEvent.click(submitButton);

    // Wait for the simulated async loading (600ms)
    await waitFor(() => {
      expect(screen.getByText('Password salah. Coba lagi.')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('logs in successfully and redirects to correct page', async () => {
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText('Password Admin');
    const submitButton = screen.getByRole('button', { name: /Masuk/i });

    await userEvent.type(passwordInput, 'admin123');
    fireEvent.click(submitButton);

    // Wait for redirect
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    }, { timeout: 1000 });

    const session = localStorage.getItem('pawon_session');
    expect(session).not.toBeNull();
    expect(JSON.parse(session || '{}').role).toBe('admin');
  });
});
