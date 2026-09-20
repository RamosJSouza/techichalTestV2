import { forwardRef } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

interface LineDatum {
  name: string;
  [key: string]: string | number;
}

interface LineSeries {
  dataKey: string;
  color: string;
  name?: string;
}

interface LineChartCardProps {
  data: LineDatum[];
  series: LineSeries[];
  tall?: boolean;
}

export const LineChartCard = forwardRef<unknown, LineChartCardProps>(
  function LineChartCard({ data, series, tall = false }, ref) {
    return (
      <Wrap $tall={tall}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            ref={ref as React.Ref<typeof LineChart>}
            data={data}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {series.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name ?? s.dataKey}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Wrap>
    );
  },
);
