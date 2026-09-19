import { Injectable } from '@nestjs/common';
import type {
  CarValidationResult,
  CarValidationServiceInterface,
} from '../../../application/services/car-validation.service.interface.js';

/** Mock determinístico: ACTIVE se vegetação >= 20% da área total; senão PENDING. */
@Injectable()
export class MockCarValidationAdapter implements CarValidationServiceInterface {
  public async validateCar(input: {
    carNumber: string;
    totalArea: number;
    vegetationArea: number;
  }): Promise<CarValidationResult> {
    const matchesFarmAreas = input.vegetationArea >= input.totalArea * 0.2;
    return {
      status: matchesFarmAreas ? 'ACTIVE' : 'PENDING',
      appHectares: Number((input.totalArea * 0.1).toFixed(2)),
      legalReserveHectares: Number((input.totalArea * 0.2).toFixed(2)),
      matchesFarmAreas,
    };
  }
}
