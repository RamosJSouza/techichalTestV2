import { CryptoService } from '../crypto/crypto.service.js';
import { DrizzleProducerRepository } from './drizzle-producer.repository.js';

const crypto = new CryptoService('bench-pepper-secret-min-16xx', {
  keyId: 'v1',
  keyHex:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
});

function producerRow(id: string, name: string) {
  const doc = '52998224725';
  return {
    id,
    name,
    document: crypto.encrypt(doc),
    documentHash: crypto.blindIndex(doc),
    esgStatus: 'APPROVED',
    esgCheckedAt: null,
    documentValidationStatus: 'VALIDATED',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    deletedAt: null,
  };
}

type QueryResult = unknown[];

function createChain(result: QueryResult): Promise<QueryResult> & {
  select: () => unknown;
  from: () => unknown;
  where: () => unknown;
  orderBy: () => unknown;
  limit: () => unknown;
  offset: () => unknown;
  groupBy: () => unknown;
} {
  const promise = Promise.resolve(result);
  const chain = promise as Promise<QueryResult> & Record<string, unknown>;
  const self = (): typeof chain => chain;
  chain.select = self;
  chain.from = self;
  chain.where = self;
  chain.orderBy = self;
  chain.limit = self;
  chain.offset = self;
  chain.groupBy = self;
  return chain as ReturnType<typeof createChain>;
}

describe('DrizzleProducerRepository findMany summary', () => {
  it('agrega fazendas por produtor sem misturar IDs', async () => {
    const p1 = '11111111-1111-1111-1111-111111111111';
    const p2 = '22222222-2222-2222-2222-222222222222';

    const producerRows = [producerRow(p1, 'A'), producerRow(p2, 'B')];
    const aggRows = [
      {
        producerId: p1,
        farmsCount: 1,
        totalAreaHa: 100,
        arableAreaHa: 60,
        vegetationAreaHa: 20,
        farmStates: ['SP'],
      },
      {
        producerId: p2,
        farmsCount: 1,
        totalAreaHa: 200,
        arableAreaHa: 100,
        vegetationAreaHa: 40,
        farmStates: ['PR'],
      },
    ];

    const queues = [
      createChain([{ value: 2 }]),
      createChain(producerRows),
      createChain(aggRows),
    ];
    let call = 0;
    const db = {
      select: () => {
        const next = queues[call] ?? createChain([]);
        call += 1;
        return next;
      },
    };

    const repo = new DrizzleProducerRepository(db as never, crypto);
    const result = await repo.findMany({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.items).toHaveLength(2);
    expect(call).toBe(3);
    const a = result.items.find((p) => p.id === p1);
    const b = result.items.find((p) => p.id === p2);
    expect(a?.farmsCount).toBe(1);
    expect(a?.farmStates).toEqual(['SP']);
    expect(a?.totalAreaHa).toBe(100);
    expect(b?.farmsCount).toBe(1);
    expect(b?.farmStates).toEqual(['PR']);
    expect(b?.totalAreaHa).toBe(200);
    expect(a).not.toHaveProperty('farms');
  });
});
