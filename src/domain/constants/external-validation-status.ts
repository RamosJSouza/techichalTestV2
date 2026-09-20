/** Status de validação externa (BrasilAPI) — eixo distinto de ESG/CAR. */
const EXTERNAL_VALIDATION_STATUSES = [
  'VALIDATED',
  'PENDING_EXTERNAL_VALIDATION',
  'REJECTED',
] as const;

export type ExternalValidationStatus =
  (typeof EXTERNAL_VALIDATION_STATUSES)[number];

function isExternalValidationStatus(
  value: string,
): value is ExternalValidationStatus {
  return (EXTERNAL_VALIDATION_STATUSES as readonly string[]).includes(value);
}

export function parseExternalValidationStatus(
  value: string,
): ExternalValidationStatus {
  if (isExternalValidationStatus(value)) {
    return value;
  }
  return 'VALIDATED';
}
