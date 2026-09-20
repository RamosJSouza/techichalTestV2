import { lazy, Suspense, useDeferredValue, useMemo, useState, useTransition } from 'react';
import styled from 'styled-components';
import {
  useGetDashboardAnalyticsQuery,
  useGetDashboardSummaryQuery,
} from '../store/api/apiSlice';
import { KpiCard } from '../components/molecules/KpiCard';
import { Spinner } from '../components/atoms/Spinner';
import { Button } from '../components/atoms/Button';
import { ErrorRetryPanel } from '../components/molecules/ErrorRetryPanel';
import { DashboardFiltersBar } from '../components/molecules/DashboardFiltersBar';
import type { StackedBarDatum } from '../components/organisms/charts/StackedBarChartCard';
import { theme } from '../shared/theme/theme';
import type {
  DashboardAnalytics,
  DashboardFilters,
  DashboardSummary,
} from '../shared/types/api';

const DashboardChartsSection = lazy(async () => {
  const mod = await import('../components/organisms/DashboardChartsSection');
  return { default: mod.DashboardChartsSection };
});

const CHART_PALETTE = [
  theme.colors.primary,
  theme.colors.secondary,
  theme.colors.tertiary,
  theme.colors.primaryDark,
  theme.colors.info,
] as const;

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.tabletMax}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    grid-template-columns: 1fr;
  }
