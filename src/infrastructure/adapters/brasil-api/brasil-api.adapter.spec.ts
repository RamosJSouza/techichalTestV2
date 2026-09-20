import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { BrasilApiAdapter } from './brasil-api.adapter.js';
import { MetricsService } from '../../observability/metrics.service.js';

function okResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

function axiosError(status?: number, message = 'error'): AxiosError {
  const error = new AxiosError(message);
  if (status !== undefined) {
    error.response = {
      status,
      data: {},
      headers: {},
      statusText: String(status),
      config: { headers: new AxiosHeaders() },
    };
  }
  error.code = status === undefined ? 'ECONNABORTED' : undefined;
  return error;
}

describe('BrasilApiAdapter', () => {
  const config = {
    get: () => 'https://brasilapi.com.br/api',
  } as unknown as ConfigService;

  const metrics = new MetricsService();

  it('retorna CNPJ ativo como VALIDATED', async () => {
    const http = {
      get: () =>
        of(
          okResponse({
            cnpj: '11222333000181',
            razao_social: 'Empresa Teste',
            descricao_situacao_cadastral: 'ATIVA',
          }),
        ),
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config, metrics);
    const result = await adapter.getCnpjData('11222333000181');
    expect(result.outcome).toBe('VALIDATED');
    if (result.outcome === 'VALIDATED') {
      expect(result.data.isActive).toBe(true);
      expect(result.data.razaoSocial).toBe('Empresa Teste');
    }
  });

  it('valida cidade no estado com normalização', async () => {
    const http = {
      get: () =>
        of(
          okResponse([{ nome: 'Ribeirão Preto' }, { nome: 'Campinas' }]),
        ),
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config, metrics);
    const result = await adapter.isCityInState('ribeirao preto', 'SP');
    expect(result).toEqual({ outcome: 'VALIDATED', data: true });
  });

  it('timeout / rede → PENDING_EXTERNAL_VALIDATION', async () => {
    const http = {
      get: () => throwError(() => axiosError(undefined, 'timeout')),
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config, metrics);
    await expect(adapter.getCnpjData('11222333000181')).resolves.toEqual({
      outcome: 'PENDING_EXTERNAL_VALIDATION',
    });
  });

  it('404 CNPJ → REJECTED', async () => {
    const http = {
      get: () => throwError(() => axiosError(404, 'Not Found')),
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config, metrics);
    const result = await adapter.getCnpjData('11222333000181');
    expect(result.outcome).toBe('REJECTED');
    if (result.outcome === 'REJECTED') {
      expect(result.reason).toMatch(/não encontrado/i);
    }
  });

  it('circuit open → PENDING (sem positivo silencioso)', async () => {
    let calls = 0;
    const http = {
      get: () => {
        calls += 1;
        return throwError(() => axiosError(503, 'Service Unavailable'));
      },
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config, metrics);

    for (let i = 0; i < 4; i += 1) {
      await adapter.getCnpjData('11222333000181');
    }

    const beforeFallbackCalls = calls;
    const result = await adapter.getCnpjData('11222333000181');
    expect(result.outcome).toBe('PENDING_EXTERNAL_VALIDATION');
    expect(adapter.getCircuitStats().cnpjOpen).toBe(true);
    // Com circuit aberto o fallback evita novas tentativas HTTP (ou reduz).
    expect(calls).toBeLessThanOrEqual(beforeFallbackCalls + 1);
  });

  it('recovery após reset → SUCCESS', async () => {
    let shouldFail = true;
    const http = {
      get: () => {
        if (shouldFail) {
          return throwError(() => axiosError(503, 'Service Unavailable'));
        }
        return of(
          okResponse({
            cnpj: '11222333000181',
            razao_social: 'Recuperada',
            descricao_situacao_cadastral: 'ATIVA',
          }),
        );
      },
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config, metrics);
    for (let i = 0; i < 4; i += 1) {
      await adapter.getCnpjData('11222333000181');
    }
    expect(adapter.getCircuitStats().cnpjOpen).toBe(true);

    adapter.resetCircuitsForTests();
    shouldFail = false;

    const result = await adapter.getCnpjData('11222333000181');
    expect(result.outcome).toBe('VALIDATED');
    expect(adapter.getCircuitStats().cnpjOpen).toBe(false);
  });

  it('cache hit UF/CNPJ evita segunda chamada HTTP', async () => {
    let cnpjCalls = 0;
    let cityCalls = 0;
    const http = {
      get: (url: string) => {
        if (url.includes('/cnpj/')) {
          cnpjCalls += 1;
          return of(
            okResponse({
              cnpj: '11222333000181',
              razao_social: 'Cached',
              descricao_situacao_cadastral: 'ATIVA',
            }),
          );
        }
        cityCalls += 1;
        return of(okResponse([{ nome: 'Campinas' }]));
      },
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config, metrics);

    await adapter.getCnpjData('11222333000181');
    await adapter.getCnpjData('11222333000181');
    expect(cnpjCalls).toBe(1);

    await adapter.isCityInState('Campinas', 'SP');
    await adapter.isCityInState('Campinas', 'SP');
    expect(cityCalls).toBe(1);
  });
});
