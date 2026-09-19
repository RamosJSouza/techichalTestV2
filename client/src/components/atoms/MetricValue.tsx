import styled from 'styled-components';

const Value = styled.span`
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 2.25rem;
  letter-spacing: -0.025em;
  font-feature-settings: 'tnum' 1, 'cv05' 1;
  color: ${({ theme }) => theme.colors.text};
`;

interface MetricValueProps {
  children: React.ReactNode;
}

export function MetricValue({ children }: MetricValueProps): React.JSX.Element {
  return <Value>{children}</Value>;
}
