import { DomainException } from './domain.exception.js';

export class NotFoundException extends DomainException {
  public constructor(message: string) {
    super(message, 'NOT_FOUND');
  }
}
