import { Farm } from '../../domain/entities/farm.js';
import { Producer } from '../../domain/entities/producer.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { InactiveCnpjException } from '../../domain/exceptions/inactive-cnpj.exception.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import type { ExternalValidationStatus } from '../../domain/constants/external-validation-status.js';
import type { AppConfigPort } from '../services/app-config.port.js';
import { applyEsgCheck } from '../services/apply-esg-check.js';
import { applyFarmCompliancePolicies } from '../services/apply-farm-compliance.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';
import type { LoggerPort } from '../services/logger.port.js';

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

export interface CreateProducerInput {
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
            `CNPJ ${document.masked()} pending external validation (BrasilAPI unavailable)`,
          );
          break;
        case 'VALIDATED':
          if (!lookup.data.isActive) {
            throw new InactiveCnpjException(
              `CNPJ ${document.masked()} não está com situação cadastral ATIVA.`,
            );
          }
          if (lookup.data.razaoSocial) {
            name = lookup.data.razaoSocial;
          }
          documentValidationStatus = 'VALIDATED';
          break;
        default: {
          const _exhaustive: never = lookup;
          throw new Error(`Unexpected CNPJ lookup: ${JSON.stringify(_exhaustive)}`);
        }
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
    });
    producer.applyEsgStatus(esgStatus);

    for (const farmInput of input.farms ?? []) {
      const territorialStatus = await assertCityBelongsToState(
        this.brazilData,
        farmInput.city,
        farmInput.state,
        this.logger,
      );
      const farm = Farm.create({
        producerId: producer.id,
        ...farmInput,
        territorialValidationStatus: territorialStatus,
      });
      applyFarmCompliancePolicies(farm);
      producer.addFarm(farm);
    }

    await this.producerRepository.save(producer);
    this.logger.log(`Producer created: ${producer.id}`);
    return producer;
  }
}
