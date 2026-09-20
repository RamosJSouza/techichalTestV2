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

  it('declara papéis summary / analytics / stats', () => {
    const summaryDesc = (
      doc.paths?.['/api/v1/dashboard/summary']?.get as {
        responses?: { '200'?: { description?: string } };
      }
    )?.responses?.['200']?.description;
    const analyticsDesc = (
      doc.paths?.['/api/v1/dashboard/analytics']?.get as {
        responses?: { '200'?: { description?: string } };
      }
    )?.responses?.['200']?.description;
    const statsDesc = (
      doc.paths?.['/api/v1/dashboard/stats']?.get as {
        responses?: { '200'?: { description?: string } };
      }
    )?.responses?.['200']?.description;

    expect(summaryDesc?.toLowerCase()).toContain('first paint');
    expect(analyticsDesc?.toLowerCase()).toMatch(/secondary|séries/);
    expect(statsDesc?.toLowerCase()).toMatch(/residual|legado|completo/);
  });

  it('listagem de produtores tipa ProducerListPageResponseDto sem farms', () => {
    const listGet = doc.paths?.['/api/v1/producers']?.get as {
      responses?: {
        '200'?: {
          content?: {
            'application/json'?: { schema?: { $ref?: string } };
          };
        };
      };
    };
    const ref =
      listGet?.responses?.['200']?.content?.['application/json']?.schema?.$ref;
    expect(ref).toMatch(/ProducerListPageResponseDto$/);

    const schemas = doc.components?.schemas ?? {};
    const page = schemas.ProducerListPageResponseDto as {
      properties?: { items?: { items?: { $ref?: string } } };
    };
    const itemRef = page?.properties?.items?.items?.$ref;
    expect(itemRef).toMatch(/ProducerListItemResponseDto$/);

    const item = schemas.ProducerListItemResponseDto as {
      properties?: Record<string, unknown>;
      required?: string[];
    };
    expect(item?.properties).toBeDefined();
    expect(item.properties).toHaveProperty('farmsCount');
    expect(item.properties).toHaveProperty('farmStates');
    expect(item.properties).toHaveProperty('totalAreaHa');
    expect(item.properties).not.toHaveProperty('farms');

    const detailGet = doc.paths?.['/api/v1/producers/{id}']?.get as {
      responses?: {
        '200'?: {
          content?: {
            'application/json'?: { schema?: { $ref?: string } };
          };
        };
      };
    };
    const detailRef =
      detailGet?.responses?.['200']?.content?.['application/json']?.schema
        ?.$ref;
    expect(detailRef).toMatch(/ProducerDetailResponseDto$/);

    const detail = schemas.ProducerDetailResponseDto as {
      properties?: Record<string, unknown>;
    };
    expect(detail?.properties).toHaveProperty('farms');
  });

  it('declara schemas de componentes', () => {
    const schemas = doc.components?.schemas ?? {};
    expect(Object.keys(schemas).length).toBeGreaterThan(0);
  });

  it('expõe admin revalidate e enums de validação externa', () => {
    const paths = Object.keys(doc.paths ?? {});
    expect(paths).toContain('/api/v1/admin/revalidate/producers/{id}');
    expect(paths).toContain('/api/v1/admin/revalidate/farms/{id}');

    const item = doc.components?.schemas?.ProducerListItemResponseDto as {
      properties?: {
        documentValidationStatus?: { enum?: string[] };
        documentValidationPendingReason?: unknown;
      };
    };
    expect(item?.properties?.documentValidationPendingReason).toBeDefined();
    expect(item?.properties?.documentValidationStatus?.enum).toEqual(
      expect.arrayContaining([
        'VALIDATED',
        'PENDING_EXTERNAL_VALIDATION',
        'REJECTED',
      ]),
    );
  });
});
