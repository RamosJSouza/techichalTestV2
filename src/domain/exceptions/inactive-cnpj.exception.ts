import { DomainException } from './domain.exception.js';

export class InactiveCnpjException extends DomainException {
  public constructor(message: string) {
    super(message, 'INACTIVE_CNPJ');
  }
}
