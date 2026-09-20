import {
  parseExternalValidationStatus,
  UNKNOWN_EXTERNAL_VALIDATION_REASON,
} from './external-validation-status.js';

describe('parseExternalValidationStatus', () => {
  it('preserva status canônicos', () => {
    expect(parseExternalValidationStatus('VALIDATED')).toBe('VALIDATED');
    expect(parseExternalValidationStatus('PENDING_EXTERNAL_VALIDATION')).toBe(
      'PENDING_EXTERNAL_VALIDATION',
    );
    expect(parseExternalValidationStatus('REJECTED')).toBe('REJECTED');
  });

  it('nunca promove valor desconhecido a VALIDATED', () => {
    expect(parseExternalValidationStatus('PENDING')).toBe(
      'PENDING_EXTERNAL_VALIDATION',
    );
    expect(parseExternalValidationStatus('')).toBe(
      'PENDING_EXTERNAL_VALIDATION',
    );
    expect(parseExternalValidationStatus('garbage')).toBe(
      'PENDING_EXTERNAL_VALIDATION',
    );
    expect(UNKNOWN_EXTERNAL_VALIDATION_REASON).toBe('unknown_status');
  });
});
