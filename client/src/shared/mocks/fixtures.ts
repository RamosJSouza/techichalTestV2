import type { DashboardStats, ProducerResponse } from '../types/api';

export const mockDashboardStats: DashboardStats = {
  totalFarms: 12,
  totalHectares: 15420.5,
  averageFarmSize: 1285.04,
  carComplianceRate: 58.33,
  esgComplianceRate: 83.33,
  byState: [
    { state: 'SP', count: 5, hectares: 6200, percentage: 40.2 },
    { state: 'MT', count: 4, hectares: 5800, percentage: 37.6 },
    { state: 'PR', count: 3, hectares: 3420.5, percentage: 22.2 },
  ],
  byCrop: [
    { crop: 'Soja', count: 8, percentage: 50 },
    { crop: 'Milho', count: 5, percentage: 31.25 },
    { crop: 'Café', count: 3, percentage: 18.75 },
  ],
  byLandUse: {
    arableHectares: 9800,
    vegetationHectares: 4200,
    arablePercentage: 70,
    vegetationPercentage: 30,
  },
  regionalClimateRisk: {
    averageScore: 42.5,
    farmsWithScore: 10,
  },
  byCarStatus: [
    { status: 'ACTIVE', count: 7, percentage: 58.33 },
    { status: 'PENDING', count: 3, percentage: 25 },
    { status: 'Sem CAR', count: 2, percentage: 16.67 },
  ],
  byEsgStatus: [
    { status: 'APPROVED', count: 10, percentage: 83.33 },
    { status: 'WARNING', count: 2, percentage: 16.67 },
  ],
  climateRiskByState: [
    { state: 'SP', averageScore: 38.2, farmsWithScore: 5 },
    { state: 'MT', averageScore: 52.1, farmsWithScore: 3 },
    { state: 'PR', averageScore: 41.0, farmsWithScore: 2 },
  ],
  climateRiskByCrop: [
    { crop: 'Soja', averageScore: 40.5, farmsWithScore: 8 },
    { crop: 'Milho', averageScore: 45.2, farmsWithScore: 5 },
    { crop: 'Café', averageScore: 35.0, farmsWithScore: 3 },
  ],
  cropsByYear: [
    { year: '2024/2025', crop: 'Soja', count: 4 },
    { year: '2024/2025', crop: 'Milho', count: 2 },
    { year: '2025/2026', crop: 'Soja', count: 4 },
    { year: '2025/2026', crop: 'Milho', count: 3 },
    { year: '2025/2026', crop: 'Café', count: 3 },
  ],
  farmsByMonth: [
    { month: '2025-01', farms: 2, hectares: 2100 },
    { month: '2025-02', farms: 3, hectares: 3800 },
    { month: '2025-03', farms: 4, hectares: 5200 },
    { month: '2025-04', farms: 3, hectares: 4320.5 },
  ],
  topCities: [
    { city: 'Ribeirão Preto', state: 'SP', farms: 3, hectares: 3200 },
    { city: 'Sorriso', state: 'MT', farms: 2, hectares: 4100 },
    { city: 'Londrina', state: 'PR', farms: 2, hectares: 2100 },
    { city: 'Campinas', state: 'SP', farms: 2, hectares: 1800 },
  ],
};

export const mockProducers: ProducerResponse[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'João Silva',
    document: '***.982.247-**',
    esgStatus: 'APPROVED',
    esgCheckedAt: null,
    documentValidationStatus: 'VALIDATED',
    documentValidationPendingAt: null,
    documentValidationPendingReason: null,
    farms: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        producerId: '11111111-1111-4111-8111-111111111111',
        name: 'Santa Maria',
        city: 'Ribeirão Preto',
        state: 'SP',
        totalArea: 1000,
        arableArea: 600,
        vegetationArea: 350,
        carNumber: null,
        carStatus: null,
        climateRiskScore: 38.2,
        territorialValidationStatus: 'VALIDATED',
        territorialValidationPendingAt: null,
        territorialValidationPendingReason: null,
        harvests: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            year: '2025/2026',
            status: 'ACTIVE',
            crops: ['Soja', 'Milho'],
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
