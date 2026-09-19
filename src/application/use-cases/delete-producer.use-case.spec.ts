import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto, testLogger } from '../../testing/test-helpers.js';
import { buildCreateProducer } from '../../testing/use-case-factories.js';
import { DeleteProducerUseCase } from './delete-producer.use-case.js';

describe('DeleteProducerUseCase', () => {
  const crypto = testCrypto();

  it('remove produtor logicamente', async () => {
    const repo = new InMemoryProducerRepository(crypto);
    const created = await buildCreateProducer(repo).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    await new DeleteProducerUseCase(repo, testLogger()).execute(created.id);
    expect(await repo.findById(created.id)).toBeNull();
  });
});
