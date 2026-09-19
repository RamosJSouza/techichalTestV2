import { Farm } from '../../domain/entities/farm.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { CarValidationServiceInterface } from '../services/car-validation.service.interface.js';
import type { LoggerPort } from '../services/logger.port.js';
import type { ProagroServiceInterface } from '../services/proagro.service.interface.js';

export interface UpdateFarmInput {
  name?: string;
  city?: string;
  state?: string;
  totalArea?: number;
  arableArea?: number;
  vegetationArea?: number;
  carNumber?: string | null;
  harvests?: Array<{ year: string; crops: string[] }>;
}

export class UpdateFarmUseCase {
  public constructor(
    private readonly farmRepository: IFarmRepository,
    private readonly brazilData: BrazilDataServiceInterface,
    private readonly carValidation: CarValidationServiceInterface,
    private readonly proagro: ProagroServiceInterface,
    private readonly logger: LoggerPort,
  ) {}

  public async execute(id: string, input: UpdateFarmInput): Promise<Farm> {
    const farm = await this.farmRepository.findById(id);
    if (!farm) {
      throw new NotFoundException(`Fazenda ${id} não encontrada.`);
    }

    const nextCity = input.city ?? farm.city;
    const nextState = input.state ?? farm.state;
    if (input.city !== undefined || input.state !== undefined) {
      await assertCityBelongsToState(
        this.brazilData,
        nextCity,
        nextState,
        this.logger,
      );
    }

    farm.updateDetails(input);

    if (input.harvests !== undefined) {
      farm.replaceHarvests(input.harvests);
    }

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

    const updated = await this.farmRepository.update(farm, {
      harvestsChanged: input.harvests !== undefined,
    });
    this.logger.log(`Farm updated: ${id}`);
    return updated;
  }
}
