import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import type { LoggerPort } from '../services/logger.port.js';

export class DeleteProducerUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
    private readonly logger: LoggerPort,
  ) {}

  public async execute(id: string): Promise<void> {
    const producer = await this.producerRepository.findById(id);
    if (!producer) {
      throw new NotFoundException(`Produtor ${id} não encontrado.`);
    }

    await this.producerRepository.softDelete(id, new Date());
    this.logger.log(`Producer soft-deleted: ${id}`);
  }
}
