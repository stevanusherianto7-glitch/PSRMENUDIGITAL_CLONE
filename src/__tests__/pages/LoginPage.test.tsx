import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../app/pages/LoginPage';

// Mock router navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock supabase client auth methods
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
    }
  }
}));

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();

    // Default mock behavior
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            nama: "Admin Kedai Elvera 57",
            role: "admin"
          }
        }
      },
      error: null
    });
  });

  it('render semua 3 role buttons', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /waiter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dapur/i })).toBeInTheDocument();
  });

  it('login admin berhasil dengan password benar', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    fireEvent.change(screen.getByPlaceholderText(/Password Admin/i), {
      target: { value: '[REDACTED_ADMIN_PASSWORD]' },
    });
    fireEvent.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
      const session = JSON.parse(localStorage.getItem('pawon_session') || '{}');
      expect(session.role).toBe('admin');
    });
  });

  it('login gagal dengan password salah', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Password salah. Coba lagi." }
    });

    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText(/Password Admin/i), {
      target: { value: 'wrong_password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password salah/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('kitchen role redirect ke /kitchen', async () => {
    // Setup login kitchen success response
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            nama: "Dapur",
            role: "kitchen"
          }
        }
      },
      error: null
    });

    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /dapur/i }));
    fireEvent.change(screen.getByPlaceholderText(/Password Dapur/i), {
      target: { value: '[REDACTED_KITCHEN_PASSWORD]' },
    });
    fireEvent.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/kitchen');
    });
  });
});
