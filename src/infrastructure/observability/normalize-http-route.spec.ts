import {
  normalizeHttpMethod,
  normalizeHttpRoute,
  statusClassFromCode,
} from './normalize-http-route.js';

describe('normalizeHttpRoute', () => {
  it('usa template Nest/Express quando route.path existe', () => {
    const route = normalizeHttpRoute({
      baseUrl: '/api/v1/producers',
      route: { path: '/:id' },
      path: '/api/v1/producers/11111111-1111-4111-8111-111111111111',
      originalUrl: '/api/v1/producers/11111111-1111-4111-8111-111111111111',
    });
    expect(route).toBe('/api/v1/producers/:id');
  });

  it('faz scrub de UUID no fallback', () => {
    const route = normalizeHttpRoute({
      baseUrl: '',
      route: undefined,
      path: '/api/v1/producers/11111111-1111-4111-8111-111111111111',
      originalUrl: '/api/v1/producers/11111111-1111-4111-8111-111111111111',
    });
    expect(route).toBe('/api/v1/producers/:id');
  });

  it('faz scrub de dígitos longos (anti-PII de documento)', () => {
    const route = normalizeHttpRoute({
      baseUrl: '',
      route: undefined,
      path: '/api/v1/producers/search/52998224725',
      originalUrl: '/api/v1/producers/search/52998224725',
    });
    expect(route).toBe('/api/v1/producers/search/:id');
  });

  it('preserva rotas estáticas conhecidas', () => {
    expect(
      normalizeHttpRoute({
        baseUrl: '',
        route: undefined,
        path: '/api/v1/health/live',
        originalUrl: '/api/v1/health/live',
      }),
    ).toBe('/api/v1/health/live');
  });

  it('reconhece prefixo /api/v1/admin no fallback', () => {
    expect(
      normalizeHttpRoute({
        baseUrl: '',
        route: undefined,
        path: '/api/v1/admin/revalidate/producers/:id',
        originalUrl: '/api/v1/admin/revalidate/producers/:id',
      }),
    ).toBe('/api/v1/admin/revalidate/producers/:id');
  });

  it('retorna unmatched para path vazio', () => {
    expect(
      normalizeHttpRoute({
        baseUrl: '',
        route: undefined,
        path: '/',
        originalUrl: '/',
      }),
    ).toBe('unmatched');
  });
});

describe('normalizeHttpMethod', () => {
  it('allowlist de métodos HTTP', () => {
    expect(normalizeHttpMethod('get')).toBe('GET');
    expect(normalizeHttpMethod('POST')).toBe('POST');
    expect(normalizeHttpMethod('TRACE')).toBe('OTHER');
  });
});

describe('statusClassFromCode', () => {
  it('mapeia classes HTTP', () => {
    expect(statusClassFromCode(201)).toBe('2xx');
    expect(statusClassFromCode(301)).toBe('3xx');
    expect(statusClassFromCode(404)).toBe('4xx');
    expect(statusClassFromCode(503)).toBe('5xx');
    expect(statusClassFromCode(0)).toBe('other');
  });
});
