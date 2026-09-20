import { useEffect, useId, useState } from 'react';
import styled from 'styled-components';
import { Button } from '../atoms/Button';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const Meta = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-feature-settings: 'tnum' 1;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const CompactSelect = styled.select`
  height: 40px;
  min-width: 4.5rem;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;

  &:disabled {
    opacity: 0.55;
  }
`;

const CompactInput = styled.input`
  height: 40px;
  width: 4rem;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;
  font-feature-settings: 'tnum' 1;

  &:disabled {
    opacity: 0.55;
  }
`;

const JumpRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  disabled?: boolean;
}

export function totalPages(total: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total <= 0) {
    return { from: 0, to: 0 };
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to };
}

/** Clamp página alvo para o intervalo válido [1, totalPages]. */
export function clampPage(
  target: number,
  total: number,
  pageSize: number,
): number {
  const pages = totalPages(total, pageSize);
  if (!Number.isFinite(target)) {
    return 1;
  }
  const n = Math.trunc(target);
  if (n < 1) {
    return 1;
  }
  if (n > pages) {
    return pages;
  }
  return n;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  disabled = false,
}: PaginationProps): React.JSX.Element {
  const pages = totalPages(total, pageSize);
  const { from, to } = pageRange(page, pageSize, total);
  const atStart = page <= 1;
  const atEnd = page >= pages;
  const sizeId = useId();
  const jumpId = useId();
  const [jumpInput, setJumpInput] = useState(String(page));

  useEffect(() => {
    setJumpInput(String(page));
  }, [page]);

  const goToPage = (raw: string): void => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setJumpInput(String(page));
      return;
    }
    const next = clampPage(parsed, total, pageSize);
    setJumpInput(String(next));
    if (next !== page) {
      onPageChange(next);
    }
  };

  return (
    <Nav aria-label="Paginação">
      <Meta>
        {total === 0
          ? 'Nenhum registro'
          : `Exibindo ${from}–${to} de ${total} · Página ${page} de ${pages}`}
      </Meta>
      <Controls>
        <Field htmlFor={sizeId}>
          Por página
          <CompactSelect
            id={sizeId}
            value={pageSize}
            disabled={disabled}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </CompactSelect>
        </Field>
        <Field htmlFor={jumpId}>
          Ir para
          <JumpRow>
            <CompactInput
              id={jumpId}
              type="number"
              min={1}
              max={pages}
              inputMode="numeric"
              value={jumpInput}
              disabled={disabled || total === 0}
              onChange={(e) => setJumpInput(e.target.value)}
              onBlur={() => goToPage(jumpInput)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  goToPage(jumpInput);
                }
              }}
              aria-label="Número da página"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || total === 0}
              onClick={() => goToPage(jumpInput)}
            >
              Ir
            </Button>
          </JumpRow>
        </Field>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || atStart}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || atEnd}
          onClick={() => onPageChange(page + 1)}
          aria-label="Próxima página"
        >
          Próxima
        </Button>
      </Controls>
    </Nav>
  );
}
