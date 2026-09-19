import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { EsgStatus } from '../../domain/policies/socio-environmental.policy.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import type { SocioEnvironmentalServiceInterface } from '../services/socio-environmental.service.interface.js';

export interface EsgComplianceResult {
  producerId: string;
  documentMasked: string;
  esgStatus: EsgStatus;
  esgCheckedAt: string | null;
  hasIbamaEmbargo: boolean;
  hasSlaveLaborFlag: boolean;
  details: string[];
}

export class GetProducerEsgComplianceUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
    private readonly socioEnvironmental: SocioEnvironmentalServiceInterface,
  ) {}

  public async execute(producerId: string): Promise<EsgComplianceResult> {
    const producer = await this.producerRepository.findById(producerId);
    if (!producer) {
      throw new NotFoundException(`Produtor ${producerId} não encontrado.`);
    }

    const check = await this.socioEnvironmental.checkDocument(
      producer.document.value,
    );

    return {
      producerId: producer.id,
      documentMasked: producer.document.masked(),
      esgStatus: producer.esgStatus,
      esgCheckedAt: producer.esgCheckedAt?.toISOString() ?? null,
      hasIbamaEmbargo: check.hasIbamaEmbargo,
      hasSlaveLaborFlag: check.hasSlaveLaborFlag,
      details: check.details,
    };
  }
}
