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
  return chain as ReturnType<typeof createChain>;
}

describe('DrizzleProducerRepository hydrateMany isolation', () => {
  it('não associa fazenda de outro produtor na página', async () => {
    const p1 = '11111111-1111-1111-1111-111111111111';
    const p2 = '22222222-2222-2222-2222-222222222222';
    const f1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const f2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    const producerRows = [producerRow(p1, 'A'), producerRow(p2, 'B')];
    const farmRows = [
      {
        id: f1,
        producerId: p1,
        name: 'F1',
        city: 'Campinas',
        state: 'SP',
        totalArea: '100',
        arableArea: '60',
        vegetationArea: '20',
        carNumber: null,
        carStatus: null,
        climateRiskScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: f2,
        producerId: p2,
        name: 'F2',
        city: 'Londrina',
        state: 'PR',
        totalArea: '200',
        arableArea: '100',
        vegetationArea: '40',
        carNumber: null,
        carStatus: null,
        climateRiskScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    const queues = [
      createChain([{ value: 2 }]),
      createChain(producerRows),
      createChain(farmRows),
      createChain([]),
      createChain([]),
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
    const a = result.items.find((p) => p.id === p1);
    const b = result.items.find((p) => p.id === p2);
    expect(a?.farms.map((f) => f.id)).toEqual([f1]);
    expect(b?.farms.map((f) => f.id)).toEqual([f2]);
    expect(a?.farms.some((f) => f.id === f2)).toBe(false);
  });
});
