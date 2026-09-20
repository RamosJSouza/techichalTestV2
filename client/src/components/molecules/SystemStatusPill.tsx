import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.softTint};
  border: 1px solid #c8e6c9;
  color: ${({ theme }) => theme.colors.primaryDark};
  font-size: 0.8125rem;
  font-weight: 500;
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  animation: ${pulse} 1.6s ease-in-out infinite;
`;

export function SystemStatusPill(): React.JSX.Element {
  return (
    <Pill>
      <Dot />
      Sistema Operacional
    </Pill>
  );
}
