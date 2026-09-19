import styled from 'styled-components';

type BadgeTone = 'success' | 'danger' | 'neutral' | 'secondary';

const Pill = styled.span<{ $tone: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: ${({ theme, $tone }) => {
    switch ($tone) {
      case 'success':
        return theme.colors.successBg;
      case 'danger':
        return theme.colors.dangerBg;
      case 'secondary':
        return '#FED7CA';
      case 'neutral':
        return theme.colors.canvas;
      default: {
        const _exhaustive: never = $tone;
        return _exhaustive;
      }
    }
  }};
  color: ${({ theme, $tone }) => {
    switch ($tone) {
      case 'success':
        return theme.colors.primaryDark;
      case 'danger':
        return theme.colors.danger;
      case 'secondary':
        return theme.colors.secondary;
      case 'neutral':
        return theme.colors.textSecondary;
      default: {
        const _exhaustive: never = $tone;
        return _exhaustive;
      }
    }
  }};
`;

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
}

export function Badge({
  children,
  tone = 'neutral',
}: BadgeProps): React.JSX.Element {
  return <Pill $tone={tone}>{children}</Pill>;
}
