import { forwardRef } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import styled from 'styled-components';

const Wrap = styled.div<{ $compact?: boolean }>`
  width: 100%;
  height: ${({ $compact }) => ($compact ? '240px' : '280px')};
  position: relative;
  min-width: 0;
  overflow: hidden;
`;

const Center = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
  pointer-events: none;
  padding-bottom: 28px;
`;

const CenterValue = styled.strong<{ $compact?: boolean }>`
  font-feature-settings: 'tnum' 1;
  font-size: ${({ $compact }) => ($compact ? '14px' : '16px')};
`;

const CenterLabel = styled.span`
  font-size: 11px;
  color: #616161;
`;

interface DonutSlice {
  name: string;
  value: number;
  fill: string;
}

interface DonutChartRechartsProps {
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
  compact?: boolean;
}

export const DonutChartRecharts = forwardRef<
  unknown,
  DonutChartRechartsProps
>(function DonutChartRecharts(
  { data, centerLabel, centerValue, compact = false },
  ref,
) {
  return (
    <Wrap $compact={compact}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart ref={ref as React.Ref<typeof PieChart>}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="42%"
            innerRadius={compact ? 42 : 55}
            outerRadius={compact ? 68 : 80}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              typeof value === 'number'
                ? value.toLocaleString('pt-BR')
                : String(value)
            }
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{
              maxHeight: 72,
              overflowY: 'auto',
              fontSize: 11,
              lineHeight: '16px',
              paddingTop: 4,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <Center>
          {centerValue ? (
            <CenterValue $compact={compact}>{centerValue}</CenterValue>
          ) : null}
          {centerLabel ? <CenterLabel>{centerLabel}</CenterLabel> : null}
        </Center>
      )}
    </Wrap>
  );
});
