import {
  createApi,
  type BaseQueryFn,
} from '@reduxjs/toolkit/query/react';
import { mockDashboardStats, mockProducers } from '../../shared/mocks/fixtures';
import type {
  CreateFarmInput,
  CreateProducerInput,
  DashboardFilters,
  DashboardStats,
  EsgComplianceResult,
  ProducerResponse,
  UpdateFarmInput,
  UpdateProducerInput,
} from '../../shared/types/api';
import {
  axiosBaseQuery,
  type AxiosBaseQueryArgs,
  type AxiosBaseQueryError,
} from './axiosBaseQuery';

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

const mockBaseQuery: BaseQueryFn<
  AxiosBaseQueryArgs,
  unknown,
  AxiosBaseQueryError
> = async ({ url, method = 'GET' }) => {
  await new Promise((r) => setTimeout(r, 50));
  if (url === '/dashboard/stats' || url.startsWith('/dashboard/stats')) {
    return { data: mockDashboardStats };
  }
  if (url === '/producers' && method === 'GET') {
    return { data: mockProducers };
  }
  if (url.startsWith('/producers/') && method === 'GET' && !url.includes('search')) {
    const id = url.split('/')[2];
    const found = mockProducers.find((p) => p.id === id) ?? mockProducers[0];
    return { data: found };
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

const dynamicBaseQuery: BaseQueryFn<
  AxiosBaseQueryArgs,
  unknown,
  AxiosBaseQueryError
> = async (args, api, extra) => {
  if (useMocks) {
    return mockBaseQuery(args, api, extra);
  }
  return axiosBaseQuery()(args, api, extra);
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['Producers', 'Dashboard'],
  endpoints: (builder) => ({
    getDashboardStats: builder.query<
      DashboardStats,
      DashboardFilters | void
    >({
      query: (filters) => ({
        url: '/dashboard/stats',
        params: filters ?? undefined,
      }),
      providesTags: ['Dashboard'],
    }),
    listProducers: builder.query<ProducerResponse[], void>({
      query: () => ({ url: '/producers' }),
      providesTags: ['Producers'],
    }),
    getProducer: builder.query<ProducerResponse, string>({
      query: (id) => ({ url: `/producers/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Producers', id }],
    }),
    searchProducer: builder.query<ProducerResponse, string>({
      query: (document) => ({
        url: '/producers/search',
        params: { document },
      }),
    }),
    getProducerEsg: builder.query<EsgComplianceResult, string>({
      query: (id) => ({ url: `/producers/${id}/esg-compliance` }),
      providesTags: (_r, _e, id) => [{ type: 'Producers', id }],
    }),
    createProducer: builder.mutation<ProducerResponse, CreateProducerInput>({
      query: (body) => ({ url: '/producers', method: 'POST', data: body }),
      invalidatesTags: ['Producers', 'Dashboard'],
    }),
    updateProducer: builder.mutation<
      ProducerResponse,
      { id: string; body: UpdateProducerInput }
    >({
      query: ({ id, body }) => ({
        url: `/producers/${id}`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: ['Producers'],
    }),
    deleteProducer: builder.mutation<void, string>({
      query: (id) => ({ url: `/producers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Producers', 'Dashboard'],
    }),
    createFarm: builder.mutation<unknown, CreateFarmInput>({
      query: (body) => ({ url: '/farms', method: 'POST', data: body }),
      invalidatesTags: ['Producers', 'Dashboard'],
    }),
    updateFarm: builder.mutation<
      unknown,
      { id: string; body: UpdateFarmInput }
    >({
      query: ({ id, body }) => ({
        url: `/farms/${id}`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: ['Producers', 'Dashboard'],
    }),
    deleteFarm: builder.mutation<void, string>({
      query: (id) => ({ url: `/farms/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Producers', 'Dashboard'],
    }),
    validateFarmCar: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/farms/${id}/car/validate`,
        method: 'POST',
      }),
      invalidatesTags: ['Producers'],
    }),
    listCities: builder.query<string[], string>({
      query: (uf) => ({ url: `/ibge/states/${uf}/cities` }),
      transformResponse: (response: { cities: string[] }): string[] =>
        response.cities,
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useListProducersQuery,
  useGetProducerQuery,
  useLazySearchProducerQuery,
  useGetProducerEsgQuery,
  useCreateProducerMutation,
  useUpdateProducerMutation,
  useDeleteProducerMutation,
  useCreateFarmMutation,
  useUpdateFarmMutation,
  useDeleteFarmMutation,
  useValidateFarmCarMutation,
  useLazyListCitiesQuery,
} = apiSlice;
