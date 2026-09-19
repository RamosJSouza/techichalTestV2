import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  useDeleteProducerMutation,
  useLazySearchProducerQuery,
  useListProducersQuery,
} from '../store/api/apiSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import { setFilter, type ProducerFilter } from '../store/slices/producerSlice';
import { showToast } from '../store/slices/uiSlice';
import {
  digitsOnly,
  filterProducersBySearch,
} from '../shared/lib/match-producer-search';
import { Button } from '../components/atoms/Button';
import { Spinner } from '../components/atoms/Spinner';
import { FilterChip } from '../components/molecules/FilterChip';
import { SearchField } from '../components/molecules/SearchField';
import { TextInput } from '../components/atoms/TextInput';
import { ProducersDataTable } from '../components/organisms/ProducersDataTable';
import type { ProducerResponse } from '../shared/types/api';

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const ResultMeta = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Empty = styled.p`
  margin: 24px 0;
  padding: 24px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const ExactBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.canvas};
`;

function applyFilter(
  items: ProducerResponse[],
  filter: ProducerFilter,
): ProducerResponse[] {
  switch (filter) {
    case 'all':
      return items;
    case 'cnpj':
      return items.filter((p) => p.document.includes('/'));
    case 'cpf':
      return items.filter((p) => !p.document.includes('/'));
    case 'large': {
      const totalHa = (p: ProducerResponse): number =>
        p.farms.reduce((acc, f) => acc + f.totalArea, 0);
      return items.filter((p) => totalHa(p) > 2000);
    }
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

function mergeById(
  primary: ProducerResponse[],
  extra: ProducerResponse | null,
): ProducerResponse[] {
  if (!extra) {
    return primary;
  }
  if (primary.some((p) => p.id === extra.id)) {
    return primary;
  }
  return [extra, ...primary];
}

export function ProducersListPage(): React.JSX.Element {
  const { data, isLoading, isError } = useListProducersQuery();
  const [deleteProducer] = useDeleteProducerMutation();
  const [searchExact, { isFetching: searchingExact }] =
    useLazySearchProducerQuery();
  const filter = useAppSelector((s) => s.producer.filter);
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [exactDocument, setExactDocument] = useState('');
  const [exactHit, setExactHit] = useState<ProducerResponse | null>(null);

  useEffect(() => {
    const digits = digitsOnly(exactDocument);
    if (digits.length < 11) {
      setExactHit(null);
      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await searchExact(exactDocument.trim()).unwrap();
          setExactHit(result);
        } catch {
          setExactHit(null);
        }
      })();
    }, 400);

    return () => window.clearTimeout(handle);
  }, [exactDocument, searchExact]);

  const filtered = useMemo(() => {
    const searched = filterProducersBySearch(data ?? [], deferredQuery);
    const withExact = mergeById(searched, exactHit);
    return applyFilter(withExact, filter);
  }, [data, deferredQuery, filter, exactHit]);

  const hasActiveQuery =
    query.trim().length > 0 || digitsOnly(exactDocument).length >= 11;

  if (isLoading) {
    return <Spinner />;
  }

  if (isError) {
    return <p role="alert">Falha ao carregar produtores.</p>;
  }

  return (
    <div>
      <TitleRow>
        <div>
          <h1 style={{ margin: 0 }}>Produtores Rurais &amp; Propriedades</h1>
          <p style={{ color: '#616161' }}>
            Documentos exibidos mascarados conforme política de PII.
          </p>
        </div>
        <Link to="/producers/new">
          <Button>Novo produtor</Button>
        </Link>
      </TitleRow>

      <Toolbar>
        <SearchField
          label="Buscar produtores"
          value={query}
          onChange={setQuery}
          placeholder="Nome, documento mascarado, fazenda, cidade, UF, cultura, ESG…"
        />
        <ExactBox>
          <TextInput
            label="Busca exata por documento (blind index)"
            placeholder="CPF/CNPJ completo — busca no servidor ao digitar 11+ dígitos"
            value={exactDocument}
            onChange={(e) => setExactDocument(e.target.value)}
            autoComplete="off"
          />
          {searchingExact ? (
            <ResultMeta>Consultando blind index…</ResultMeta>
          ) : null}
          {exactHit ? (
            <ResultMeta aria-live="polite">
              Encontrado: {exactHit.name} ({exactHit.document})
            </ResultMeta>
          ) : null}
        </ExactBox>
        <Filters>
          {(
            [
              ['all', 'Todos'],
              ['cpf', 'Pessoas Físicas (CPF)'],
              ['cnpj', 'Pessoas Jurídicas (CNPJ)'],
              ['large', 'Grandes Produtores (> 2.000 ha)'],
            ] as const
          ).map(([key, label]) => (
            <FilterChip
              key={key}
              label={label}
              active={filter === key}
              onClick={() => dispatch(setFilter(key))}
            />
          ))}
        </Filters>
        {hasActiveQuery ? (
          <ResultMeta aria-live="polite">
            {filtered.length === 1
              ? '1 resultado'
              : `${filtered.length} resultados`}
            {deferredQuery !== query ? '…' : ''}
          </ResultMeta>
        ) : null}
      </Toolbar>

      {filtered.length === 0 && hasActiveQuery ? (
        <Empty role="status">
          Nenhum produtor corresponde à busca
          {query.trim() ? (
            <>
              {' '}
              <strong>&ldquo;{query.trim()}&rdquo;</strong>
            </>
          ) : null}
          .
        </Empty>
      ) : (
        <ProducersDataTable
          producers={filtered}
          onDelete={async (id) => {
            if (!window.confirm('Remover produtor (soft delete)?')) {
              return;
            }
            try {
              await deleteProducer(id).unwrap();
              dispatch(
                showToast({
                  message: 'Produtor removido.',
                  variant: 'success',
                }),
              );
            } catch {
            }
          }}
        />
      )}
    </div>
  );
}
