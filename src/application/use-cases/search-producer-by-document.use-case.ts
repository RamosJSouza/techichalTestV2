import { Inject, Injectable } from '@nestjs/common';
import { Producer } from '../../domain/entities/producer.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import { PRODUCER_REPOSITORY } from '../../domain/repositories/producer.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import { CRYPTO_SERVICE_PORT } from '../services/crypto.service.interface.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';

@Injectable()
export class SearchProducerByDocumentUseCase {
  public constructor(
    @Inject(PRODUCER_REPOSITORY)
    private readonly producerRepository: IProducerRepository,
    @Inject(CRYPTO_SERVICE_PORT) private readonly crypto: CryptoServiceInterface,
  ) {}

  public async execute(document: string): Promise<Producer> {
    const parsed = CpfCnpj.create(document);
    const hash = this.crypto.blindIndex(parsed.value);
    const producer = await this.producerRepository.findByDocumentHash(hash);
    if (!producer) {
      throw new NotFoundException(
        'Produtor não encontrado para o documento informado.',
      );
    }
    return producer;
  }
}
