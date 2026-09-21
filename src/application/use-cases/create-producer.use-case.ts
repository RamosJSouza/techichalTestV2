import { Farm } from '../../domain/entities/farm.js';
import { Producer } from '../../domain/entities/producer.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import type { ExternalValidationStatus } from '../../domain/constants/external-validation-status.js';
import type { AppConfigPort } from '../services/app-config.port.js';
import { applyEsgCheck } from '../services/apply-esg-check.js';
import { applyFarmCompliancePolicies } from '../services/apply-farm-compliance.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';
import type { ExternalValidationAuditPort } from '../services/external-validation-audit.port.js';
import type { LoggerPort } from '../services/logger.port.js';
import { resolveCnpjDocumentValidation } from '../services/resolve-cnpj-document-validation.js';
import type { TransactionPort } from '../services/transaction.port.js';

interface CreateProducerFarmInput {
  name: string;
  city: string;
  state: string;
  totalArea: number;
  arableArea: number;
  vegetationArea: number;
  harvests?: Array<{ year: string; crops: string[] }>;
  carNumber?: string;
}

interface CreateProducerInput {
  name: string;
  document: string;
  farms?: CreateProducerFarmInput[];
}

export class CreateProducerUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
    private readonly brazilData: BrazilDataServiceInterface,
    private readonly crypto: CryptoServiceInterface,
    private readonly config: AppConfigPort,
    private readonly logger: LoggerPort,
    private readonly audit: ExternalValidationAuditPort,
    private readonly tx: TransactionPort,
  ) {}

  public async execute(input: CreateProducerInput): Promise<Producer> {
    const document = CpfCnpj.create(input.document);
    const documentHash = this.crypto.blindIndex(document.value);

    const existing =
      await this.producerRepository.findByDocumentHash(documentHash);
    if (existing) {
      throw new ConflictException('Já existe produtor com este documento.');
    }

    let name = input.name;
    let documentValidationStatus: ExternalValidationStatus = 'VALIDATED';
    let documentValidationPendingReason: string | null = null;

    if (document.isCnpj()) {
      const resolved = await resolveCnpjDocumentValidation({
        mode: 'strict',
        brazilData: this.brazilData,
        document,
        logger: this.logger,
        pendingLogContext: 'create',
      });
      documentValidationStatus = resolved.status;
      documentValidationPendingReason = resolved.pendingReason;
      if (resolved.razaoSocial) {
        name = resolved.razaoSocial;
      }
    }

    let esgStatus = await applyEsgCheck({
      documentDigits: document.value,
      strictMode: this.config.isEsgStrictMode(),
      logger: this.logger,
    });

    if (
      documentValidationStatus === 'PENDING_EXTERNAL_VALIDATION' &&
      esgStatus === 'APPROVED'
    ) {
      esgStatus = 'WARNING';
      this.logger.warn(
        `ESG downgraded to WARNING: document pending external validation (...${document.value.slice(-4)})`,
      );
    }

    const producer = Producer.create({
      name,
      document: document.value,
      documentValidationStatus,
      documentValidationPendingReason,
    });
    producer.applyEsgStatus(esgStatus);

    for (const farmInput of input.farms ?? []) {
      const territorial = await assertCityBelongsToState(
        this.brazilData,
        farmInput.city,
        farmInput.state,
        this.logger,
      );
      const farm = Farm.create({
        producerId: producer.id,
        ...farmInput,
        territorialValidationStatus: territorial.status,
        territorialValidationPendingReason: territorial.pendingReason,
      });
      applyFarmCompliancePolicies(farm);
      producer.addFarm(farm);
    }

    await this.tx.run(async () => {
      await this.producerRepository.save(producer);

      await this.audit.append({
        resourceType: 'producer_document',
        resourceId: producer.id,
        previousStatus: 'VALIDATED',
        newStatus: documentValidationStatus,
        reason: documentValidationPendingReason,
        trigger: 'write',
        actor: 'system',
      });
      for (const farm of producer.farms) {
        await this.audit.append({
          resourceType: 'farm_territorial',
          resourceId: farm.id,
          previousStatus: 'VALIDATED',
          newStatus: farm.territorialValidationStatus,
          reason: farm.territorialValidationPendingReason,
          trigger: 'write',
          actor: 'system',
        });
      }
    });

    this.logger.log(`Producer created: ${producer.id}`);
    return producer;
  }
}
