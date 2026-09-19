import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiErrorBody } from '../../shared/types/api';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

export type AxiosBaseQueryArgs = {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: unknown;
  params?: unknown;
};

export type AxiosBaseQueryError = {
  status?: number;
  data?: ApiErrorBody | string;
};

export const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> =>
  async ({ url, method = 'GET', data, params }) => {
    try {
      const result = await api({ url, method, data, params });
      return { data: result.data };
    } catch (raw) {
      const error = raw as AxiosError<ApiErrorBody>;
      return {
        error: {
          status: error.response?.status,
          data: error.response?.data ?? error.message,
        },
      };
    }
  };
