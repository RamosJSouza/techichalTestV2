import { Producer } from '../../domain/entities/producer.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';

interface UpdateProducerInput {
  name?: string;
  document?: string;
}

export class UpdateProducerUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
    private readonly crypto: CryptoServiceInterface,
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
