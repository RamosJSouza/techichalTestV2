import { forwardRef } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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

interface BarDatum {
  name: string;
  value: number;
}

interface BarChartCardProps {
  data: BarDatum[];
  horizontal?: boolean;
  valueLabel?: string;
  color?: string;
  tall?: boolean;
}

export const BarChartCard = forwardRef<unknown, BarChartCardProps>(
  function BarChartCard(
    {
      data,
      horizontal = false,
      valueLabel = 'Valor',
      color = '#2E7D32',
      tall = false,
    },
    ref,
  ) {
    return (
      <Wrap $tall={tall}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            ref={ref as React.Ref<typeof BarChart>}
            data={data}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            {horizontal ? (
              <>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" />
                <YAxis />
              </>
            )}
            <Tooltip
              formatter={(value) =>
                typeof value === 'number'
                  ? value.toLocaleString('pt-BR')
                  : String(value)
              }
            />
            <Bar dataKey="value" name={valueLabel} fill={color} radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </Wrap>
    );
  },
);
