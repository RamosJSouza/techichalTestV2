import { type ReactElement, type Ref } from 'react';
import styled, { css } from 'styled-components';
import { useCurrentPng } from 'recharts-to-png';
import { Button } from '../atoms/Button';

type ChartSpan = 'third' | 'half' | 'full';

const Panel = styled.section<{ $span: ChartSpan }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.level1};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
  overflow: hidden;

  ${({ $span }) => {
    switch ($span) {
      case 'third':
      case 'half':
        return css`
          grid-column: span 1;
        `;
      case 'full':
        return css`
          grid-column: 1 / -1;
        `;
      default: {
        const _exhaustive: never = $span;
        return _exhaustive;
      }
    }
  }}
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
  flex-shrink: 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

function downloadPng(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function toPngFilename(title: string): string {
  return `${title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()}.png`;
}

interface ChartCardProps {
  title: string;
  filename?: string;
  span?: ChartSpan;
  children: (ref: Ref<unknown>) => ReactElement;
}

export function ChartCard({
  title,
  filename,
  span = 'half',
  children,
}: ChartCardProps): React.JSX.Element {
  const [getPng, { ref, isLoading }] = useCurrentPng({
    backgroundColor: '#ffffff',
  });

  async function handleExport(): Promise<void> {
    const png = await getPng();
    if (!png) return;
    downloadPng(png, filename ?? toPngFilename(title));
  }

  return (
    <Panel $span={span}>
      <Header>
        <Title>{title}</Title>
        <Button
          type="button"
          variant="secondary"
          disabled={isLoading}
          onClick={() => void handleExport()}
        >
          {isLoading ? 'Exportando…' : 'PNG'}
        </Button>
      </Header>
      <Body>{children(ref)}</Body>
    </Panel>
  );
}
