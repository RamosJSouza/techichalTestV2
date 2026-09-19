import { Injectable, NotImplementedException } from '@nestjs/common';
import type {
  CarValidationResult,
  CarValidationServiceInterface,
} from '../../../application/services/car-validation.service.interface.js';

/** Stub: aguarda contrato/credenciais SICAR. */
@Injectable()
export class SicarAdapter implements CarValidationServiceInterface {
  public async validateCar(_input: {
    carNumber: string;
    totalArea: number;
    vegetationArea: number;
  }): Promise<CarValidationResult> {
    throw new NotImplementedException(
      'SicarAdapter: contrato HTTP SICAR/CAR ainda não configurado. Use ENABLE_CAR_VALIDATION=false (mock).',
    );
  }
}
