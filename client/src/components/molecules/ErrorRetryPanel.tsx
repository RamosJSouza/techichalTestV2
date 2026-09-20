import styled from 'styled-components';
import { Button } from '../atoms/Button';

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const Message = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9375rem;
  line-height: 1.45;
`;

interface ErrorRetryPanelProps {
  message: string;
  detail?: string;
  onRetry: () => void;
  retryLabel?: string;
}

export function ErrorRetryPanel({
  message,
  detail,
  onRetry,
  retryLabel = 'Tentar novamente',
}: ErrorRetryPanelProps): React.JSX.Element {
  return (
    <Panel role="alert">
      <Message>
        {message}
        {detail ? ` ${detail}` : null}
      </Message>
      <Button type="button" variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </Panel>
  );
}
