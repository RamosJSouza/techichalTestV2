import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import {
  localSocioEnvironmentalCheck,
  type EsgStatus,
} from '../../domain/policies/socio-environmental.policy.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';

export interface EsgComplianceResult {
  producerId: string;
  documentMasked: string;
  esgStatus: EsgStatus;
  esgCheckedAt: string | null;
  hasIbamaEmbargo: boolean;
  hasSlaveLaborFlag: boolean;
  details: string[];
  documentValidationStatus: string;
  hasPendingExternalValidation: boolean;
}

export class GetProducerEsgComplianceUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
  ) {}

  public async execute(producerId: string): Promise<EsgComplianceResult> {
    const producer = await this.producerRepository.findById(producerId);
    if (!producer) {
      throw new NotFoundException(`Produtor ${producerId} não encontrado.`);
    }

    const check = localSocioEnvironmentalCheck(producer.document.value);
    const details = [...check.details];

    const hasPendingDocument =
      producer.documentValidationStatus === 'PENDING_EXTERNAL_VALIDATION';
    const hasPendingTerritorial = producer.farms.some(
      (farm) =>
        farm.territorialValidationStatus === 'PENDING_EXTERNAL_VALIDATION',
    );
    const hasPendingExternalValidation =
      hasPendingDocument || hasPendingTerritorial;

    let esgStatus: EsgStatus = producer.esgStatus;
    if (hasPendingExternalValidation) {
      details.push(
        'Validação externa BrasilAPI pendente (documento e/ou território); compliance plena não confirmada.',
      );
      if (esgStatus === 'APPROVED') {
        esgStatus = 'WARNING';
      }
    }

    return {
      producerId: producer.id,
      documentMasked: producer.document.masked(),
      esgStatus,
      esgCheckedAt: producer.esgCheckedAt?.toISOString() ?? null,
      hasIbamaEmbargo: check.hasIbamaEmbargo,
      hasSlaveLaborFlag: check.hasSlaveLaborFlag,
      details,
      documentValidationStatus: producer.documentValidationStatus,
      hasPendingExternalValidation,
    };
  }
}
