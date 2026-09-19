type CarValidationStatus = 'ACTIVE' | 'PENDING' | 'CANCELLED';

export interface CarValidationResult {
  status: CarValidationStatus;
  appHectares: number;
  legalReserveHectares: number;
  matchesFarmAreas: boolean;
}

export const CAR_VALIDATION_SERVICE = Symbol('CAR_VALIDATION_SERVICE');

export interface CarValidationServiceInterface {
  validateCar(input: {
    carNumber: string;
    totalArea: number;
    vegetationArea: number;
  }): Promise<CarValidationResult>;
}
