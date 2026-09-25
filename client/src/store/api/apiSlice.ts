import {
  createApi,
  type BaseQueryFn,
} from '@reduxjs/toolkit/query/react';
import type {
  CreateFarmInput,
  CreateProducerInput,
  DashboardAnalytics,
  DashboardFilters,
  DashboardSummary,
  EsgComplianceResult,
  ProducerListItem,
  ProducerResponse,
  UpdateFarmInput,
  UpdateProducerInput,
} from '../../shared/types/api';
import {
  axiosBaseQuery,
  type AxiosBaseQueryArgs,
  type AxiosBaseQueryError,
} from './axiosBaseQuery';
import { isViteMocksEnabled } from './mocks-gate';

const USE_MOCKS = isViteMocksEnabled(import.meta.env.VITE_USE_MOCKS);

const dynamicBaseQuery: BaseQueryFn<
  AxiosBaseQueryArgs,
  unknown,
  AxiosBaseQueryError
> = async (args, api, extra) => {
  if (USE_MOCKS) {
    const { mockBaseQuery } = await import('./mockBaseQuery');
    return mockBaseQuery(args, api, extra);
  }
  return axiosBaseQuery()(args, api, extra);
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['Producers', 'Dashboard'],
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<
      DashboardSummary,
      DashboardFilters | void
    >({
      query: (filters) => ({
        url: '/dashboard/summary',
        params: filters ?? undefined,
      }),
      providesTags: ['Dashboard'],
    }),
    getDashboardAnalytics: builder.query<
      DashboardAnalytics,
      DashboardFilters | void
    >({
      query: (filters) => ({
        url: '/dashboard/analytics',
        params: filters ?? undefined,
      }),
      providesTags: ['Dashboard'],
    }),
    listProducers: builder.query<
      {
        items: ProducerListItem[];
        total: number;
        page: number;
        pageSize: number;
        nextCursor?: string | null;
      },
      { page?: number; pageSize?: number; name?: string } | void
    >({
      query: (params) => ({
        url: '/producers',
        params: {
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 20,
          ...(params?.name ? { name: params.name } : {}),
        },
      }),
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
    getFeatures: builder.query<{ esgCarEnabled: boolean }, void>({
      query: () => ({ url: '/features' }),
    }),
    listCities: builder.query<string[], string>({
      query: (uf) => ({ url: `/ibge/states/${uf}/cities` }),
      transformResponse: (response: { cities: string[] }): string[] =>
        response.cities,
    }),
  }),
});

export const {
  useGetDashboardSummaryQuery,
  useGetDashboardAnalyticsQuery,
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
  useGetFeaturesQuery,
  useLazyListCitiesQuery,
} = apiSlice;
