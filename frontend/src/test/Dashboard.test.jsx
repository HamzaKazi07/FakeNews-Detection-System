import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api/client';
import Dashboard from '../components/Dashboard';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
  unwrapApiData: (response) => response.data?.data ?? response.data,
}));

describe('Dashboard confidence statistics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses aggregate confidence for all predictions instead of the history page', async () => {
    apiClient.get.mockImplementation((path) => {
      if (path === '/api/dashboard/stats') {
        return Promise.resolve({
          data: {
            data: {
              total_predictions: 30,
              real_count: 18,
              fake_count: 12,
              feedback_correct: 4,
              feedback_incorrect: 2,
              average_confidence: 0.6,
              highest_confidence: 0.95,
              lowest_confidence: 0.2,
              daily_stats: [],
            },
          },
        });
      }
      return Promise.resolve({
        data: {
          data: {
            history: [{
              id: 1,
              news: 'Recent history item',
              prediction: 'REAL',
              confidence: 0.2,
              date: '2026-10-01T12:00:00Z',
            }],
          },
        },
      });
    });

    render(<Dashboard />);

    expect(await screen.findByText('60%')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('Lowest').nextElementSibling).toHaveTextContent('20%');
    expect(screen.getAllByText('30')).toHaveLength(2);
  });

  it('shows unavailable confidence metrics when there are no predictions', async () => {
    apiClient.get.mockImplementation((path) => Promise.resolve({
      data: {
        data: path === '/api/dashboard/stats'
          ? {
            total_predictions: 0,
            real_count: 0,
            fake_count: 0,
            feedback_correct: 0,
            feedback_incorrect: 0,
            average_confidence: null,
            highest_confidence: null,
            lowest_confidence: null,
            daily_stats: [],
          }
          : { history: [] },
      },
    }));

    render(<Dashboard />);

    expect(await screen.findByText('No analyses yet. Your classification distribution will appear here.')).toBeInTheDocument();
    expect(screen.getAllByText('N/A')).toHaveLength(3);
  });
});
