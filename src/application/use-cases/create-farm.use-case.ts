import { Farm } from '../../domain/entities/farm.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import type { AppConfigPort } from '../services/app-config.port.js';
import { applyEsgCheck } from '../services/apply-esg-check.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { CarValidationServiceInterface } from '../services/car-validation.service.interface.js';
import type { LoggerPort } from '../services/logger.port.js';
import type { ProagroServiceInterface } from '../services/proagro.service.interface.js';
import type { SocioEnvironmentalServiceInterface } from '../services/socio-environmental.service.interface.js';

export interface CreateFarmInput {
  producerId: string;
  name: string;
  city: string;
  state: string;
  totalArea: number;
  arableArea: number;
  vegetationArea: number;
  harvests?: Array<{ year: string; crops: string[] }>;
  carNumber?: string;
}

export class CreateFarmUseCase {
  public constructor(
    private readonly farmRepository: IFarmRepository,
    private readonly producerRepository: IProducerRepository,
    private readonly brazilData: BrazilDataServiceInterface,
    private readonly socioEnvironmental: SocioEnvironmentalServiceInterface,
    private readonly carValidation: CarValidationServiceInterface,
    private readonly proagro: ProagroServiceInterface,
    private readonly config: AppConfigPort,
    private readonly logger: LoggerPort,
  ) {}

  public async execute(input: CreateFarmInput): Promise<Farm> {
    const producer = await this.producerRepository.findById(input.producerId);
    if (!producer) {
      throw new NotFoundException(
        `Produtor ${input.producerId} não encontrado.`,
      );
    }

    await applyEsgCheck({
      documentDigits: producer.document.value,
      socioEnvironmental: this.socioEnvironmental,
      strictMode: this.config.isEsgStrictMode(),
      logger: this.logger,
    });

    await assertCityBelongsToState(
      this.brazilData,
      input.city,
      input.state,
      this.logger,
    );

    const farm = Farm.create(input);

    if (farm.carNumber) {
      const result = await this.carValidation.validateCar({
        carNumber: farm.carNumber.value,
        totalArea: farm.area.totalArea,
        vegetationArea: farm.area.vegetationArea,
      });
      farm.applyCarValidation(result.status);
    }

    const crops = farm.harvests.flatMap((h) => h.crops.map((c) => c.name));
    const score = await this.proagro.calculateClimateRisk({
      city: farm.city,
      state: farm.state,
      crops,
    });
    farm.setClimateRiskScore(score);

    await this.farmRepository.save(farm);
    this.logger.log(`Farm registered: ${farm.id}`);
    return farm;
  }
}
