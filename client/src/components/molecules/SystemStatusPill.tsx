import { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';

type HealthState = 'checking' | 'ok' | 'offline';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const PILL_BORDER: Record<HealthState, string> = {
  checking: '#e0e0e0',
  ok: '#c8e6c9',
  offline: '#ef9a9a',
};

const LABELS: Record<HealthState, string> = {
  checking: 'Verificando…',
  ok: 'Sistema operacional',
  offline: 'API indisponível',
};

const Pill = styled.div<{ $state: HealthState }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme, $state }) =>
    $state === 'offline' ? '#ffebee' : theme.colors.softTint};
  border: 1px solid ${({ $state }) => PILL_BORDER[$state]};
  color: ${({ theme, $state }) =>
    $state === 'offline' ? '#c62828' : theme.colors.primaryDark};
  font-size: 0.8125rem;
  font-weight: 500;
`;

const Dot = styled.span<{ $state: HealthState }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme, $state }) => {
    switch ($state) {
      case 'offline':
        return '#c62828';
      case 'ok':
        return theme.colors.primary;
      case 'checking':
        return '#9e9e9e';
      default: {
        const _exhaustive: never = $state;
        return _exhaustive;
      }
    }
  }};
  ${({ $state }) =>
    $state !== 'offline' &&
    css`
      animation: ${pulse} 1.6s ease-in-out infinite;
    `}
`;

const POLL_MS = 30_000;
const HEALTH_READY_URL = '/api/v1/health/ready';

export function SystemStatusPill(): React.JSX.Element {
  const [state, setState] = useState<HealthState>('checking');

  useEffect(() => {
    let cancelled = false;

    async function probe(): Promise<void> {
      try {
        const res = await fetch(HEALTH_READY_URL, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!cancelled) {
          setState(res.ok ? 'ok' : 'offline');
        }
      } catch {
        if (!cancelled) {
          setState('offline');
        }
      }
    }

    void probe();
    const id = window.setInterval(() => {
      void probe();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <Pill $state={state} role="status" aria-live="polite">
      <Dot $state={state} />
      {LABELS[state]}
    </Pill>
  );
}
