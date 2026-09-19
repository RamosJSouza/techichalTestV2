import { Producer } from '../../domain/entities/producer.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';

export class ListProducersUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
  ) {}

  public async execute(): Promise<Producer[]> {
    return this.producerRepository.findAll();
  }
}
