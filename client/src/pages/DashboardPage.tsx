import { useDeferredValue, useMemo, useState, useTransition } from 'react';
import styled, { css } from 'styled-components';
import { useGetDashboardStatsQuery } from '../store/api/apiSlice';
import { KpiCard } from '../components/molecules/KpiCard';
import { Spinner } from '../components/atoms/Spinner';
import { Button } from '../components/atoms/Button';
import { ChartCard } from '../components/molecules/ChartCard';
import { DashboardFiltersBar } from '../components/molecules/DashboardFiltersBar';
import { DonutChartRecharts } from '../components/organisms/charts/DonutChartRecharts';
import { BarChartCard } from '../components/organisms/charts/BarChartCard';
import { LineChartCard } from '../components/organisms/charts/LineChartCard';
import {
  StackedBarChartCard,
  type StackedBarDatum,
} from '../components/organisms/charts/StackedBarChartCard';
import { exportToExcel } from '../shared/lib/export-excel';
import { theme } from '../shared/theme/theme';
import type { DashboardFilters, DashboardStats } from '../shared/types/api';

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

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SectionLabel = styled.h2`
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const refreshingOpacity = css<{ $refreshing?: boolean }>`
  transition: opacity 160ms ease;
  opacity: ${({ $refreshing }) => ($refreshing ? 0.72 : 1)};
`;

const DonutGrid = styled.div<{ $refreshing?: boolean }>`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  ${refreshingOpacity}

  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    grid-template-columns: 1fr;
  }
`;

const DualGrid = styled.div<{ $refreshing?: boolean }>`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  ${refreshingOpacity}

  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    grid-template-columns: 1fr;
  }
