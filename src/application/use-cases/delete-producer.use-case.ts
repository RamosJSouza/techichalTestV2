import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import { PRODUCER_REPOSITORY } from '../../domain/repositories/producer.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';

@Injectable()
export class DeleteProducerUseCase {
  private readonly logger = new Logger(DeleteProducerUseCase.name);

  public constructor(
    @Inject(PRODUCER_REPOSITORY)
    private readonly producerRepository: IProducerRepository,
  ) {}

  public async execute(id: string): Promise<void> {
    const producer = await this.producerRepository.findById(id);
    if (!producer) {
      throw new NotFoundException(`Produtor ${id} não encontrado.`);
    }

    const deletedAt = new Date();
    producer.softDelete(deletedAt);
    await this.producerRepository.softDelete(id, deletedAt);
    this.logger.log(`Producer soft-deleted: ${id}`);
  }
}
