import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { mockDashboardStats, mockProducers } from '../../shared/mocks/fixtures';
import { producerResponseToListItem } from '../../shared/types/api';
import type {
  AxiosBaseQueryArgs,
  AxiosBaseQueryError,
} from './axiosBaseQuery';

export const mockBaseQuery: BaseQueryFn<
  AxiosBaseQueryArgs,
  unknown,
  AxiosBaseQueryError
> = async ({ url, method = 'GET' }) => {
  await new Promise((r) => setTimeout(r, 50));
  if (
    url === '/dashboard/summary' ||
    url.startsWith('/dashboard/summary')
  ) {
    const {
      climateRiskByState: _s,
      climateRiskByCrop: _c,
      cropsByYear: _y,
      farmsByMonth: _m,
      topCities: _t,
      ...summary
    } = mockDashboardStats;
    return { data: summary };
  }
  if (
    url === '/dashboard/analytics' ||
    url.startsWith('/dashboard/analytics')
  ) {
    const {
      climateRiskByState,
      climateRiskByCrop,
      cropsByYear,
      farmsByMonth,
      topCities,
    } = mockDashboardStats;
    return {
      data: {
        climateRiskByState,
        climateRiskByCrop,
        cropsByYear,
        farmsByMonth,
        topCities,
      },
    };
  }
  if (url === '/producers' && method === 'GET') {
    return {
      data: {
        items: mockProducers.map(producerResponseToListItem),
        total: mockProducers.length,
        page: 1,
        pageSize: 20,
      },
    };
  }
  if (
    url.startsWith('/producers/') &&
    method === 'GET' &&
    !url.includes('search')
  ) {
    const id = url.split('/')[2];
    const found = mockProducers.find((p) => p.id === id) ?? mockProducers[0];
    return { data: found };
  }
  if (url === '/features' && method === 'GET') {
    return { data: { esgCarEnabled: false } };
  }
  if (url.startsWith('/ibge/states/') && method === 'GET') {
    return {
      data: {
        cities: [
          'Ribeirão Preto',
          'São Paulo',
          'Campinas',
          'Santos',
          'Piracicaba',
        ],
      },
    };
  }
  return { data: mockProducers[0] };
};
