import { DomainException } from './domain.exception.js';

export class CityStateMismatchException extends DomainException {
  public constructor(message: string) {
    super(message, 'TERRITORIAL_INCONSISTENCY');
  }
}
