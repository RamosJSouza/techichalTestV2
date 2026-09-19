import { Farm } from '../../domain/entities/farm.js';
import { Producer } from '../../domain/entities/producer.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { InactiveCnpjException } from '../../domain/exceptions/inactive-cnpj.exception.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import type { AppConfigPort } from '../services/app-config.port.js';
import { applyEsgCheck } from '../services/apply-esg-check.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { CarValidationServiceInterface } from '../services/car-validation.service.interface.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';
import type { LoggerPort } from '../services/logger.port.js';
import type { ProagroServiceInterface } from '../services/proagro.service.interface.js';
import type { SocioEnvironmentalServiceInterface } from '../services/socio-environmental.service.interface.js';

export interface CreateProducerFarmInput {
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
    private readonly socioEnvironmental: SocioEnvironmentalServiceInterface,
    private readonly carValidation: CarValidationServiceInterface,
    private readonly proagro: ProagroServiceInterface,
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
    if (document.isCnpj()) {
      const company = await this.brazilData.getCnpjData(document.value);
      if (company === null) {
        this.logger.warn(
          `CNPJ ${document.masked()} validated offline only (BrasilAPI degraded)`,
        );
      } else if (!company.isActive) {
        throw new InactiveCnpjException(
          `CNPJ ${document.masked()} não está com situação cadastral ATIVA.`,
        );
      } else if (company.razaoSocial) {
        name = company.razaoSocial;
      }
    }

    const esgStatus = await applyEsgCheck({
      documentDigits: document.value,
      socioEnvironmental: this.socioEnvironmental,
      strictMode: this.config.isEsgStrictMode(),
      logger: this.logger,
    });

    const producer = Producer.create({
      name,
      document: document.value,
    });
    producer.applyEsgStatus(esgStatus);

    for (const farmInput of input.farms ?? []) {
      await assertCityBelongsToState(
        this.brazilData,
        farmInput.city,
        farmInput.state,
        this.logger,
      );
      const farm = Farm.create({
        producerId: producer.id,
        ...farmInput,
      });
      await this.enrichFarm(farm);
      producer.addFarm(farm);
    }

    await this.producerRepository.save(producer);
    this.logger.log(`Producer created: ${producer.id}`);
    return producer;
  }

  private async enrichFarm(farm: Farm): Promise<void> {
    if (farm.carNumber) {
      const result = await this.carValidation.validateCar({
        carNumber: farm.carNumber.value,
        totalArea: farm.area.totalArea,
        vegetationArea: farm.area.vegetationArea,
      });
      farm.applyCarValidation(result.status);
    }

    const crops = farm.harvests.flatMap((h) => h.crops.map((c) => c.name));
    const score = await this.proagro.calculateClimateRisk({
      city: farm.city,
      state: farm.state,
      crops,
    });
    farm.setClimateRiskScore(score);
  }
}
