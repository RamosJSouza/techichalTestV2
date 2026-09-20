import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  function run(exception: unknown): {
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
        getRequest: () => ({ url: '/api/v1/test' }),
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
  });

  it('mantém mensagem de domínio', () => {
    const result = run(new ConflictException('Já existe produtor'));
    expect(result.statusCode).toBe(409);
    expect(result.body.message).toBe('Já existe produtor');
  });
});
