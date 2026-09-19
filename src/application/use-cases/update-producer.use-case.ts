import { Inject, Injectable } from '@nestjs/common';
import { Producer } from '../../domain/entities/producer.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import { PRODUCER_REPOSITORY } from '../../domain/repositories/producer.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import { CRYPTO_SERVICE_PORT } from '../services/crypto.service.interface.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';

export interface UpdateProducerInput {
  name?: string;
  document?: string;
}

@Injectable()
export class UpdateProducerUseCase {
  public constructor(
    @Inject(PRODUCER_REPOSITORY)
    private readonly producerRepository: IProducerRepository,
    @Inject(CRYPTO_SERVICE_PORT) private readonly crypto: CryptoServiceInterface,
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
      producer.updateDocument(document.value);
    }

    return this.producerRepository.update(producer);
  }
}
