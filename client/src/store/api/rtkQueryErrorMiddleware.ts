import type { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import { isRejectedWithValue } from '@reduxjs/toolkit';
import { showToast } from '../slices/uiSlice';
import type { ApiErrorBody } from '../../shared/types/api';

type ValidationIssue = { path?: string; message?: string };

type ApiErrorPayload = ApiErrorBody & {
  code?: string;
  issues?: ValidationIssue[];
};

function extractMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Erro inesperado na API.';
  }
  const data = (payload as { data?: ApiErrorPayload | string }).data;
  if (typeof data === 'string') {
    return data;
  }
  if (data && typeof data === 'object') {
    if (
      data.code === 'VALIDATION_ERROR' &&
      Array.isArray(data.issues) &&
      data.issues.length > 0
    ) {
      return data.issues
        .map((issue) => {
          const path = issue.path?.trim();
          const message = issue.message?.trim() || 'inválido';
          return path ? `${path}: ${message}` : message;
        })
        .join('; ');
    }
    const msg = data.message;
    if (Array.isArray(msg)) {
      return msg.join('; ');
    }
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return 'Falha na requisição à API.';
}

export const rtkQueryErrorMiddleware: Middleware =
  (api: MiddlewareAPI) => (next) => (action) => {
    if (isRejectedWithValue(action)) {
      const type = String((action as { type?: string }).type ?? '');
      if (type.includes('executeMutation')) {
        api.dispatch(
          showToast({
            message: extractMessage(action.payload),
            variant: 'error',
          }),
        );
      }
    }
    return next(action);
  };
