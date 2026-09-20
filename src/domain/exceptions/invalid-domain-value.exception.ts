import { DomainException } from './domain.exception.js';

export class InvalidDomainValueException extends DomainException {
  public constructor(message: string) {
    super(message, 'INVALID_DOMAIN_VALUE');
  }
}
