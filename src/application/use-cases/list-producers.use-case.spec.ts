import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto } from '../../testing/test-helpers.js';
import { ListProducersUseCase } from './list-producers.use-case.js';
import { buildCreateProducer, defaultBrazil } from '../../testing/use-case-factories.js';

describe('ListProducersUseCase', () => {
  it('pagina com teto e ordenação estável', async () => {
    const crypto = testCrypto();
    const repo = new InMemoryProducerRepository(crypto);
    const create = buildCreateProducer(repo, defaultBrazil, crypto);

    await create.execute({ name: 'Beta', document: '529.982.247-25' });
    await create.execute({ name: 'Alpha', document: '390.533.447-05' });
    await create.execute({ name: 'Gamma', document: '111.444.777-35' });

    const useCase = new ListProducersUseCase(repo);
    const page1 = await useCase.execute({
      page: 1,
      pageSize: 2,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(page1.total).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page1.items[0]?.name).toBe('Alpha');
    expect(page1.items[1]?.name).toBe('Beta');
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await useCase.execute({
      page: 1,
      pageSize: 2,
      sortBy: 'name',
      sortOrder: 'asc',
      cursor: page1.nextCursor!,
    });
    expect(page2.page).toBe(0);
    expect(page2.items.map((p) => p.name)).toEqual(['Gamma']);
    expect(page2.nextCursor).toBeNull();

    const filtered = await useCase.execute({
      page: 1,
      pageSize: 10,
      sortBy: 'name',
      sortOrder: 'asc',
      name: 'mm',
    });
    expect(filtered.items.map((p) => p.name)).toEqual(['Gamma']);
  });
});
