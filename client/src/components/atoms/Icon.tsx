import styled from 'styled-components';

const Span = styled.span`
  font-family: 'Material Symbols Outlined';
  font-size: ${({ $size }: { $size: number }) => `${$size}px`};
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  color: inherit;
  user-select: none;
`;

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export function Icon({
  name,
  size = 20,
  className,
}: IconProps): React.JSX.Element {
  return (
    <Span className={className} $size={size} aria-hidden>
      {name}
    </Span>
  );
}
