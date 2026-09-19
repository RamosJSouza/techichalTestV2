import { Inject, Injectable, Logger } from '@nestjs/common';
import { Farm } from '../../domain/entities/farm.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import { FARM_REPOSITORY } from '../../domain/repositories/farm.repository.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import { PRODUCER_REPOSITORY } from '../../domain/repositories/producer.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import { BRAZIL_DATA_SERVICE } from '../services/brazil-data.service.interface.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';

export interface CreateFarmInput {
  producerId: string;
  name: string;
  city: string;
  state: string;
  totalArea: number;
  arableArea: number;
  vegetationArea: number;
  harvests?: Array<{ year: string; crops: string[] }>;
}

@Injectable()
export class CreateFarmUseCase {
  private readonly logger = new Logger(CreateFarmUseCase.name);

  public constructor(
    @Inject(FARM_REPOSITORY)
    private readonly farmRepository: IFarmRepository,
    @Inject(PRODUCER_REPOSITORY)
    private readonly producerRepository: IProducerRepository,
    @Inject(BRAZIL_DATA_SERVICE)
    private readonly brazilData: BrazilDataServiceInterface,
  ) {}

  public async execute(input: CreateFarmInput): Promise<Farm> {
    const producer = await this.producerRepository.findById(input.producerId);
    if (!producer) {
      throw new NotFoundException(
        `Produtor ${input.producerId} não encontrado.`,
      );
    }

    await assertCityBelongsToState(
      this.brazilData,
      input.city,
      input.state,
      this.logger,
    );

    const farm = Farm.create(input);
    await this.farmRepository.save(farm);
    this.logger.log(`Farm registered: ${farm.id}`);
    return farm;
  }
}
