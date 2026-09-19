import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto } from '../../testing/test-helpers.js';
import { buildCreateProducer } from '../../testing/use-case-factories.js';
import { SearchProducerByDocumentUseCase } from './search-producer-by-document.use-case.js';

describe('SearchProducerByDocumentUseCase', () => {
  const crypto = testCrypto();

  it('busca por documento via blind index', async () => {
    const repo = new InMemoryProducerRepository(crypto);
    await buildCreateProducer(repo).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    const found = await new SearchProducerByDocumentUseCase(repo, crypto).execute(
      '529.982.247-25',
    );
    expect(found.document.value).toBe('52998224725');
  });
});
