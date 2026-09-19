import styled from 'styled-components';
import { useGetDashboardStatsQuery } from '../store/api/apiSlice';
import { KpiCard } from '../components/molecules/KpiCard';
import { Spinner } from '../components/atoms/Spinner';
import { DonutChart } from '../components/organisms/DonutChart';
import { theme } from '../shared/theme/theme';

const CHART_PALETTE = [
  theme.colors.primary,
  theme.colors.secondary,
  theme.colors.tertiary,
  theme.colors.primaryDark,
  theme.colors.info,
] as const;

const Title = styled.h1`
  margin: 0 0 ${({ theme }) => theme.spacing.lg};
  font-size: 2rem;
  font-weight: 700;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.tabletMax}) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    grid-template-columns: 1fr;
  }
`;

const Panels = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.level1};
`;

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function DashboardPage(): React.JSX.Element {
  const { data, isLoading, isError, error } = useGetDashboardStatsQuery();

  if (isLoading) {
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
    <div>
      <Title>Dashboard Analítico</Title>
      <Grid>
        <KpiCard
          label="Total de Fazendas Cadastradas"
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
      </Grid>
      <Panels>
        <Panel>
          <h2>Uso do Solo</h2>
          <DonutChart
            centerLabel="Uso do solo"
            centerValue={`${formatNumber(data.byLandUse.arablePercentage)}%`}
            slices={[
              {
                label: 'Agricultável',
                value: data.byLandUse.arableHectares,
                color: theme.colors.primary,
              },
              {
                label: 'Vegetação',
                value: data.byLandUse.vegetationHectares,
                color: theme.colors.secondary,
              },
            ]}
          />
        </Panel>
        <Panel>
          <h2>Culturas</h2>
          <DonutChart
            centerLabel="Culturas"
            slices={data.byCrop.map((c, i) => ({
              label: c.crop,
              value: c.count,
              color: CHART_PALETTE[i % CHART_PALETTE.length]!,
            }))}
          />
        </Panel>
        <Panel>
          <h2>Fazendas por UF</h2>
          <DonutChart
            centerLabel="por UF"
            centerValue={
              data.byState.length
                ? `${data.byState.length} UFs`
                : '—'
            }
            slices={data.byState.map((s, i) => ({
              label: s.state,
              value: s.count,
              color: CHART_PALETTE[i % CHART_PALETTE.length]!,
            }))}
          />
          <ul style={{ marginTop: 16, paddingLeft: 18 }}>
            {data.byState.map((s) => (
              <li key={s.state}>
                <strong>{s.state}</strong>: {formatNumber(s.hectares)} ha (
                {s.percentage}%)
              </li>
            ))}
          </ul>
        </Panel>
      </Panels>
    </div>
  );
}
