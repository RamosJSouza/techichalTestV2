import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto, testLogger } from '../../testing/test-helpers.js';
import {
  buildCreateProducer,
  defaultBrazil,
  noopAudit,
} from '../../testing/use-case-factories.js';
import { UpdateProducerUseCase } from './update-producer.use-case.js';

describe('UpdateProducerUseCase', () => {
  const crypto = testCrypto();

  it('atualiza nome do produtor', async () => {
    const repo = new InMemoryProducerRepository(crypto);
    const created = await buildCreateProducer(repo).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    const updated = await new UpdateProducerUseCase(
      repo,
      crypto,
      defaultBrazil,
      testLogger(),
      noopAudit(),
    ).execute(created.id, { name: 'Maria' });
    expect(updated.name).toBe('Maria');
  });

  it('rejeita id inexistente', async () => {
    const repo = new InMemoryProducerRepository(crypto);
    await expect(
      new UpdateProducerUseCase(
        repo,
        crypto,
        defaultBrazil,
        testLogger(),
        noopAudit(),
      ).execute('00000000-0000-4000-8000-000000000000', { name: 'X' }),
    ).rejects.toThrow(/não encontrado/);
  });
});
