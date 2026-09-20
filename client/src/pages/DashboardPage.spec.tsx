import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { DashboardPage } from './DashboardPage';
import { theme } from '../shared/theme/theme';

const refetchSummary = jest.fn();
const refetchAnalytics = jest.fn();

jest.mock('../store/api/apiSlice', () => ({
  useGetDashboardSummaryQuery: jest.fn(),
  useGetDashboardAnalyticsQuery: jest.fn(),
}));

import {
  useGetDashboardAnalyticsQuery,
  useGetDashboardSummaryQuery,
} from '../store/api/apiSlice';

const mockSummary = useGetDashboardSummaryQuery as jest.Mock;
const mockAnalytics = useGetDashboardAnalyticsQuery as jest.Mock;

describe('DashboardPage — erro HTTP e retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      refetch: refetchAnalytics,
    });
  });

  it('exibe alerta com status HTTP e botão de retry', async () => {
    mockSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 503 },
      isFetching: false,
      refetch: refetchSummary,
    });

    render(
      <ThemeProvider theme={theme}>
        <DashboardPage />
      </ThemeProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Falha ao carregar dashboard/i,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/HTTP 503/);

    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    await waitFor(() => {
      expect(refetchSummary).toHaveBeenCalled();
      expect(refetchAnalytics).toHaveBeenCalled();
    });
  });
});
