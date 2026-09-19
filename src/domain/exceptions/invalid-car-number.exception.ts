import { DomainException } from './domain.exception.js';

export class InvalidCarNumberException extends DomainException {
  public constructor(message: string) {
    super(message, 'INVALID_CAR_NUMBER');
  }
}
