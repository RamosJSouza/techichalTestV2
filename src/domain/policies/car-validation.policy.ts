type CarValidationStatus = 'ACTIVE' | 'PENDING' | 'CANCELLED';

export interface CarValidationResult {
  status: CarValidationStatus;
  appHectares: number;
  legalReserveHectares: number;
  matchesFarmAreas: boolean;
}

const RESERVA_LEGAL_RATIO = 0.2;
const APP_RATIO = 0.1;

export function validateCar(input: {
  carNumber: string;
  totalArea: number;
  vegetationArea: number;
}): CarValidationResult {
  const legalReserveHectares = Number(
    (input.totalArea * RESERVA_LEGAL_RATIO).toFixed(2),
  );
  const appHectares = Number((input.totalArea * APP_RATIO).toFixed(2));
  const matchesFarmAreas = input.vegetationArea >= legalReserveHectares;

  return {
    status: matchesFarmAreas ? 'ACTIVE' : 'PENDING',
    appHectares,
    legalReserveHectares,
    matchesFarmAreas,
  };
}
