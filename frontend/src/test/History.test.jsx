import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api/client';
import History from '../components/History';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
  unwrapApiData: (response) => response.data?.data ?? response.data,
}));

const historyResponse = (history, page, totalPages, totalElements) => ({
  data: {
    success: true,
    data: { history, page, size: 20, totalPages, totalElements },
  },
});

const makeHistoryItem = (id, feedback = null) => ({
  id,
  news: `Article ${id}`,
  prediction: 'REAL',
  confidence: 0.9,
  date: '2026-10-01T12:00:00Z',
  feedback,
});

describe('History pagination and feedback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('requests explicit pages and navigates between them', async () => {
    apiClient.get
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(1)], 0, 3, 45))
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(2)], 1, 3, 45))
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(3)], 2, 3, 45))
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(4)], 1, 3, 45))
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(5)], 0, 3, 45));
    const user = userEvent.setup();

    render(<History />);

    expect(await screen.findByText('Article 1')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/history', {
      params: { page: 0, size: 20 },
    });
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Article 2')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/history', {
      params: { page: 1, size: 20 },
    });
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Article 3')).toBeInTheDocument();
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Article 4')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Article 5')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it('resets pagination when the search or classification filter changes', async () => {
    apiClient.get
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(1)], 0, 3, 45))
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(2)], 1, 3, 45))
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(3)], 0, 3, 45))
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(4)], 1, 3, 45))
      .mockResolvedValueOnce(historyResponse([makeHistoryItem(5)], 0, 3, 45));
    const user = userEvent.setup();

    render(<History />);
    await screen.findByText('Article 1');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Article 2');

    await user.type(screen.getByRole('searchbox', { name: 'Search prediction history' }), 'news');
    await waitFor(() => expect(apiClient.get).toHaveBeenNthCalledWith(3, '/api/history', {
      params: { page: 0, size: 20 },
    }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(apiClient.get).toHaveBeenNthCalledWith(4, '/api/history', {
      params: { page: 1, size: 20 },
    }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter classification' }), 'fake');
    await waitFor(() => expect(apiClient.get).toHaveBeenNthCalledWith(5, '/api/history', {
      params: { page: 0, size: 20 },
    }));
  });

  it('shows submitted feedback and keeps unrated entries labeled Not rated', async () => {
    apiClient.get.mockResolvedValue(historyResponse([
      makeHistoryItem(1, 'yes'),
      makeHistoryItem(2),
    ], 0, 1, 2));

    render(<History />);

    expect(await screen.findByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Not rated')).toBeInTheDocument();
  });

  it('shows the empty-history state without pagination controls', async () => {
    apiClient.get.mockResolvedValue(historyResponse([], 0, 0, 0));

    render(<History />);

    expect(await screen.findByText('No predictions yet')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'History pagination' })).not.toBeInTheDocument();
  });
});
