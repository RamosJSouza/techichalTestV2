import { DomainException } from './domain.exception.js';

export class ConflictException extends DomainException {
  public constructor(message: string) {
    super(message, 'CONFLICT');
  }
}
