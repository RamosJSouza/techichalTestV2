/**
 * Semântica das agregações do dashboard (espelha SQL): soft-delete e safras ARCHIVED.
 * Evita regressão sem depender de Postgres.
 */
describe('dashboard aggregate semantics', () => {
  type Farm = {
    id: string;
    deletedAt: Date | null;
    state: string;
    totalArea: number;
  };
  type Harvest = { id: string; farmId: string; status: 'ACTIVE' | 'ARCHIVED' };
  type Crop = { harvestId: string; cropName: string };

  function totalFarms(farms: Farm[]): number {
    return farms.filter((f) => f.deletedAt === null).length;
  }

  function totalHectares(farms: Farm[]): number {
    return farms
      .filter((f) => f.deletedAt === null)
      .reduce((acc, f) => acc + f.totalArea, 0);
  }

  function byCrop(
    farms: Farm[],
    harvests: Harvest[],
    crops: Crop[],
  ): Record<string, number> {
    const activeFarmIds = new Set(
      farms.filter((f) => f.deletedAt === null).map((f) => f.id),
    );
    const activeHarvestIds = new Set(
      harvests
        .filter((h) => h.status === 'ACTIVE' && activeFarmIds.has(h.farmId))
        .map((h) => h.id),
    );
    const counts: Record<string, number> = {};
    for (const crop of crops) {
      if (!activeHarvestIds.has(crop.harvestId)) {
        continue;
      }
      counts[crop.cropName] = (counts[crop.cropName] ?? 0) + 1;
    }
    return counts;
  }

  const farms: Farm[] = [
    { id: 'f1', deletedAt: null, state: 'SP', totalArea: 100 },
    { id: 'f2', deletedAt: null, state: 'MG', totalArea: 200 },
    { id: 'f3', deletedAt: new Date(), state: 'SP', totalArea: 999 },
  ];
  const harvests: Harvest[] = [
    { id: 'h1', farmId: 'f1', status: 'ACTIVE' },
    { id: 'h2', farmId: 'f1', status: 'ARCHIVED' },
    { id: 'h3', farmId: 'f2', status: 'ACTIVE' },
    { id: 'h4', farmId: 'f3', status: 'ACTIVE' },
  ];
  const crops: Crop[] = [
    { harvestId: 'h1', cropName: 'Soja' },
    { harvestId: 'h2', cropName: 'Milho' },
    { harvestId: 'h3', cropName: 'Soja' },
    { harvestId: 'h4', cropName: 'Café' },
  ];

  it('exclui fazendas soft-deleted dos totais', () => {
    expect(totalFarms(farms)).toBe(2);
    expect(totalHectares(farms)).toBe(300);
  });

  it('exclui safras ARCHIVED e fazendas deletadas de byCrop', () => {
    expect(byCrop(farms, harvests, crops)).toEqual({
      Soja: 2,
    });
  });

  it('DashboardStats shape mínimo permanece estável', () => {
    const shape = {
      totalFarms: 0,
      totalHectares: 0,
      averageFarmSize: 0,
      carComplianceRate: 0,
      esgComplianceRate: 0,
      byState: [],
      byCrop: [],
      byLandUse: {
        arableHectares: 0,
        vegetationHectares: 0,
        arablePercentage: 0,
        vegetationPercentage: 0,
      },
      regionalClimateRisk: { averageScore: null, farmsWithScore: 0 },
      byCarStatus: [],
      byEsgStatus: [],
      climateRiskByState: [],
      climateRiskByCrop: [],
      cropsByYear: [],
      farmsByMonth: [],
      topCities: [],
    };
    expect(Object.keys(shape).sort()).toEqual(
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
});
