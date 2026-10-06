import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import apiClient from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return {
    ...actual,
    default: {
      get: vi.fn(),
    },
  };
});

vi.mock('../components/Home', () => ({ default: () => <div>Home page</div> }));
vi.mock('../components/Login', () => ({ default: () => <div>Login page</div> }));
vi.mock('../components/Register', () => ({ default: () => <div>Register page</div> }));
vi.mock('../components/CheckNews', () => ({ default: () => <div>Check News page</div> }));
vi.mock('../components/Dashboard', () => ({ default: () => <div>Dashboard page</div> }));
vi.mock('../components/History', () => ({ default: () => <div>History page</div> }));
vi.mock('../components/About', () => ({ default: () => <div>About page</div> }));
vi.mock('../components/AdminPanel', () => ({ default: () => <div>Admin panel</div> }));

describe('App session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('restores and normalizes an authenticated user from /api/auth/me', async () => {
    localStorage.setItem('token', 'jwt-token');
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 7,
          name: 'Restored Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      },
    });

    render(<App />);

    expect((await screen.findAllByText((_, element) => element?.textContent?.includes('Restored Admin') ?? false)).length).toBeGreaterThan(0);
    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me');
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
  });

  it('renders unauthenticated state without calling /api/auth/me when no token exists', async () => {
    render(<App />);

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('clears an invalid session when /api/auth/me fails', async () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Stale User', role: 'admin' }));
    apiClient.get.mockRejectedValue(new Error('Unauthorized'));

    render(<App />);

    await waitFor(() => expect(screen.getByText('Home page')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('shows the Admin page only for an authenticated ADMIN user', async () => {
    localStorage.setItem('token', 'jwt-token');
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 7,
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      },
    });

    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Admin' }));
    expect(screen.getByText('Admin panel')).toBeInTheDocument();
  });

  it('does not show Admin navigation or page to a USER', async () => {
    localStorage.setItem('token', 'jwt-token');
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 8,
          name: 'Regular User',
          email: 'user@example.com',
          role: 'USER',
        },
      },
    });

    render(<App />);

    await screen.findByText('Home page');
    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
  });
});
