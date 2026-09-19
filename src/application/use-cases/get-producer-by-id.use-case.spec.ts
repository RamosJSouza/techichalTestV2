import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto } from '../../testing/test-helpers.js';
import { buildCreateProducer } from '../../testing/use-case-factories.js';
import { GetProducerByIdUseCase } from './get-producer-by-id.use-case.js';

describe('GetProducerByIdUseCase', () => {
  const crypto = testCrypto();

  it('retorna produtor por id', async () => {
    const repo = new InMemoryProducerRepository(crypto);
    const created = await buildCreateProducer(repo).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    const found = await new GetProducerByIdUseCase(repo).execute(created.id);
    expect(found.id).toBe(created.id);
  });

  it('rejeita id inexistente', async () => {
    const repo = new InMemoryProducerRepository(crypto);
    await expect(
      new GetProducerByIdUseCase(repo).execute(
        '00000000-0000-4000-8000-000000000000',
      ),
    ).rejects.toThrow(/não encontrado/);
  });
});