`;

const FullGrid = styled.div<{ $refreshing?: boolean }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  ${refreshingOpacity}
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

function buildExcelSheets(data: DashboardStats) {
  return [
    {
      name: 'KPIs',
      rows: [
        { metrica: 'Total de fazendas', valor: data.totalFarms },
        { metrica: 'Área total (ha)', valor: data.totalHectares },
        { metrica: 'Área média/fazenda (ha)', valor: data.averageFarmSize },
        { metrica: 'Conformidade CAR (%)', valor: data.carComplianceRate },
        { metrica: 'Conformidade ESG (%)', valor: data.esgComplianceRate },
        {
          metrica: 'Risco climático médio',
          valor: data.regionalClimateRisk.averageScore,
        },
      ],
    },
    {
      name: 'Por UF',
      rows: data.byState.map((s) => ({
        uf: s.state,
        fazendas: s.count,
        hectares: s.hectares,
        percentual: s.percentage,
      })),
    },
    {
      name: 'Por cultura',
      rows: data.byCrop.map((c) => ({
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
          hectares: data.byLandUse.arableHectares,
          percentual: data.byLandUse.arablePercentage,
        },
        {
          tipo: 'Vegetação',
          hectares: data.byLandUse.vegetationHectares,
          percentual: data.byLandUse.vegetationPercentage,
        },
      ],
    },
    {
      name: 'CAR',
      rows: data.byCarStatus.map((c) => ({
        status: c.status,
        quantidade: c.count,
        percentual: c.percentage,
      })),
    },
    {
      name: 'ESG',
      rows: data.byEsgStatus.map((e) => ({
        status: e.status,
        quantidade: e.count,
        percentual: e.percentage,
      })),
    },
    {
      name: 'Risco por UF',
      rows: data.climateRiskByState.map((r) => ({
        uf: r.state,
        riscoMedio: r.averageScore,
        fazendasComScore: r.farmsWithScore,
      })),
    },
    {
      name: 'Risco por cultura',
      rows: data.climateRiskByCrop.map((r) => ({
        cultura: r.crop,
        riscoMedio: r.averageScore,
        fazendasComScore: r.farmsWithScore,
      })),
    },
    {
      name: 'Culturas por safra',
      rows: data.cropsByYear.map((c) => ({
        safra: c.year,
        cultura: c.crop,
        quantidade: c.count,
      })),
    },
    {
      name: 'Evolucao',
      rows: data.farmsByMonth.map((m) => ({
        mes: m.month,
        fazendas: m.farms,
        hectares: m.hectares,
      })),
    },
    {
      name: 'Top cidades',
      rows: data.topCities.map((c) => ({
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
  const deferredFilters = useDeferredValue(filters);
  const queryFilters = useMemo(
    () => cleanFilters(deferredFilters),
    [deferredFilters],
  );

  const { data, isLoading, isError, error, isFetching } =
    useGetDashboardStatsQuery(queryFilters);

  const harvestYears = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.cropsByYear.map((c) => c.year))].sort();
  }, [data]);

  const stackedCrops = useMemo(() => {
    if (!data) {
      return {
        rows: [] as StackedBarDatum[],
        series: [] as Array<{ dataKey: string; color: string }>,
      };
    }
    const years = [...new Set(data.cropsByYear.map((c) => c.year))].sort();
    const crops = [...new Set(data.cropsByYear.map((c) => c.crop))];
    const lookup = new Map(
      data.cropsByYear.map((c) => [`${c.year}|${c.crop}`, c.count]),
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
  }, [data]);

  const landUseSlices = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: 'Agricultável',
        value: data.byLandUse.arableHectares,
        fill: theme.colors.primary,
      },
      {
        name: 'Vegetação',
        value: data.byLandUse.vegetationHectares,
        fill: theme.colors.secondary,
      },
    ];
  }, [data]);

  const handleFiltersChange = (next: DashboardFilters): void => {
    startTransition(() => {
      setFilters(next);
    });
  };

  const isRefreshing = isFetching || isPending;

  if (isLoading && !data) {
    return <Spinner />;
  }

  if (isError || !data) {
    return (
      <p role="alert">
        Falha ao carregar dashboard.{' '}
        {typeof error === 'object' && error && 'status' in error
          ? `HTTP ${String(error.status)}`
          : null}
      </p>
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
          onClick={() =>
            exportToExcel(buildExcelSheets(data), 'dashboard-analitico.xlsx')
          }
        >
          Exportar Excel
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
          value={formatNumber(data.totalFarms)}
          icon="home_work"
        />
        <KpiCard
          label="Área Total"
          value={formatNumber(data.totalHectares)}
          unit="ha"
          icon="landscape"
        />
        <KpiCard
          label="Área Agricultável"
          value={formatNumber(data.byLandUse.arableHectares)}
          unit="ha"
          icon="agriculture"
        />
        <KpiCard
          label="Risco Climático Médio"
          value={
            data.regionalClimateRisk.averageScore === null
              ? '—'
              : formatNumber(data.regionalClimateRisk.averageScore)
          }
          icon="thermostat"
        />
        <KpiCard
          label="Área média / fazenda"
          value={formatNumber(data.averageFarmSize)}
          unit="ha"
          icon="landscape"
        />
        <KpiCard
          label="Conformidade CAR"
          value={formatNumber(data.carComplianceRate)}
          unit="%"
          icon="verified"
        />
        <KpiCard
          label="Conformidade ESG"
          value={formatNumber(data.esgComplianceRate)}
          unit="%"
          icon="eco"
        />
      </KpiGrid>

      <Section>
        <SectionLabel>Distribuições</SectionLabel>
        <DonutGrid $refreshing={isRefreshing}>
          <ChartCard title="Uso do Solo" filename="uso-do-solo.png" span="half">
            {(ref) => (
              <DonutChartRecharts
                ref={ref}
                compact
                centerLabel="Agricultável"
                centerValue={`${formatNumber(data.byLandUse.arablePercentage)}%`}
                data={landUseSlices}
              />
            )}
          </ChartCard>

          <ChartCard title="Culturas" filename="culturas.png" span="half">
            {(ref) => (
              <DonutChartRecharts
                ref={ref}
                compact
                centerLabel="Culturas"
                data={data.byCrop.map((c, i) => ({
                  name: c.crop,
                  value: c.count,
                  fill: paletteColor(i),
                }))}
              />
            )}
          </ChartCard>

          <ChartCard
            title="Fazendas por UF"
            filename="fazendas-por-uf.png"
            span="half"
          >
            {(ref) => (
              <DonutChartRecharts
                ref={ref}
                compact
                centerLabel="UFs"
                centerValue={
                  data.byState.length ? String(data.byState.length) : '—'
                }
                data={data.byState.map((s, i) => ({
                  name: s.state,
                  value: s.count,
                  fill: paletteColor(i),
                }))}
              />
            )}
          </ChartCard>

          <ChartCard title="Status CAR" filename="status-car.png" span="half">
            {(ref) => (
              <DonutChartRecharts
                ref={ref}
                compact
                centerLabel="Ativos"
                centerValue={`${formatNumber(data.carComplianceRate)}%`}
                data={data.byCarStatus.map((c, i) => ({
                  name: c.status,
                  value: c.count,
                  fill: paletteColor(i),
                }))}
              />
            )}
          </ChartCard>

          <ChartCard title="Status ESG" filename="status-esg.png" span="half">
            {(ref) => (
              <DonutChartRecharts
                ref={ref}
                compact
                centerLabel="Aprovados"
                centerValue={`${formatNumber(data.esgComplianceRate)}%`}
                data={data.byEsgStatus.map((e, i) => ({
                  name: e.status,
                  value: e.count,
                  fill: paletteColor(i),
                }))}
              />
            )}
          </ChartCard>
        </DonutGrid>
      </Section>

      <Section>
        <SectionLabel>Risco climático</SectionLabel>
        <DualGrid $refreshing={isRefreshing}>
          <ChartCard
            title="Risco por UF"
            filename="risco-por-uf.png"
            span="half"
          >
            {(ref) => (
              <BarChartCard
                ref={ref}
                valueLabel="Risco médio"
                color={theme.colors.tertiary}
                data={data.climateRiskByState.map((r) => ({
                  name: r.state,
                  value: r.averageScore ?? 0,
                }))}
              />
            )}
          </ChartCard>

          <ChartCard
            title="Risco por cultura"
            filename="risco-por-cultura.png"
            span="half"
          >
            {(ref) => (
              <BarChartCard
                ref={ref}
                valueLabel="Risco médio"
                color={theme.colors.info}
                data={data.climateRiskByCrop.map((r) => ({
                  name: r.crop,
                  value: r.averageScore ?? 0,
                }))}
              />
            )}
          </ChartCard>
        </DualGrid>
      </Section>

      <Section>
        <SectionLabel>Séries e ranking</SectionLabel>
        <FullGrid $refreshing={isRefreshing}>
          <ChartCard
            title="Culturas por safra"
            filename="culturas-por-safra.png"
            span="full"
          >
            {(ref) => (
              <StackedBarChartCard
                ref={ref}
                tall
                data={stackedCrops.rows}
                series={stackedCrops.series}
              />
            )}
          </ChartCard>

          <ChartCard
            title="Evolução temporal"
            filename="evolucao-temporal.png"
            span="full"
          >
            {(ref) => (
              <LineChartCard
                ref={ref}
                tall
                data={data.farmsByMonth.map((m) => ({
                  name: m.month,
                  farms: m.farms,
                  hectares: m.hectares,
                }))}
                series={[
                  {
                    dataKey: 'farms',
                    color: theme.colors.primary,
                    name: 'Fazendas',
                  },
                  {
                    dataKey: 'hectares',
                    color: theme.colors.secondary,
                    name: 'Hectares',
                  },
                ]}
              />
            )}
          </ChartCard>

          <ChartCard title="Top cidades" filename="top-cidades.png" span="full">
            {(ref) => (
              <BarChartCard
                ref={ref}
                tall
                horizontal
                valueLabel="Fazendas"
                color={theme.colors.primaryDark}
                data={data.topCities.map((c) => ({
                  name: `${c.city}/${c.state}`,
                  value: c.farms,
                }))}
              />
            )}
          </ChartCard>
        </FullGrid>
      </Section>
    </Page>
  );
}
