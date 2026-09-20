import { Producer } from '../entities/producer.js';

export const PRODUCER_REPOSITORY = Symbol('PRODUCER_REPOSITORY');

type ProducerSortBy = 'createdAt' | 'name';
type ProducerSortOrder = 'asc' | 'desc';

export interface ProducerListQuery {
  page: number;
  pageSize: number;
  sortBy: ProducerSortBy;
  sortOrder: ProducerSortOrder;
  name?: string;
  /** Cursor opaco keyset; se presente, `page` é ignorado. */
  cursor?: string;
}

/** Item leve para listagem paginada (sem farms/harvests/crops). */
export interface ProducerListItem {
  id: string;
  name: string;
  /** Dígitos do documento (sem máscara); a presentation aplica mask. */
  documentDigits: string;
  esgStatus: string;
  esgCheckedAt: Date | null;
  documentValidationStatus: string;
  documentValidationPendingAt: Date | null;
  documentValidationPendingReason: string | null;
  farmsCount: number;
  farmStates: string[];
  totalAreaHa: number;
  arableAreaHa: number;
  vegetationAreaHa: number;
}

export interface ProducerListResult {
  items: ProducerListItem[];
  total: number;
  page: number;
  pageSize: number;
  /** Próxima página keyset; null se não há mais itens. */
  nextCursor: string | null;
}

export interface IProducerRepository {
  save(producer: Producer): Promise<Producer>;
  update(producer: Producer): Promise<Producer>;
  findById(id: string): Promise<Producer | null>;
  findByDocumentHash(documentHash: string): Promise<Producer | null>;
  findAll(): Promise<Producer[]>;
  findMany(query: ProducerListQuery): Promise<ProducerListResult>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
  /** IDs com documento PENDING, mais antigos primeiro. */
  findPendingDocumentIds(limit: number): Promise<string[]>;
}
