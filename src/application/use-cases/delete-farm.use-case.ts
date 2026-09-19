import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import type { LoggerPort } from '../services/logger.port.js';

export class DeleteFarmUseCase {
  public constructor(
    private readonly farmRepository: IFarmRepository,
    private readonly logger: LoggerPort,
  ) {}

  public async execute(id: string): Promise<void> {
    const farm = await this.farmRepository.findById(id);
    if (!farm) {
      throw new NotFoundException(`Fazenda ${id} não encontrada.`);
    }

    await this.farmRepository.softDelete(id, new Date());
    this.logger.log(`Farm soft-deleted: ${id}`);
  }
}
