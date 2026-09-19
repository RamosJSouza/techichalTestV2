import { DomainException } from './domain.exception.js';

export class InvalidFarmAreaException extends DomainException {
  public constructor(message: string) {
    super(message, 'INVALID_FARM_AREA');
  }
}
