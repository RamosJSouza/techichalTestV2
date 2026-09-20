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

jest.mock('../shared/lib/export-csv', () => ({
  __esModule: true,
  exportToCsv: jest.fn(),
}));

jest.mock('../components/organisms/DashboardChartsSection', () => ({
  DashboardChartsSection: () => (
    <div data-testid="dashboard-charts">charts</div>
  ),
}));

import {
  useGetDashboardAnalyticsQuery,
  useGetDashboardSummaryQuery,
} from '../store/api/apiSlice';
import { exportToCsv } from '../shared/lib/export-csv';

const mockSummary = useGetDashboardSummaryQuery as jest.Mock;
const mockAnalytics = useGetDashboardAnalyticsQuery as jest.Mock;
const mockExport = exportToCsv as jest.Mock;

const summaryData = {
  totalFarms: 10,
  totalHectares: 1000,
  averageFarmSize: 100,
  carComplianceRate: 80,
  esgComplianceRate: 90,
  byState: [{ state: 'SP', count: 5, hectares: 500, percentage: 50 }],
  byCrop: [{ crop: 'Soja', count: 5, percentage: 50 }],
  byLandUse: {
    arableHectares: 600,
    vegetationHectares: 200,
    arablePercentage: 60,
    vegetationPercentage: 20,
  },
  regionalClimateRisk: { averageScore: 42, farmsWithScore: 8 },
  byCarStatus: [{ status: 'ACTIVE', count: 8, percentage: 80 }],
  byEsgStatus: [{ status: 'APPROVED', count: 9, percentage: 90 }],
};

const analyticsData = {
  climateRiskByState: [
    { state: 'SP', averageScore: 40, farmsWithScore: 5 },
  ],
  climateRiskByCrop: [
    { crop: 'Soja', averageScore: 41, farmsWithScore: 5 },
  ],
  cropsByYear: [{ year: '2025/2026', crop: 'Soja', count: 5 }],
  farmsByMonth: [{ month: '2026-01', farms: 2, hectares: 100 }],
  topCities: [{ city: 'Campinas', state: 'SP', farms: 3, hectares: 200 }],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exibe alerta com status HTTP e botão de retry', async () => {
    mockAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      refetch: refetchAnalytics,
    });
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

  it('happy path: KPIs e seção de charts', async () => {
    mockSummary.mockReturnValue({
      data: summaryData,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: refetchSummary,
    });
    mockAnalytics.mockReturnValue({
      data: analyticsData,
      isLoading: false,
      isFetching: false,
      refetch: refetchAnalytics,
    });

    render(
      <ThemeProvider theme={theme}>
        <DashboardPage />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole('heading', { name: /Dashboard Analítico/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Total de Fazendas')).toBeInTheDocument();
    expect(await screen.findByTestId('dashboard-charts')).toBeInTheDocument();
  });

  it('Exportar CSV chama exportToCsv', async () => {
    mockSummary.mockReturnValue({
      data: summaryData,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: refetchSummary,
    });
    mockAnalytics.mockReturnValue({
      data: analyticsData,
      isLoading: false,
      isFetching: false,
      refetch: refetchAnalytics,
    });

    render(
      <ThemeProvider theme={theme}>
        <DashboardPage />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));

    await waitFor(() => {
      expect(mockExport).toHaveBeenCalled();
    });
    expect(mockExport.mock.calls[0]?.[1]).toBe('dashboard-analitico');
  });
});
