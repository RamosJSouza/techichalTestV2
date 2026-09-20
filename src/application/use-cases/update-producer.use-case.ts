import { Producer } from '../../domain/entities/producer.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import type { ExternalValidationStatus } from '../../domain/constants/external-validation-status.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';
import type { ExternalValidationAuditPort } from '../services/external-validation-audit.port.js';
import type { LoggerPort } from '../services/logger.port.js';
import { resolveCnpjDocumentValidation } from '../services/resolve-cnpj-document-validation.js';

interface UpdateProducerInput {
  name?: string;
  document?: string;
}

export class UpdateProducerUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
    private readonly crypto: CryptoServiceInterface,
    private readonly brazilData: BrazilDataServiceInterface,
    private readonly logger: LoggerPort,
    private readonly audit: ExternalValidationAuditPort,
  ) {}

  public async execute(
    id: string,
    input: UpdateProducerInput,
  ): Promise<Producer> {
    const producer = await this.producerRepository.findById(id);
    if (!producer) {
      throw new NotFoundException(`Produtor ${id} não encontrado.`);
    }

    if (input.name !== undefined) {
      producer.updateName(input.name);
    }

    if (input.document !== undefined) {
      const previousStatus = producer.documentValidationStatus;
      const document = CpfCnpj.create(input.document);
      const hash = this.crypto.blindIndex(document.value);
      const existing = await this.producerRepository.findByDocumentHash(hash);
      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe produtor com este documento.');
      }

      let documentValidationStatus: ExternalValidationStatus = 'VALIDATED';
      let documentValidationPendingReason: string | null = null;
      let nextName: string | undefined;

      if (document.isCnpj()) {
        const resolved = await resolveCnpjDocumentValidation({
          mode: 'strict',
          brazilData: this.brazilData,
          document,
          logger: this.logger,
          pendingLogContext: 'update',
        });
        documentValidationStatus = resolved.status;
        documentValidationPendingReason = resolved.pendingReason;
        if (resolved.razaoSocial) {
          nextName = resolved.razaoSocial;
        }
      }

      producer.updateDocument(document.value);
      producer.setDocumentValidationStatus(
        documentValidationStatus,
        documentValidationPendingReason,
      );
      if (nextName !== undefined && input.name === undefined) {
        producer.updateName(nextName);
      }

      if (
        documentValidationStatus === 'PENDING_EXTERNAL_VALIDATION' &&
        producer.esgStatus === 'APPROVED'
      ) {
        producer.applyEsgStatus('WARNING');
      }

      await this.producerRepository.update(producer);
      await this.audit.append({
        resourceType: 'producer_document',
        resourceId: producer.id,
        previousStatus,
        newStatus: documentValidationStatus,
        reason: documentValidationPendingReason,
        trigger: 'write',
        actor: 'system',
      });
      return producer;
    }

    return this.producerRepository.update(producer);
  }
}
