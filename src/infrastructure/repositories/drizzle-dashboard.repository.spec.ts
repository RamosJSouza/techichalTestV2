import type { DashboardFilters } from '../../domain/repositories/dashboard.repository.js';
import { DrizzleDashboardRepository } from './drizzle-dashboard.repository.js';

type QueryResult = unknown[];

function createChain(result: QueryResult = []): Promise<QueryResult> & {
  select: () => unknown;
  from: () => unknown;
  where: () => unknown;
  innerJoin: () => unknown;
  groupBy: () => unknown;
  orderBy: () => unknown;
  limit: () => unknown;
} {
  const promise = Promise.resolve(result);
  const chain = promise as Promise<QueryResult> & Record<string, unknown>;
  const self = (): typeof chain => chain;
  chain.select = self;
  chain.from = self;
  chain.where = self;
  chain.innerJoin = self;
  chain.groupBy = self;
  chain.orderBy = self;
  chain.limit = self;
  return chain as ReturnType<typeof createChain>;
}

describe('DrizzleDashboardRepository', () => {
  it('executa getStats sem filtros e devolve shape completo', async () => {
    const queues = [
      createChain([
        {
          totalFarms: 2,
          totalHectares: '1500',
          arableHectares: '900',
          vegetationHectares: '400',
        },
      ]),
      createChain([{ averageScore: '12.50', farmsWithScore: 2 }]),
      createChain([{ state: 'SP', count: 2, hectares: '1500' }]),
      createChain([{ crop: 'Soja', count: 1 }]),
      createChain([{ status: 'ACTIVE', count: 1 }]),
      createChain([{ status: 'APPROVED', count: 1 }]),
      createChain([
        { state: 'SP', averageScore: '12.50', farmsWithScore: 2 },
      ]),
      createChain([
        { crop: 'Soja', averageScore: '12.50', farmsWithScore: 1 },
      ]),
      createChain([{ year: '2025/2026', crop: 'Soja', count: 1 }]),
      createChain([{ month: '2025-01', farms: 2, hectares: '1500' }]),
      createChain([
        { city: 'Ribeirão Preto', state: 'SP', farms: 2, hectares: '1500' },
      ]),
    ];
    let call = 0;
    const db = {
      select: () => {
        const next = queues[call] ?? createChain([]);
        call += 1;
        return next;
      },
    };

    const repo = new DrizzleDashboardRepository(db as never);
    const stats = await repo.getStats();

    expect(stats.totalFarms).toBe(2);
    expect(stats.totalHectares).toBe(1500);
    expect(stats.averageFarmSize).toBe(750);
    expect(stats.carComplianceRate).toBe(50);
    expect(stats.esgComplianceRate).toBe(100);
    expect(stats.byState).toHaveLength(1);
    expect(stats.byCrop[0]?.crop).toBe('Soja');
    expect(stats.byCarStatus[0]?.status).toBe('ACTIVE');
    expect(stats.byEsgStatus[0]?.status).toBe('APPROVED');
    expect(stats.climateRiskByState[0]?.state).toBe('SP');
    expect(stats.climateRiskByCrop[0]?.crop).toBe('Soja');
    expect(stats.cropsByYear[0]?.year).toBe('2025/2026');
    expect(stats.farmsByMonth[0]?.month).toBe('2025-01');
    expect(stats.topCities[0]?.city).toBe('Ribeirão Preto');
  });

  it('snapshot das chaves do DashboardStats após getStats', async () => {
    const queues = Array.from({ length: 11 }, () => createChain([]));
    let call = 0;
    const db = {
      select: () => {
        const next = queues[call] ?? createChain([]);
        call += 1;
        return next;
      },
    };
    const repo = new DrizzleDashboardRepository(db as never);
    const stats = await repo.getStats();
    expect(Object.keys(stats).sort()).toEqual(
      [
        'averageFarmSize',
        'byCarStatus',
        'byCrop',
        'byEsgStatus',
        'byLandUse',
        'byState',
        'carComplianceRate',
        'climateRiskByCrop',
        'climateRiskByState',
        'cropsByYear',
        'esgComplianceRate',
        'farmsByMonth',
        'regionalClimateRisk',
        'topCities',
        'totalFarms',
        'totalHectares',
      ].sort(),
    );
  });

  it('aceita filtros sem lançar', async () => {
    const empty = createChain([]);
    const db = {
      select: () => empty,
    };
    const repo = new DrizzleDashboardRepository(db as never);
    const filters: DashboardFilters = {
      state: 'SP',
      crop: 'Soja',
      harvestYear: '2025/2026',
      esgStatus: 'APPROVED',
      carStatus: 'ACTIVE',
      minClimateRisk: 0,
      maxClimateRisk: 50,
    };
    const stats = await repo.getStats(filters);
    expect(stats.totalFarms).toBe(0);
    expect(stats.byState).toEqual([]);
    expect(stats.byCarStatus).toEqual([]);
  });
});
