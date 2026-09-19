import type { DashboardStats, ProducerResponse } from '../types/api';

export const mockDashboardStats: DashboardStats = {
  totalFarms: 12,
  totalHectares: 15420.5,
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
};

export const mockProducers: ProducerResponse[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'João Silva',
    document: '***.982.247-**',
    esgStatus: 'APPROVED',
    esgCheckedAt: null,
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
