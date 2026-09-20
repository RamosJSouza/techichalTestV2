import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { NoopMetrics } from '../../testing/noop-metrics.js';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter(new NoopMetrics());

  function run(
    exception: unknown,
    req: {
      url: string;
      path?: string;
      id?: string;
      headers?: Record<string, string>;
    } = {
      url: '/api/v1/producers/search?document=52998224725',
      path: '/api/v1/producers/search',
      id: 'req-test-1',
    },
  ): {
    statusCode: number;
    body: Record<string, unknown>;
  } {
    const state = { body: {} as Record<string, unknown>, statusCode: 0 };
    const response = {
      status(code: number) {
        state.statusCode = code;
        return this;
      },
      json(payload: Record<string, unknown>) {
        state.body = payload;
        return this;
      },
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          url: req.url,
          path: req.path,
          id: req.id,
          headers: req.headers ?? {},
        }),
      }),
    } as ArgumentsHost;
    filter.catch(exception, host);
    return state;
  }

  it('não vaza mensagem interna em erros desconhecidos', () => {
    const result = run(new Error('secret db password leaked'));
    expect(result.statusCode).toBe(500);
    expect(result.body.message).toBe('Internal server error');
    expect(result.body.message).not.toContain('secret');
    expect(typeof result.body.errorId).toBe('string');
    expect(result.body.requestId).toBe('req-test-1');
    expect(result.body.code).toBe('INTERNAL_ERROR');
  });

  it('não vaza detalhe em HttpException 5xx', () => {
    const result = run(
      new HttpException(
        'connection refused to postgres',
        HttpStatus.BAD_GATEWAY,
      ),
    );
    expect(result.statusCode).toBe(502);
    expect(result.body.message).toBe('Internal server error');
    expect(result.body.requestId).toBe('req-test-1');
  });

  it('mantém mensagem de domínio e inclui requestId', () => {
    const result = run(new ConflictException('Já existe produtor'));
    expect(result.statusCode).toBe(409);
    expect(result.body.message).toBe('Já existe produtor');
    expect(result.body.requestId).toBe('req-test-1');
    expect(typeof result.body.errorId).toBe('string');
  });

  it('não inclui query string com documento no path', () => {
    const result = run(new ConflictException('Já existe produtor'));
    expect(result.body.path).toBe('/api/v1/producers/search');
    expect(String(result.body.path)).not.toContain('document');
    expect(String(result.body.path)).not.toMatch(/\d{11}/);
  });

  it('log 5xx inclui errorId/requestId e sem chave document', () => {
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    run(new Error('secret db password leaked'));
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      errorId: expect.any(String),
      requestId: 'req-test-1',
      path: '/api/v1/producers/search',
    });
    expect(String(payload.path)).not.toContain('document');
    expect(payload).not.toHaveProperty('document');
    expect(Object.keys(payload)).not.toContain('req');
    spy.mockRestore();
  });
});
