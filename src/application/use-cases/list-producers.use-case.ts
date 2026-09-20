import type {
  IProducerRepository,
  ProducerListQuery,
  ProducerListResult,
} from '../../domain/repositories/producer.repository.js';
import { InvalidDomainValueException } from '../../domain/exceptions/invalid-domain-value.exception.js';
import { decodeProducerListCursor } from '../../domain/list-producers-cursor.js';

export class ListProducersUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
  ) {}

  public async execute(query: ProducerListQuery): Promise<ProducerListResult> {
    if (query.cursor) {
      try {
        const payload = decodeProducerListCursor(query.cursor);
        if (
          payload.sortBy !== query.sortBy ||
          payload.sortOrder !== query.sortOrder
        ) {
          throw new InvalidDomainValueException(
            'cursor sortBy/sortOrder must match query parameters',
          );
        }
      } catch (error) {
        if (error instanceof InvalidDomainValueException) {
          throw error;
        }
        throw new InvalidDomainValueException('Invalid list cursor');
      }
    }
    return this.producerRepository.findMany(query);
  }
}
