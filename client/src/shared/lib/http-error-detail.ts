/**
 * Extrai detalhe HTTP de erros RTK Query / AxiosBaseQuery para ErrorRetryPanel.
 */
export function httpStatusDetail(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return `HTTP ${String(error.status)}`;
  }
  return undefined;
}
