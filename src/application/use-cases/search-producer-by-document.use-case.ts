import { Producer } from '../../domain/entities/producer.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import type { CryptoServiceInterface } from '../services/crypto.service.interface.js';

export class SearchProducerByDocumentUseCase {
  public constructor(
    private readonly producerRepository: IProducerRepository,
    private readonly crypto: CryptoServiceInterface,
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
