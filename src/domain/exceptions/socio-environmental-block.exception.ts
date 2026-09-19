import { DomainException } from './domain.exception.js';

export class SocioEnvironmentalBlockException extends DomainException {
  public constructor(message: string) {
    super(message, 'SOCIO_ENVIRONMENTAL_BLOCK');
  }
}
