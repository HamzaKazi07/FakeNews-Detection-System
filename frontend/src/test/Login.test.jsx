import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '../components/Login';
import apiClient from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return {
    ...actual,
    default: {
      post: vi.fn(),
    },
  };
});

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('normalizes the backend role, stores the session, and calls the success callback', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    const setActiveTab = vi.fn();
    apiClient.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          token: 'jwt-token',
          user: { id: 7, name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' },
        },
      },
    });

    render(<Login onLoginSuccess={onLoginSuccess} setActiveTab={setActiveTab} />);
    await user.type(screen.getByLabelText('Email Address'), 'Admin@Example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith({
      id: 7,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    }));
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123',
    });
    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({
      id: 7,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    });
    expect(setActiveTab).toHaveBeenCalledWith('check');
  });

  it('shows the invalid-credentials error for a 401 response', async () => {
    const user = userEvent.setup();
    apiClient.post.mockRejectedValue({ response: { status: 401 } });

    render(<Login onLoginSuccess={vi.fn()} setActiveTab={vi.fn()} />);
    await user.type(screen.getByLabelText('Email Address'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });
});
