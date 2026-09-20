import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useGetProducerEsgQuery, useGetProducerQuery } from '../store/api/apiSlice';
import { Badge } from '../components/atoms/Badge';
import { Button } from '../components/atoms/Button';
import { Spinner } from '../components/atoms/Spinner';
import { ErrorRetryPanel } from '../components/molecules/ErrorRetryPanel';
import { ValidationBanner } from '../components/molecules/ValidationBanner';
import { httpStatusDetail } from '../shared/lib/http-error-detail';

const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 720px;
  box-shadow: ${({ theme }) => theme.shadows.level1};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const List = styled.ul`
  margin: 0;
  padding-left: 1.25rem;
`;

const ESG_TONE: Record<string, 'success' | 'secondary' | 'danger'> = {
  BLOCKED: 'danger',
  WARNING: 'secondary',
  APPROVED: 'success',
};

function toneForStatus(
  status: string,
): 'success' | 'secondary' | 'danger' | 'neutral' {
  return ESG_TONE[status] ?? 'neutral';
}

export function ProducerEsgPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const { data: producer } = useGetProducerQuery(id, { skip: !id });
  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetProducerEsgQuery(id, { skip: !id });

  if (isLoading) {
    return <Spinner />;
  }

  if (isError || !data) {
    return (
      <Card>
        <h1>Parecer ESG</h1>
        <ErrorRetryPanel
          message="Falha ao carregar compliance."
          detail={httpStatusDetail(error)}
          onRetry={() => {
            void refetch();
          }}
        />
        <Link to="/producers">
          <Button variant="secondary">Voltar à listagem</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h1 style={{ margin: 0 }}>Parecer socioambiental (ESG)</h1>
      <p style={{ margin: 0, color: '#616161' }}>
        {producer?.name ?? 'Produtor'} · documento {data.documentMasked}
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Badge tone={toneForStatus(data.esgStatus)}>{data.esgStatus}</Badge>
        <span style={{ fontSize: 13, color: '#616161' }}>
          Checado em:{' '}
          {data.esgCheckedAt
            ? new Date(data.esgCheckedAt).toLocaleString('pt-BR')
            : '—'}
        </span>
      </div>

      <ValidationBanner
        valid={!data.hasIbamaEmbargo && !data.hasSlaveLaborFlag}
        message={
          data.hasIbamaEmbargo || data.hasSlaveLaborFlag
            ? 'Há restrições socioambientais sinalizadas para este documento.'
            : 'Sem embargos IBAMA nem flag de trabalho análogo à escravidão na consulta atual.'
        }
      />

      <div>
        <strong>Indicadores</strong>
        <List>
          <li>Embargo IBAMA: {data.hasIbamaEmbargo ? 'Sim' : 'Não'}</li>
          <li>
            Trabalho análogo à escravidão:{' '}
            {data.hasSlaveLaborFlag ? 'Sim' : 'Não'}
          </li>
        </List>
      </div>

      {data.details.length > 0 ? (
        <div>
          <strong>Detalhes</strong>
          <List>
            {data.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </List>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="secondary"
          disabled={isFetching}
          aria-busy={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? 'Atualizando…' : 'Reconsultar'}
        </Button>
        <Link to={`/producers/${id}/edit`}>
          <Button variant="secondary">Editar produtor</Button>
        </Link>
        <Link to="/producers">
          <Button>Listagem</Button>
        </Link>
      </div>
    </Card>
  );
}
