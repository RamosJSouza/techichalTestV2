import { Inject, Injectable, Logger } from '@nestjs/common';
import { Farm } from '../../domain/entities/farm.js';
import { Producer } from '../../domain/entities/producer.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { InactiveCnpjException } from '../../domain/exceptions/inactive-cnpj.exception.js';
import { PRODUCER_REPOSITORY } from '../../domain/repositories/producer.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import { BRAZIL_DATA_SERVICE } from '../services/brazil-data.service.interface.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import { CRYPTO_SERVICE_PORT } from '../services/crypto.service.interface.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';

export interface CreateProducerFarmInput {
  name: string;
  city: string;
  state: string;
  totalArea: number;
  arableArea: number;
  vegetationArea: number;
  harvests?: Array<{ year: string; crops: string[] }>;
}

export interface CreateProducerInput {
  name: string;
  document: string;
  farms?: CreateProducerFarmInput[];
}

@Injectable()
export class CreateProducerUseCase {
  private readonly logger = new Logger(CreateProducerUseCase.name);

  public constructor(
    @Inject(PRODUCER_REPOSITORY)
    private readonly producerRepository: IProducerRepository,
    @Inject(BRAZIL_DATA_SERVICE)
    private readonly brazilData: BrazilDataServiceInterface,
    @Inject(CRYPTO_SERVICE_PORT) private readonly crypto: CryptoServiceInterface,
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

    const producer = Producer.create({
      name,
      document: document.value,
    });

    for (const farmInput of input.farms ?? []) {
      await assertCityBelongsToState(
        this.brazilData,
        farmInput.city,
        farmInput.state,
        this.logger,
      );
      producer.addFarm(
        Farm.create({
          producerId: producer.id,
          ...farmInput,
        }),
      );
    }

    await this.producerRepository.save(producer);
    this.logger.log(`Producer created: ${producer.id}`);
    return producer;
  }
}
