import styled from 'styled-components';
import { Icon } from '../atoms/Icon';
import { MetricValue } from '../atoms/MetricValue';

const Card = styled.article`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.level1};
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.8125rem;
`;

const Unit = styled.span`
  margin-left: 6px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
}

export function KpiCard({
  label,
  value,
  unit,
  icon = 'analytics',
}: KpiCardProps): React.JSX.Element {
  return (
    <Card>
      <LabelRow>
        <span>{label}</span>
        <Icon name={icon} />
      </LabelRow>
      <div>
        <MetricValue>{value}</MetricValue>
        {unit ? <Unit>{unit}</Unit> : null}
      </div>
    </Card>
  );
}
