import { useMemo } from 'react';
import styled from 'styled-components';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { BRAZILIAN_STATES } from '../../shared/lib/brazilian-states';
import type { DashboardFilters } from '../../shared/types/api';

const CROPS = ['Soja', 'Milho', 'Café', 'Algodão', 'Cana'] as const;
const ESG_STATUSES = [
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'WARNING', label: 'Alerta' },
  { value: 'BLOCKED', label: 'Bloqueado' },
] as const;
const CAR_STATUSES = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'CANCELLED', label: 'Cancelado' },
] as const;

const Shell = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.level1};
  overflow: hidden;
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors.softTint} 0%,
    ${({ theme }) => theme.colors.surface} 100%
  );
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
`;

const TopLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const TopTitle = styled.h2`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.01em;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 6px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
`;

const Body = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const PrimaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.tabletMax}) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const RiskRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: end;
  padding-top: ${({ theme }) => theme.spacing.sm};
  border-top: 1px dashed ${({ theme }) => theme.colors.border};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    grid-template-columns: 1fr;
  }
`;

const RiskHint = styled.p`
  margin: 0;
  grid-column: 1 / -1;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const RefreshHint = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  animation: pulse 1.2s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;

  &:hover {
    background: ${({ theme }) => theme.colors.softTint};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ChipKey = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 600;
`;

interface DashboardFiltersBarProps {
  value: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  harvestYears?: string[];
  isRefreshing?: boolean;
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseOptionalNumber(raw: string): number | undefined {
  if (raw === '') return undefined;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function DashboardFiltersBar({
  value,
  onChange,
  harvestYears = [],
  isRefreshing = false,
}: DashboardFiltersBarProps): React.JSX.Element {
  const patch = (partial: Partial<DashboardFilters>): void => {
    onChange({ ...value, ...partial });
  };

  const clear = (): void => {
    onChange({});
  };

  const activeChips = useMemo(() => {
    type Chip = {
      key: keyof DashboardFilters;
      label: string;
      clear: Partial<DashboardFilters>;
    };
    const chips: Chip[] = [];
    if (value.state) {
      chips.push({
        key: 'state',
        label: `UF: ${value.state}`,
        clear: { state: undefined },
      });
    }
    if (value.crop) {
      chips.push({
        key: 'crop',
        label: `Cultura: ${value.crop}`,
        clear: { crop: undefined },
      });
    }
    if (value.harvestYear) {
      chips.push({
        key: 'harvestYear',
        label: `Safra: ${value.harvestYear}`,
        clear: { harvestYear: undefined },
      });
    }
    if (value.esgStatus) {
      const label =
        ESG_STATUSES.find((s) => s.value === value.esgStatus)?.label ??
        value.esgStatus;
      chips.push({
        key: 'esgStatus',
        label: `ESG: ${label}`,
        clear: { esgStatus: undefined },
      });
    }
    if (value.carStatus) {
      const label =
        CAR_STATUSES.find((s) => s.value === value.carStatus)?.label ??
        value.carStatus;
      chips.push({
        key: 'carStatus',
        label: `CAR: ${label}`,
        clear: { carStatus: undefined },
      });
    }
    if (value.minClimateRisk !== undefined) {
      chips.push({
        key: 'minClimateRisk',
        label: `Risco ≥ ${value.minClimateRisk}`,
        clear: { minClimateRisk: undefined },
      });
    }
    if (value.maxClimateRisk !== undefined) {
      chips.push({
        key: 'maxClimateRisk',
        label: `Risco ≤ ${value.maxClimateRisk}`,
        clear: { maxClimateRisk: undefined },
      });
    }
    return chips;
  }, [value]);

  return (
    <Shell aria-label="Filtros do dashboard">
      <Top>
        <TopLeft>
          <Icon name="tune" size={20} />
          <TopTitle>Filtros</TopTitle>
          {activeChips.length > 0 ? (
            <Badge aria-label={`${activeChips.length} filtros ativos`}>
              {activeChips.length}
            </Badge>
          ) : null}
          {isRefreshing ? <RefreshHint>Atualizando…</RefreshHint> : null}
        </TopLeft>
        <Button
          type="button"
          variant="secondary"
          disabled={activeChips.length === 0}
          onClick={clear}
        >
          Limpar tudo
        </Button>
      </Top>

      <Body>
        <PrimaryRow>
          <Select
            label="UF"
            value={value.state ?? ''}
            onChange={(e) => patch({ state: emptyToUndefined(e.target.value) })}
          >
            <option value="">Todas</option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </Select>

          <Select
            label="Cultura"
            value={value.crop ?? ''}
            onChange={(e) => patch({ crop: emptyToUndefined(e.target.value) })}
          >
            <option value="">Todas</option>
            {CROPS.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </Select>

          <Select
            label="Safra"
            value={value.harvestYear ?? ''}
            onChange={(e) =>
              patch({ harvestYear: emptyToUndefined(e.target.value) })
            }
          >
            <option value="">Todas</option>
            {harvestYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>

          <Select
            label="ESG"
            value={value.esgStatus ?? ''}
            onChange={(e) =>
              patch({ esgStatus: emptyToUndefined(e.target.value) })
            }
          >
            <option value="">Todos</option>
            {ESG_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>

          <Select
            label="CAR"
            value={value.carStatus ?? ''}
            onChange={(e) =>
              patch({ carStatus: emptyToUndefined(e.target.value) })
            }
          >
            <option value="">Todos</option>
            {CAR_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </PrimaryRow>

        <RiskRow>
          <RiskHint>
            Faixa de risco climático (0–100). Deixe em branco para não filtrar.
          </RiskHint>
          <TextInput
            label="Risco mínimo"
            type="number"
            min={0}
            max={100}
            step="1"
            placeholder="0"
            value={value.minClimateRisk ?? ''}
            onChange={(e) =>
              patch({ minClimateRisk: parseOptionalNumber(e.target.value) })
            }
          />
          <TextInput
            label="Risco máximo"
            type="number"
            min={0}
            max={100}
            step="1"
            placeholder="100"
            value={value.maxClimateRisk ?? ''}
            onChange={(e) =>
              patch({ maxClimateRisk: parseOptionalNumber(e.target.value) })
            }
          />
        </RiskRow>

        {activeChips.length > 0 ? (
          <Chips aria-label="Filtros ativos">
            {activeChips.map((chip) => (
              <Chip
                key={chip.key}
                type="button"
                onClick={() => patch(chip.clear)}
                aria-label={`Remover filtro ${chip.label}`}
              >
                <ChipKey>{chip.label}</ChipKey>
                <Icon name="close" size={14} />
              </Chip>
            ))}
          </Chips>
        ) : null}
      </Body>
    </Shell>
  );
}
