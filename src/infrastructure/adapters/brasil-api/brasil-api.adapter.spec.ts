import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { BrasilApiAdapter } from './brasil-api.adapter.js';

describe('BrasilApiAdapter', () => {
  const config = {
    get: () => 'https://brasilapi.com.br/api',
  } as unknown as ConfigService;

  it('retorna CNPJ ativo', async () => {
    const http = {
      get: () =>
        of({
          data: {
            cnpj: '11222333000181',
            razao_social: 'Empresa Teste',
            descricao_situacao_cadastral: 'ATIVA',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: new AxiosHeaders() },
        } satisfies AxiosResponse),
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config);
    const result = await adapter.getCnpjData('11222333000181');
    expect(result?.isActive).toBe(true);
    expect(result?.razaoSocial).toBe('Empresa Teste');
  });

  it('valida cidade no estado com normalização', async () => {
    const http = {
      get: () =>
        of({
          data: [{ nome: 'Ribeirão Preto' }, { nome: 'Campinas' }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: new AxiosHeaders() },
        } satisfies AxiosResponse),
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config);
    await expect(
      adapter.isCityInState('ribeirao preto', 'SP'),
    ).resolves.toBe(true);
  });

  it('degrada graciosamente em erro de rede', async () => {
    const http = {
      get: () => throwError(() => new AxiosError('timeout')),
    } as unknown as HttpService;

    const adapter = new BrasilApiAdapter(http, config);
    await expect(adapter.getCnpjData('11222333000181')).resolves.toBeNull();
  });
});
