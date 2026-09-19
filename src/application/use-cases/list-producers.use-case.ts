import { Inject, Injectable } from '@nestjs/common';
import { Producer } from '../../domain/entities/producer.js';
import { PRODUCER_REPOSITORY } from '../../domain/repositories/producer.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';

@Injectable()
export class ListProducersUseCase {
  public constructor(
    @Inject(PRODUCER_REPOSITORY)
    private readonly producerRepository: IProducerRepository,
  ) {}

  public async execute(): Promise<Producer[]> {
    return this.producerRepository.findAll();
  }
}
