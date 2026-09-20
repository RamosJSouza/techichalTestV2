import { InvalidCarNumberException } from '../../domain/exceptions/invalid-car-number.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import {
  validateCar,
  type CarValidationResult,
} from '../../domain/policies/car-validation.policy.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';

export class ValidateFarmCarUseCase {
  public constructor(
    private readonly farmRepository: IFarmRepository,
  ) {}

  public async execute(
    farmId: string,
  ): Promise<CarValidationResult & { farmId: string; carNumber: string }> {
    const farm = await this.farmRepository.findById(farmId);
    if (!farm) {
      throw new NotFoundException(`Fazenda ${farmId} não encontrada.`);
    }
    if (!farm.carNumber) {
      throw new InvalidCarNumberException(
        'Fazenda não possui número de CAR cadastrado.',
      );
    }

    const result = validateCar({
      carNumber: farm.carNumber.value,
      totalArea: farm.area.totalArea,
      vegetationArea: farm.area.vegetationArea,
    });
    farm.applyCarValidation(result.status);
    await this.farmRepository.update(farm, { harvestsChanged: false });

    return {
      farmId: farm.id,
      carNumber: farm.carNumber.value,
      ...result,
    };
  }
}
