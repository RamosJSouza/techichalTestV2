import type {
  IProducerRepository,
  ProducerListQuery,
  ProducerListResult,
} from '../../domain/repositories/producer.repository.js';

export class ListProducersUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
  ) {}

  public async execute(query: ProducerListQuery): Promise<ProducerListResult> {
    return this.producerRepository.findMany(query);
  }
}
