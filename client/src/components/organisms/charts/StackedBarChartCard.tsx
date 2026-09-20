import { forwardRef } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import styled from 'styled-components';

const Wrap = styled.div<{ $tall?: boolean }>`
  width: 100%;
  height: ${({ $tall }) => ($tall ? '320px' : '280px')};
`;

export interface StackedBarDatum {
  name: string;
  [key: string]: string | number;
}

interface StackedSeries {
  dataKey: string;
  color: string;
  name?: string;
}

interface StackedBarChartCardProps {
  data: StackedBarDatum[];
  series: StackedSeries[];
  tall?: boolean;
}

export const StackedBarChartCard = forwardRef<
  unknown,
  StackedBarChartCardProps
>(function StackedBarChartCard({ data, series, tall = false }, ref) {
  return (
    <Wrap $tall={tall}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          ref={ref as React.Ref<typeof BarChart>}
          data={data}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {series.map((s) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              stackId="stack"
              fill={s.color}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Wrap>
  );
});
