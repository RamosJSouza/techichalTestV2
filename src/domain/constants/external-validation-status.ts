export const EXTERNAL_VALIDATION_STATUSES = [
  'VALIDATED',
  'PENDING_EXTERNAL_VALIDATION',
  'REJECTED',
] as const;

export type ExternalValidationStatus =
  (typeof EXTERNAL_VALIDATION_STATUSES)[number];

/** Motivo quando o valor persistido não é um status conhecido (nunca tratar como VALIDATED). */
export const UNKNOWN_EXTERNAL_VALIDATION_REASON = 'unknown_status';

export function isExternalValidationStatus(
  value: string,
): value is ExternalValidationStatus {
  return (EXTERNAL_VALIDATION_STATUSES as readonly string[]).includes(value);
}

/** Valor persistido desconhecido — nunca tratar como VALIDATED. */
export function parseExternalValidationStatus(
  value: string,
): ExternalValidationStatus {
  if (isExternalValidationStatus(value)) {
    return value;
  }
  return 'PENDING_EXTERNAL_VALIDATION';
}
