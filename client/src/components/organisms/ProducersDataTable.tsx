import styled from 'styled-components';
import { Link } from 'react-router-dom';
import type { ProducerListItem } from '../../shared/types/api';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.canvas};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Td = styled.td`
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  font-size: 0.875rem;
`;

const Tr = styled.tr`
  &:hover {
    background: ${({ theme }) => theme.colors.hoverRow};
  }
`;

interface ProducersDataTableProps {
  producers: ProducerListItem[];
  onDelete: (producer: Pick<ProducerListItem, 'id' | 'name'>) => void;
  esgCarEnabled?: boolean;
}

function isCnpjMasked(document: string): boolean {
  return document.includes('/');
}

function toneForEsgStatus(
  status: string,
): 'success' | 'secondary' | 'danger' {
  switch (status) {
    case 'BLOCKED':
      return 'danger';
    case 'WARNING':
      return 'secondary';
    default:
      return 'success';
  }
}

export function ProducersDataTable({
  producers,
  onDelete,
  esgCarEnabled = false,
}: ProducersDataTableProps): React.JSX.Element {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Produtor</Th>
          <Th>Documento (CPF/CNPJ)</Th>
          <Th>Fazendas vinculadas</Th>
          {esgCarEnabled ? <Th>ESG</Th> : null}
          <Th>Ações</Th>
        </tr>
      </thead>
      <tbody>
        {producers.map((p) => (
          <Tr key={p.id}>
            <Td>{p.name}</Td>
            <Td>
              <Badge tone={isCnpjMasked(p.document) ? 'secondary' : 'neutral'}>
                {isCnpjMasked(p.document) ? 'CNPJ' : 'CPF'}
              </Badge>{' '}
              <span data-testid="masked-document">{p.document}</span>
            </Td>
            <Td>
              {p.farmsCount} fazenda{p.farmsCount === 1 ? '' : 's'}
              {p.farmsCount > 0 && p.farmStates.length
                ? ` (${p.farmStates.join(' / ')})`
                : ''}
            </Td>
            {esgCarEnabled ? (
              <Td>
                <Badge tone={toneForEsgStatus(p.esgStatus)}>
                  {p.esgStatus}
                </Badge>
              </Td>
            ) : null}
            <Td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link to={`/producers/${p.id}/edit`} aria-label={`Editar ${p.name}`}>
                <Icon name="edit" />
              </Link>
              {esgCarEnabled ? (
                <Link
                  to={`/producers/${p.id}/esg`}
                  aria-label={`Parecer ESG de ${p.name}`}
                  title="Parecer ESG"
                >
                  <Icon name="policy" />
                </Link>
              ) : null}
              <Button
                variant="danger"
                onClick={() => onDelete({ id: p.id, name: p.name })}
                aria-label={`Excluir ${p.name}`}
              >
                Excluir
              </Button>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
