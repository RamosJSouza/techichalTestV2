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
import { Pagination } from '../components/molecules/Pagination';
import { SearchField } from '../components/molecules/SearchField';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { ErrorRetryPanel } from '../components/molecules/ErrorRetryPanel';
import { TextInput } from '../components/atoms/TextInput';
import { ProducersDataTable } from '../components/organisms/ProducersDataTable';
import {
  producerResponseToListItem,
  type ProducerListItem,
} from '../shared/types/api';

const PAGE_SIZE_DEFAULT = 20;

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
  items: ProducerListItem[],
  filter: ProducerFilter,
): ProducerListItem[] {
  switch (filter) {
    case 'all':
      return items;
    case 'cnpj':
      return items.filter((p) => p.document.includes('/'));
    case 'cpf':
      return items.filter((p) => !p.document.includes('/'));
    case 'large':
      return items.filter((p) => p.totalAreaHa > 2000);
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

function mergeById(
  primary: ProducerListItem[],
  extra: ProducerListItem | null,
): ProducerListItem[] {
  if (!extra) {
    return primary;
  }
  if (primary.some((p) => p.id === extra.id)) {
    return primary;
  }
  return [extra, ...primary];
}

export function ProducersListPage(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const nameFilter = deferredQuery.trim() || undefined;
  const { data, isLoading, isError, isFetching, refetch, error } =
    useListProducersQuery({
      page,
      pageSize,
      ...(nameFilter ? { name: nameFilter } : {}),
    });
  const [deleteProducer, { isLoading: deletingProducer }] =
    useDeleteProducerMutation();
  const [searchExact, { isFetching: searchingExact }] =
    useLazySearchProducerQuery();
  const filter = useAppSelector((s) => s.producer.filter);
  const dispatch = useAppDispatch();
  const [exactDocument, setExactDocument] = useState('');
  const [exactHit, setExactHit] = useState<ProducerListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery]);

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
          setExactHit(producerResponseToListItem(result));
        } catch {
          setExactHit(null);
        }
      })();
    }, 400);

    return () => window.clearTimeout(handle);
  }, [exactDocument, searchExact]);

  const filtered = useMemo(() => {
    const searched = filterProducersBySearch(data?.items ?? [], deferredQuery);
    const withExact = mergeById(searched, exactHit);
    return applyFilter(withExact, filter);
  }, [data, deferredQuery, filter, exactHit]);

  const hasActiveQuery =
    query.trim().length > 0 || digitsOnly(exactDocument).length >= 11;

  const total = data?.total ?? 0;

  if (isLoading) {
    return <Spinner />;
  }

  if (isError) {
    const statusDetail =
      typeof error === 'object' && error && 'status' in error
        ? `HTTP ${String(error.status)}`
        : undefined;
    return (
      <ErrorRetryPanel
        message="Falha ao carregar produtores."
        detail={statusDetail}
        onRetry={() => {
          void refetch();
        }}
      />
    );
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
          placeholder="Nome, documento, UF, ESG, qtd. fazendas, área…"
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
              ? '1 resultado nesta página'
              : `${filtered.length} resultados nesta página`}
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
        <>
          <ProducersDataTable
            producers={filtered}
            onDelete={(producer) => setPendingDelete(producer)}
          />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            disabled={isFetching}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir produtor"
        message={
          pendingDelete
            ? `Remover o produtor "${pendingDelete.name}"? Esta ação é um soft delete.`
            : ''
        }
        busy={deletingProducer}
        onCancel={() => {
          if (!deletingProducer) {
            setPendingDelete(null);
          }
        }}
        onConfirm={() => {
          if (!pendingDelete || deletingProducer) {
            return;
          }
          const { id } = pendingDelete;
          void (async () => {
            try {
              await deleteProducer(id).unwrap();
              dispatch(
                showToast({
                  message: 'Produtor removido.',
                  variant: 'success',
                }),
              );
              setPendingDelete(null);
            } catch {
            }
          })();
        }}
      />
    </div>
  );
}
