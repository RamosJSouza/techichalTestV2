import { DomainException } from './domain.exception.js';

export class InvalidDocumentException extends DomainException {
  public constructor(message: string) {
    super(message, 'INVALID_DOCUMENT');
  }
}
