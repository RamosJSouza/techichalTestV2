import styled from 'styled-components';

const Banner = styled.div<{ $valid: boolean }>`
  width: 100%;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid
    ${({ $valid }) => ($valid ? '#81C784' : '#E57373')};
  background: ${({ theme, $valid }) =>
    $valid ? theme.colors.successBg : theme.colors.dangerBg};
  color: ${({ theme, $valid }) =>
    $valid ? theme.colors.primaryDark : theme.colors.danger};
  font-size: 0.875rem;
`;

interface ValidationBannerProps {
  valid: boolean;
  message: string;
}

export function ValidationBanner({
  valid,
  message,
}: ValidationBannerProps): React.JSX.Element {
  return (
    <Banner $valid={valid} role="status">
      {valid ? '✓ ' : '⚠ '}
      {message}
    </Banner>
  );
}
