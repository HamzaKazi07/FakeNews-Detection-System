import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Register from '../components/Register';
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

const fillValidForm = async (user) => {
  await user.type(screen.getByLabelText('Full Name'), 'Test User');
  await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.type(screen.getByLabelText('Confirm Password'), 'password123');
};

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles a successful response envelope and navigates to login', async () => {
    const user = userEvent.setup();
    const setActiveTab = vi.fn();
    apiClient.post.mockResolvedValue({
      data: {
        success: true,
        data: { id: 8, name: 'Test User', email: 'test@example.com', role: 'USER' },
      },
    });

    render(<Register setActiveTab={setActiveTab} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText('Account created successfully! Please login to continue.')).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });

    await waitFor(() => expect(setActiveTab).toHaveBeenCalledWith('login'), { timeout: 1500 });
  });

  it('shows the duplicate-email error from the existing 409 error contract', async () => {
    const user = userEvent.setup();
    apiClient.post.mockRejectedValue({
      response: {
        status: 409,
        data: {
          success: false,
          error: {
            code: 'DUPLICATE_REGISTRATION',
            message: 'Email is already registered.',
          },
        },
      },
    });

    render(<Register setActiveTab={vi.fn()} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
  });

  it('shows client-side validation errors without calling the API', async () => {
    const user = userEvent.setup();

    render(<Register setActiveTab={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
