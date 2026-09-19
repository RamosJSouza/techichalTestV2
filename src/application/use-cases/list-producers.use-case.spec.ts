import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto } from '../../testing/test-helpers.js';
import { buildCreateProducer } from '../../testing/use-case-factories.js';
import { ListProducersUseCase } from './list-producers.use-case.js';

describe('ListProducersUseCase', () => {
  const crypto = testCrypto();

  it('lista produtores cadastrados', async () => {
    const repo = new InMemoryProducerRepository(crypto);
    await buildCreateProducer(repo).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    const list = await new ListProducersUseCase(repo).execute();
    expect(list).toHaveLength(1);
  });
});
