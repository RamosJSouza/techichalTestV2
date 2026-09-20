import { Inject, Injectable } from '@nestjs/common';
import type {
  ExternalValidationAuditEntry,
  ExternalValidationAuditPort,
} from '../../application/services/external-validation-audit.port.js';
import type { DrizzleDb } from '../database/database.module.js';
import { DRIZZLE } from '../database/database.tokens.js';
import { externalValidationAudit } from '../database/schema/index.js';

@Injectable()
export class DrizzleExternalValidationAuditRepository
  implements ExternalValidationAuditPort
{
  public constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public async append(entry: ExternalValidationAuditEntry): Promise<void> {
    await this.db.insert(externalValidationAudit).values({
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      reason: entry.reason,
      trigger: entry.trigger,
      actor: entry.actor,
      traceId: entry.traceId ?? null,
    });
  }
}