`;

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

const STRING_FILTER_KEYS = [
  'state',
  'crop',
  'harvestYear',
  'esgStatus',
  'carStatus',
] as const satisfies ReadonlyArray<keyof DashboardFilters>;

function cleanFilters(filters: DashboardFilters): DashboardFilters {
  const next: DashboardFilters = {};
  for (const key of STRING_FILTER_KEYS) {
    const value = filters[key];
    if (typeof value === 'string' && value.length > 0) {
      next[key] = value;
    }
  }
  if (filters.minClimateRisk !== undefined) {
    next.minClimateRisk = filters.minClimateRisk;
  }
  if (filters.maxClimateRisk !== undefined) {
    next.maxClimateRisk = filters.maxClimateRisk;
  }
  return next;
}

function paletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]!;
}

function buildExportSheets(
  summary: DashboardSummary,
  analytics: DashboardAnalytics,
) {
  return [
    {
      name: 'KPIs',
      rows: [
        { metrica: 'Total de fazendas', valor: summary.totalFarms },
        { metrica: 'Área total (ha)', valor: summary.totalHectares },
        { metrica: 'Área média/fazenda (ha)', valor: summary.averageFarmSize },
        { metrica: 'Conformidade CAR (%)', valor: summary.carComplianceRate },
        { metrica: 'Conformidade ESG (%)', valor: summary.esgComplianceRate },
        {
          metrica: 'Risco climático médio',
          valor: summary.regionalClimateRisk.averageScore,
        },
      ],
    },
    {
      name: 'Por UF',
      rows: summary.byState.map((s) => ({
        uf: s.state,
        fazendas: s.count,
        hectares: s.hectares,
        percentual: s.percentage,
      })),
    },
    {
      name: 'Por cultura',
      rows: summary.byCrop.map((c) => ({
        cultura: c.crop,
        quantidade: c.count,
        percentual: c.percentage,
      })),
    },
    {
      name: 'Uso do solo',
      rows: [
        {
          tipo: 'Agricultável',
          hectares: summary.byLandUse.arableHectares,
          percentual: summary.byLandUse.arablePercentage,
        },
        {
          tipo: 'Vegetação',
          hectares: summary.byLandUse.vegetationHectares,
          percentual: summary.byLandUse.vegetationPercentage,
        },
      ],
    },
    {
      name: 'CAR',
      rows: summary.byCarStatus.map((c) => ({
        status: c.status,
        quantidade: c.count,
        percentual: c.percentage,
      })),
    },
    {
      name: 'ESG',
      rows: summary.byEsgStatus.map((e) => ({
        status: e.status,
        quantidade: e.count,
        percentual: e.percentage,
      })),
    },
    {
      name: 'Risco por UF',
      rows: analytics.climateRiskByState.map((r) => ({
        uf: r.state,
        riscoMedio: r.averageScore,
        fazendasComScore: r.farmsWithScore,
      })),
    },
    {
      name: 'Risco por cultura',
      rows: analytics.climateRiskByCrop.map((r) => ({
        cultura: r.crop,
        riscoMedio: r.averageScore,
        fazendasComScore: r.farmsWithScore,
      })),
    },
    {
      name: 'Culturas por safra',
      rows: analytics.cropsByYear.map((c) => ({
        safra: c.year,
        cultura: c.crop,
        quantidade: c.count,
      })),
    },
    {
      name: 'Evolucao',
      rows: analytics.farmsByMonth.map((m) => ({
        mes: m.month,
        fazendas: m.farms,
        hectares: m.hectares,
      })),
    },
    {
      name: 'Top cidades',
      rows: analytics.topCities.map((c) => ({
        cidade: c.city,
        uf: c.state,
        fazendas: c.farms,
        hectares: c.hectares,
      })),
    },
  ];
}

export function DashboardPage(): React.JSX.Element {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);
  const deferredFilters = useDeferredValue(filters);
  const queryFilters = useMemo(
    () => cleanFilters(deferredFilters),
    [deferredFilters],
  );

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    error,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useGetDashboardSummaryQuery(queryFilters);

  const {
    data: analytics,
    isLoading: analyticsLoading,
    isFetching: analyticsFetching,
    refetch: refetchAnalytics,
  } = useGetDashboardAnalyticsQuery(queryFilters);

  const harvestYears = useMemo(() => {
    if (!analytics) return [];
    return [...new Set(analytics.cropsByYear.map((c) => c.year))].sort();
  }, [analytics]);

  const stackedCrops = useMemo(() => {
    if (!analytics) {
      return {
        rows: [] as StackedBarDatum[],
        series: [] as Array<{ dataKey: string; color: string }>,
      };
    }
    const years = [...new Set(analytics.cropsByYear.map((c) => c.year))].sort();
    const crops = [...new Set(analytics.cropsByYear.map((c) => c.crop))];
    const lookup = new Map(
      analytics.cropsByYear.map((c) => [`${c.year}|${c.crop}`, c.count]),
    );
    const rows: StackedBarDatum[] = years.map((year) => {
      const row: StackedBarDatum = { name: year };
      for (const crop of crops) {
        row[crop] = lookup.get(`${year}|${crop}`) ?? 0;
      }
      return row;
    });
    const series = crops.map((crop, i) => ({
      dataKey: crop,
      color: paletteColor(i),
    }));
    return { rows, series };
  }, [analytics]);

  const landUseSlices = useMemo(() => {
    if (!summary) return [];
    return [
      {
        name: 'Agricultável',
        value: summary.byLandUse.arableHectares,
        fill: theme.colors.primary,
      },
      {
        name: 'Vegetação',
        value: summary.byLandUse.vegetationHectares,
        fill: theme.colors.secondary,
      },
    ];
  }, [summary]);

  const handleFiltersChange = (next: DashboardFilters): void => {
    startTransition(() => {
      setFilters(next);
    });
  };

  const handleRetry = (): void => {
    void refetchSummary();
    void refetchAnalytics();
  };

  const handleExportCsv = async (): Promise<void> => {
    if (!summary || !analytics || exporting) return;
    setExporting(true);
    try {
      const { exportToCsv } = await import('../shared/lib/export-csv');
      exportToCsv(buildExportSheets(summary, analytics), 'dashboard-analitico');
    } finally {
      setExporting(false);
    }
  };

  const isRefreshing = summaryFetching || analyticsFetching || isPending;
  const analyticsReady = Boolean(analytics) && !analyticsLoading;

  if (summaryLoading && !summary) {
    return <Spinner />;
  }

  if (summaryError || !summary) {
    const statusDetail =
      typeof error === 'object' && error && 'status' in error
        ? `HTTP ${String(error.status)}`
        : undefined;
    return (
      <ErrorRetryPanel
        message="Falha ao carregar dashboard."
        detail={statusDetail}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <Page>
      <TitleRow>
        <TitleBlock>
          <Title>Dashboard Analítico</Title>
          <Subtitle>
            Visão consolidada de fazendas, conformidade e risco climático
          </Subtitle>
        </TitleBlock>
        <Button
          type="button"
          variant="secondary"
          disabled={!analytics || exporting}
          aria-busy={exporting}
          onClick={() => {
            void handleExportCsv();
          }}
        >
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </Button>
      </TitleRow>

      <DashboardFiltersBar
        value={filters}
        onChange={handleFiltersChange}
        harvestYears={harvestYears}
        isRefreshing={isRefreshing}
      />

      <KpiGrid>
        <KpiCard
          label="Total de Fazendas"
          value={formatNumber(summary.totalFarms)}
          icon="home_work"
        />
        <KpiCard
          label="Área Total"
          value={formatNumber(summary.totalHectares)}
          unit="ha"
          icon="landscape"
        />
        <KpiCard
          label="Área Agricultável"
          value={formatNumber(summary.byLandUse.arableHectares)}
          unit="ha"
          icon="agriculture"
        />
        <KpiCard
          label="Risco Climático Médio"
          value={
            summary.regionalClimateRisk.averageScore === null
              ? '—'
              : formatNumber(summary.regionalClimateRisk.averageScore)
          }
          icon="thermostat"
        />
        <KpiCard
          label="Área média / fazenda"
          value={formatNumber(summary.averageFarmSize)}
          unit="ha"
          icon="landscape"
        />
        <KpiCard
          label="Conformidade CAR"
          value={formatNumber(summary.carComplianceRate)}
          unit="%"
          icon="verified"
        />
        <KpiCard
          label="Conformidade ESG"
          value={formatNumber(summary.esgComplianceRate)}
          unit="%"
          icon="eco"
        />
      </KpiGrid>

      <Suspense fallback={<Spinner />}>
        <DashboardChartsSection
          summary={summary}
          analytics={analytics}
          analyticsReady={analyticsReady}
          isRefreshing={isRefreshing}
          landUseSlices={landUseSlices}
          stackedCrops={stackedCrops}
        />
      </Suspense>
    </Page>
  );
}
