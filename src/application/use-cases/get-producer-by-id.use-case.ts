import { Inject, Injectable } from '@nestjs/common';
import { Producer } from '../../domain/entities/producer.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import { PRODUCER_REPOSITORY } from '../../domain/repositories/producer.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';

@Injectable()
export class GetProducerByIdUseCase {
  public constructor(
    @Inject(PRODUCER_REPOSITORY)
    private readonly producerRepository: IProducerRepository,
  ) {}

  public async execute(id: string): Promise<Producer> {
    const producer = await this.producerRepository.findById(id);
    if (!producer) {
      throw new NotFoundException(`Produtor ${id} não encontrado.`);
    }
    return producer;
  }
}
