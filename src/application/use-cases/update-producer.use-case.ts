import { Producer } from '../../domain/entities/producer.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { InactiveCnpjException } from '../../domain/exceptions/inactive-cnpj.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import type { ExternalValidationStatus } from '../../domain/constants/external-validation-status.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';
import type { LoggerPort } from '../services/logger.port.js';

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
      const document = CpfCnpj.create(input.document);
      const hash = this.crypto.blindIndex(document.value);
      const existing = await this.producerRepository.findByDocumentHash(hash);
      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe produtor com este documento.');
      }

      let documentValidationStatus: ExternalValidationStatus = 'VALIDATED';
      let nextName: string | undefined;

      if (document.isCnpj()) {
        const lookup = await this.brazilData.getCnpjData(document.value);
        switch (lookup.outcome) {
          case 'REJECTED':
            throw new InactiveCnpjException(
              lookup.reason ||
                `CNPJ ${document.masked()} não está com situação cadastral ATIVA.`,
            );
          case 'PENDING_EXTERNAL_VALIDATION':
            documentValidationStatus = 'PENDING_EXTERNAL_VALIDATION';
            this.logger.warn(
              `CNPJ ${document.masked()} pending external validation on update (BrasilAPI unavailable)`,
            );
            break;
          case 'VALIDATED':
            if (!lookup.data.isActive) {
              throw new InactiveCnpjException(
                `CNPJ ${document.masked()} não está com situação cadastral ATIVA.`,
              );
            }
            if (lookup.data.razaoSocial) {
              nextName = lookup.data.razaoSocial;
            }
            documentValidationStatus = 'VALIDATED';
            break;
          default: {
            const _exhaustive: never = lookup;
            throw new Error(
              `Unexpected CNPJ lookup: ${JSON.stringify(_exhaustive)}`,
            );
          }
        }
      }

      producer.updateDocument(document.value);
      producer.setDocumentValidationStatus(documentValidationStatus);
      if (nextName !== undefined && input.name === undefined) {
        producer.updateName(nextName);
      }

      if (
        documentValidationStatus === 'PENDING_EXTERNAL_VALIDATION' &&
        producer.esgStatus === 'APPROVED'
      ) {
        producer.applyEsgStatus('WARNING');
      }
    }

    return this.producerRepository.update(producer);
  }
}
