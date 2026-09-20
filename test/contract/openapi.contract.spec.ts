/**
 * Contrato OpenAPI: paths críticos e coerência mínima do documento commitado.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type OpenApiDoc = {
  openapi: string;
  paths?: Record<string, Record<string, unknown>>;
  components?: { schemas?: Record<string, unknown> };
};

function loadDoc(): OpenApiDoc {
  const raw = readFileSync(
    join(process.cwd(), 'docs', 'openapi.json'),
    'utf8',
  );
  return JSON.parse(raw) as OpenApiDoc;
}

describe('OpenAPI contract', () => {
  const doc = loadDoc();

  it('é OpenAPI 3.x', () => {
    expect(doc.openapi).toMatch(/^3\./);
  });

  it('expõe paths críticos sob /api/v1', () => {
    const paths = Object.keys(doc.paths ?? {});
    const required = [
      '/api/v1/producers',
      '/api/v1/farms',
      '/api/v1/dashboard/summary',
      '/api/v1/dashboard/analytics',
      '/api/v1/health/live',
      '/api/v1/metrics',
    ];
    for (const path of required) {
      expect(paths).toContain(path);
    }
  });

  it('producers listagem é GET e criação é POST', () => {
    const producers = doc.paths?.['/api/v1/producers'];
    expect(producers).toBeDefined();
    expect(producers?.get).toBeDefined();
    expect(producers?.post).toBeDefined();
  });

  it('dashboard summary é GET', () => {
    const summary = doc.paths?.['/api/v1/dashboard/summary'];
    expect(summary?.get).toBeDefined();
  });

  it('declara schemas de componentes', () => {
    const schemas = doc.components?.schemas ?? {};
    expect(Object.keys(schemas).length).toBeGreaterThan(0);
  });
});
