import type { Request } from 'express';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LONG_DIGITS_RE = /^\d{6,}$/;
const LONG_HEX_RE = /^[0-9a-f]{16,}$/i;
const PARAM_RE = /^:[A-Za-z_][A-Za-z0-9_]*$/;

/** Rotas conhecidas (templates) — evita unmatched desnecessário. */
const KNOWN_ROUTE_PREFIXES = [
  '/api/v1/producers',
  '/api/v1/farms',
  '/api/v1/dashboard',
  '/api/v1/ibge',
  '/api/v1/admin',
  '/api/v1/health',
  '/api/v1/metrics',
  '/api/v1/observability',
] as const;

const ALLOWED_HTTP_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

type HttpStatusClass = '2xx' | '3xx' | '4xx' | '5xx' | 'other';

export function normalizeHttpMethod(method: string): string {
  const upper = method.toUpperCase();
  return ALLOWED_HTTP_METHODS.has(upper) ? upper : 'OTHER';
}

export function statusClassFromCode(statusCode: number): HttpStatusClass {
  if (statusCode >= 200 && statusCode < 300) {
    return '2xx';
  }
  if (statusCode >= 300 && statusCode < 400) {
    return '3xx';
  }
  if (statusCode >= 400 && statusCode < 500) {
    return '4xx';
  }
  if (statusCode >= 500 && statusCode < 600) {
    return '5xx';
  }
  return 'other';
}

function joinPath(base: string, routePath: string): string {
  const left = base.replace(/\/$/, '');
  const right = routePath.startsWith('/') ? routePath : `/${routePath}`;
  if (!left) {
    return right;
  }
  return `${left}${right}`;
}

function scrubSegment(segment: string): string {
  if (PARAM_RE.test(segment)) {
    return segment;
  }
  if (UUID_RE.test(segment) || LONG_DIGITS_RE.test(segment) || LONG_HEX_RE.test(segment)) {
    return ':id';
  }
  if (/^[A-Za-z]{2}$/.test(segment) && segment === segment.toUpperCase()) {
    return ':uf';
  }
  return segment;
}

/**
 * Normaliza path para label Prometheus de baixa cardinalidade.
 * Preferência: template Express (`req.route.path` + baseUrl).
 * Fallback: scrub de UUID/dígitos; unmatched se ainda parecer dinâmico demais.
 */
export function normalizeHttpRoute(req: Pick<Request, 'baseUrl' | 'route' | 'path' | 'originalUrl'>): string {
  const baseUrl = typeof req.baseUrl === 'string' ? req.baseUrl : '';
  const routePath =
    req.route && typeof (req.route as { path?: unknown }).path === 'string'
      ? (req.route as { path: string }).path
      : null;

  if (routePath !== null) {
    const template = joinPath(baseUrl, routePath);
    return template.startsWith('/') ? template : `/${template}`;
  }

  const rawPath = (req.path || req.originalUrl || '').split('?')[0] ?? '';
  if (!rawPath || rawPath === '/') {
    return 'unmatched';
  }

  const segments = rawPath.split('/').filter((s) => s.length > 0);
  const scrubbed = segments.map(scrubSegment);
  const normalized = `/${scrubbed.join('/')}`;

  const looksSafe =
    KNOWN_ROUTE_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
    scrubbed.every(
      (s) =>
        PARAM_RE.test(s) ||
        s === ':id' ||
        s === ':uf' ||
        /^[a-z][a-z0-9-]*$/i.test(s),
    );

  if (!looksSafe) {
    return 'unmatched';
  }

  return normalized;
}
