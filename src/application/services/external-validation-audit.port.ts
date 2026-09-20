import type { ExternalValidationStatus } from '../../domain/constants/external-validation-status.js';

export const EXTERNAL_VALIDATION_AUDIT_PORT = Symbol(
  'EXTERNAL_VALIDATION_AUDIT_PORT',
);

export type ExternalValidationAuditTrigger = 'write' | 'job' | 'admin';

type ExternalValidationResourceType =
  | 'producer_document'
  | 'farm_territorial';

type ExternalValidationAuditActor = 'system' | 'admin';

export interface ExternalValidationAuditEntry {
  resourceType: ExternalValidationResourceType;
  resourceId: string;
  previousStatus: ExternalValidationStatus | string;
  newStatus: ExternalValidationStatus | string;
  reason: string | null;
  trigger: ExternalValidationAuditTrigger;
  actor: ExternalValidationAuditActor;
  traceId?: string | null;
}

export interface ExternalValidationAuditPort {
  append(entry: ExternalValidationAuditEntry): Promise<void>;
}
