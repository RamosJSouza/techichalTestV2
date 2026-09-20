import type { ExternalValidationAuditPort } from '../services/external-validation-audit.port.js';
import type { ExternalValidationAuditTrigger } from '../services/external-validation-audit.port.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { LoggerPort } from '../services/logger.port.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import type { ExternalValidationStatus } from '../../domain/constants/external-validation-status.js';

interface RevalidateResult {
  id: string;
  previousStatus: ExternalValidationStatus;
  newStatus: ExternalValidationStatus;
  reason: string | null;
}

export class RevalidateProducerDocumentUseCase {
  public constructor(
    private readonly producers: IProducerRepository,
    private readonly brazil: BrazilDataServiceInterface,
    private readonly audit: ExternalValidationAuditPort,
    private readonly logger: LoggerPort,
  ) {}

  public async execute(
    id: string,
    trigger: ExternalValidationAuditTrigger,
  ): Promise<RevalidateResult> {
    const producer = await this.producers.findById(id);
    if (!producer) {
      throw new NotFoundException(`Produtor ${id} não encontrado.`);
    }

    const previousStatus = producer.documentValidationStatus;
    const actor = trigger === 'admin' ? 'admin' : 'system';

    if (!producer.document.isCnpj()) {
      producer.setDocumentValidationStatus('VALIDATED');
      await this.producers.update(producer);
      if (previousStatus !== 'VALIDATED') {
        await this.audit.append({
          resourceType: 'producer_document',
          resourceId: producer.id,
          previousStatus,
          newStatus: 'VALIDATED',
          reason: 'cpf_local',
          trigger,
          actor,
        });
      }
      return {
        id: producer.id,
        previousStatus,
        newStatus: 'VALIDATED',
        reason: 'cpf_local',
      };
    }

    const lookup = await this.brazil.getCnpjData(producer.document.value);
    let newStatus: ExternalValidationStatus = previousStatus;
    let reason: string | null = null;

    switch (lookup.outcome) {
      case 'VALIDATED':
        if (!lookup.data.isActive) {
          newStatus = 'REJECTED';
          reason = 'cnpj_inactive';
          producer.setDocumentValidationStatus('REJECTED', reason);
        } else {
          newStatus = 'VALIDATED';
          reason = null;
          producer.setDocumentValidationStatus('VALIDATED');
          if (lookup.data.razaoSocial) {
            producer.updateName(lookup.data.razaoSocial);
          }
        }
        break;
      case 'PENDING_EXTERNAL_VALIDATION':
        newStatus = 'PENDING_EXTERNAL_VALIDATION';
        reason = lookup.reason;
        producer.setDocumentValidationStatus(
          'PENDING_EXTERNAL_VALIDATION',
          lookup.reason,
        );
        break;
      case 'REJECTED':
        newStatus = 'REJECTED';
        reason = lookup.reason;
        producer.setDocumentValidationStatus('REJECTED', lookup.reason);
        break;
      default: {
        const _exhaustive: never = lookup;
        throw new Error(`Unexpected CNPJ lookup: ${JSON.stringify(_exhaustive)}`);
      }
    }

    await this.producers.update(producer);
    await this.audit.append({
      resourceType: 'producer_document',
      resourceId: producer.id,
      previousStatus,
      newStatus,
      reason,
      trigger,
      actor,
    });

    this.logger.log(
      `Revalidate producer document ${producer.id}: ${previousStatus} → ${newStatus} (${reason ?? 'ok'}) via ${trigger}`,
    );

    return { id: producer.id, previousStatus, newStatus, reason };
  }
}
