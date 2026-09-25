import styled, { css } from 'styled-components';
import { ChartCard } from '../molecules/ChartCard';
import { Spinner } from '../atoms/Spinner';
import { DonutChartRecharts } from '../organisms/charts/DonutChartRecharts';
import { BarChartCard } from '../organisms/charts/BarChartCard';
import { LineChartCard } from '../organisms/charts/LineChartCard';
import {
  StackedBarChartCard,
  type StackedBarDatum,
} from '../organisms/charts/StackedBarChartCard';
import { theme } from '../../shared/theme/theme';
import type {
  DashboardAnalytics,
  DashboardSummary,
} from '../../shared/types/api';

const CHART_PALETTE = [
  theme.colors.primary,
  theme.colors.secondary,
  theme.colors.tertiary,
  theme.colors.primaryDark,
  theme.colors.info,
] as const;

function paletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]!;
}

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

const refreshingOpacity = css<{ $refreshing?: boolean }>`
  transition: opacity 160ms ease;
  opacity: ${({ $refreshing }) => ($refreshing ? 0.72 : 1)};
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

interface DashboardChartsSectionProps {
  summary: DashboardSummary;
  analytics: DashboardAnalytics | undefined;
  analyticsReady: boolean;
  isRefreshing: boolean;
  landUseSlices: Array<{ name: string; value: number; fill: string }>;
  stackedCrops: {
    rows: StackedBarDatum[];
    series: Array<{ dataKey: string; color: string }>;
  };
  esgCarEnabled?: boolean;
}

export function DashboardChartsSection({
  summary,
  analytics,
  analyticsReady,
  isRefreshing,
  landUseSlices,
  stackedCrops,
  esgCarEnabled = false,
}: DashboardChartsSectionProps): React.JSX.Element {
  return (
    <>
      <Section>
        <SectionLabel>Distribuições</SectionLabel>
        <DonutGrid $refreshing={isRefreshing}>
          <ChartCard title="Uso do solo" filename="uso-do-solo.png" span="half">
            {(ref) => (
              <DonutChartRecharts
                ref={ref}
                compact
                centerLabel="Agricultável"
                centerValue={`${formatNumber(summary.byLandUse.arablePercentage)}%`}
                data={landUseSlices}
              />
            )}
          </ChartCard>

          <ChartCard title="Culturas plantadas" filename="culturas.png" span="half">
            {(ref) => (
              <DonutChartRecharts
                ref={ref}
                compact
                centerLabel="Culturas"
                data={summary.byCrop.map((c, i) => ({
                  name: c.crop,
                  value: c.count,
                  fill: paletteColor(i),
                }))}
              />
            )}
          </ChartCard>

          <ChartCard
            title="Fazendas por estado"
            filename="fazendas-por-uf.png"
            span="half"
          >
            {(ref) => (
              <DonutChartRecharts
                ref={ref}
                compact
                centerLabel="UFs"
                centerValue={
                  summary.byState.length
                    ? String(summary.byState.length)
                    : '—'
                }
                data={summary.byState.map((s, i) => ({
                  name: s.state,
                  value: s.count,
                  fill: paletteColor(i),
                }))}
              />
            )}
          </ChartCard>
        </DonutGrid>
      </Section>

      <Section>
        <SectionLabel>À parte do cadastro</SectionLabel>
        <DonutGrid $refreshing={isRefreshing}>
          <ChartCard title="Status CAR" filename="status-car.png" span="half">
            {(ref) => (
              <DonutChartRecharts
                ref={ref}
                compact
                centerLabel="Ativos"
                centerValue={`${formatNumber(summary.carComplianceRate)}%`}
                data={summary.byCarStatus.map((c, i) => ({
                  name: c.status,
                  value: c.count,
                  fill: paletteColor(i),
                }))}
              />
            )}
          </ChartCard>

          {esgCarEnabled ? (
            <ChartCard title="Status ESG" filename="status-esg.png" span="half">
              {(ref) => (
                <DonutChartRecharts
                  ref={ref}
                  compact
                  centerLabel="Aprovados"
                  centerValue={`${formatNumber(summary.esgComplianceRate)}%`}
                  data={summary.byEsgStatus.map((e, i) => ({
                    name: e.status,
                    value: e.count,
                    fill: paletteColor(i),
                  }))}
                />
              )}
            </ChartCard>
          ) : null}
        </DonutGrid>
        {!analyticsReady || !analytics ? (
          <Spinner />
        ) : (
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
                  data={analytics.climateRiskByState.map((r) => ({
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
                  data={analytics.climateRiskByCrop.map((r) => ({
                    name: r.crop,
                    value: r.averageScore ?? 0,
                  }))}
                />
              )}
            </ChartCard>
          </DualGrid>
        )}
      </Section>

      <Section>
        <SectionLabel>Séries e ranking</SectionLabel>
        {!analyticsReady || !analytics ? (
          <Spinner />
        ) : (
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
                  data={analytics.farmsByMonth.map((m) => ({
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

            <ChartCard
              title="Top cidades"
              filename="top-cidades.png"
              span="full"
            >
              {(ref) => (
                <BarChartCard
                  ref={ref}
                  tall
                  horizontal
                  valueLabel="Fazendas"
                  color={theme.colors.primaryDark}
                  data={analytics.topCities.map((c) => ({
                    name: `${c.city}/${c.state}`,
                    value: c.farms,
                  }))}
                />
              )}
            </ChartCard>
          </FullGrid>
        )}
      </Section>
    </>
  );
}
