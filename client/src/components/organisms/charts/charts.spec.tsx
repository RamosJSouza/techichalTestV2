import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { DonutChartRecharts } from './DonutChartRecharts';
import { BarChartCard } from './BarChartCard';
import { LineChartCard } from './LineChartCard';
import { StackedBarChartCard } from './StackedBarChartCard';
import { theme } from '../../../shared/theme/theme';

jest.mock('recharts', () => {
  const React = require('react') as typeof import('react');
  const Passthrough = ({
    children,
  }: {
    children?: React.ReactNode;
  }): React.ReactElement => React.createElement('div', null, children);
  return {
    ResponsiveContainer: Passthrough,
    PieChart: Passthrough,
    Pie: Passthrough,
    Cell: (): null => null,
    BarChart: Passthrough,
    Bar: (): null => null,
    LineChart: Passthrough,
    Line: (): null => null,
    XAxis: (): null => null,
    YAxis: (): null => null,
    CartesianGrid: (): null => null,
    Tooltip: (): null => null,
    Legend: (): null => null,
  };
});

function withTheme(node: React.ReactElement): React.ReactElement {
  return <ThemeProvider theme={theme}>{node}</ThemeProvider>;
}

describe('chart wrappers', () => {
  it('renderiza DonutChartRecharts com valor central', () => {
    render(
      withTheme(
        <DonutChartRecharts
          data={[{ name: 'Agricultável', value: 100, fill: '#2E7D32' }]}
          centerLabel="Uso"
          centerValue="70%"
        />,
      ),
    );
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('Uso')).toBeInTheDocument();
  });

  it('renderiza BarChartCard', () => {
    const { container } = render(
      withTheme(
        <BarChartCard data={[{ name: 'SP', value: 5 }]} valueLabel="Fazendas" />,
      ),
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renderiza LineChartCard', () => {
    const { container } = render(
      withTheme(
        <LineChartCard
          data={[{ name: '2025-01', farms: 2 }]}
          series={[{ dataKey: 'farms', color: '#2E7D32', name: 'Fazendas' }]}
        />,
      ),
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renderiza StackedBarChartCard', () => {
    const { container } = render(
      withTheme(
        <StackedBarChartCard
          data={[{ name: '2025/2026', Soja: 4, Milho: 2 }]}
          series={[
            { dataKey: 'Soja', color: '#2E7D32' },
            { dataKey: 'Milho', color: '#F9A825' },
          ]}
        />,
      ),
    );
    expect(container.firstChild).toBeTruthy();
  });
});
