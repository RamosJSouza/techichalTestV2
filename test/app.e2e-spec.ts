import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import request from 'supertest';
import { App } from 'supertest/types';
import { BRAZIL_DATA_SERVICE } from '../src/application/services/brazil-data.service.interface.js';
import type { BrazilDataServiceInterface } from '../src/application/services/brazil-data.service.interface.js';
import { GlobalExceptionFilter } from '../src/presentation/filters/global-exception.filter.js';
import { ZodValidationPipe } from '../src/presentation/pipes/zod-validation.pipe.js';
import { E2eAppModule } from './e2e-app.module.js';

loadEnv();

const databaseUrl = process.env.DATABASE_URL;
const isCi = process.env.CI === 'true' || process.env.CI === '1';

if (isCi && !databaseUrl) {
  throw new Error('DATABASE_URL is required for e2e in CI');
}

const offlineBrazil: BrazilDataServiceInterface = {
  getCnpjData: async () => ({
    outcome: 'PENDING_EXTERNAL_VALIDATION',
    reason: 'timeout_or_network',
  }),
  isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
  listCitiesByState: async () => ({
    outcome: 'VALIDATED',
    data: ['Ribeirão Preto', 'Campinas'],
  }),
};

(databaseUrl ? describe : describe.skip)('Brain Agriculture API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.ADMIN_API_TOKEN =
      process.env.ADMIN_API_TOKEN ?? 'e2e-admin-token-min-8';
    process.env.REVALIDATE_PENDING_ENABLED = '0';

    const client = postgres(databaseUrl!, { max: 1 });
    try {
      await migrate(drizzle(client), {
        migrationsFolder: join(process.cwd(), 'drizzle'),
      });
      await client`
        TRUNCATE TABLE farm_crops, harvests, farms, producers, external_validation_audit RESTART IDENTITY CASCADE
      `;
    } finally {
      await client.end({ timeout: 5 });
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [E2eAppModule],
    })
      .overrideProvider(BRAZIL_DATA_SERVICE)
      .useValue(offlineBrazil)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/health/live', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/v1/health/ready', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('up');
  });

  it('rejeita payload com campo extra (Zod strict)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send({
        name: 'Teste',
        document: '529.982.247-25',
        extra: true,
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('CRUD produtor com documento mascarado, listagem paginada e soft-delete', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send({
        name: 'Fernando Ramos',
        document: '529.982.247-25',
        farms: [
          {
            name: 'Fazenda Santa Maria',
            city: 'Ribeirão Preto',
            state: 'SP',
            totalArea: 1000,
            arableArea: 600,
            vegetationArea: 350,
            harvests: [{ year: '2025/2026', crops: ['Soja', 'Milho'] }],
          },
        ],
      });

    expect([201, 200]).toContain(create.status);
    expect(create.body.document).toBe('***.982.247-**');
    expect(create.body.document).not.toContain('529');

    const id = create.body.id as string;

    const list = await request(app.getHttpServer())
      .get('/api/v1/producers')
      .query({ page: 1, pageSize: 10 })
      .expect(200);

    expect(Array.isArray(list.body.items)).toBe(true);
    expect(typeof list.body.total).toBe('number');
    expect(list.body.page).toBe(1);
    expect(list.body.pageSize).toBe(10);
    const listed = list.body.items.find(
      (item: { id: string }) => item.id === id,
    );
    expect(listed).toBeDefined();
    expect(listed).toHaveProperty('farmsCount');
    expect(listed).toHaveProperty('totalAreaHa');
    expect(listed).toHaveProperty('farmStates');
    expect(listed).not.toHaveProperty('farms');

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/producers/${id}`)
      .expect(200);
    expect(Array.isArray(detail.body.farms)).toBe(true);
    if (detail.body.farms.length > 0) {
      expect(Array.isArray(detail.body.farms[0].harvests)).toBe(true);
    }

    await request(app.getHttpServer())
      .delete(`/api/v1/producers/${id}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/producers/${id}`)
      .expect(404);

    const recreate = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send({
        name: 'Fernando Ramos Reonboard',
        document: '529.982.247-25',
      });
    expect([201, 200]).toContain(recreate.status);
    expect(recreate.body.id).not.toBe(id);
  });

  it('retorna 409 para documento duplicado', async () => {
    const payload = {
      name: 'Duplicado',
      document: '390.533.447-05',
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send(payload);
    expect([200, 201]).toContain(first.status);

    const second = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send(payload)
      .expect(409);
    expect(second.body.code).toBeDefined();
  });

  it('corrida concorrente no mesmo CPF → um 201 e um 409 (23505)', async () => {
    const payload = {
      name: 'Corrida Unique',
      document: '100.000.002-80',
    };
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/producers').send(payload),
      request(app.getHttpServer()).post('/api/v1/producers').send(payload),
    ]);
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);

    const list = await request(app.getHttpServer())
      .get('/api/v1/producers')
      .query({ page: 1, pageSize: 100 })
      .expect(200);
    const matches = (list.body.items as Array<{ document: string }>).filter(
      (item) =>
        typeof item.document === 'string' &&
        item.document.includes('000.002'),
    );
    expect(matches).toHaveLength(1);
  });

  it('soft-deleted não aparece na listagem', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send({
        name: 'Soft List',
        document: '034.729.256-98',
      });
    expect([200, 201]).toContain(created.status);
    const id = created.body.id as string;

    await request(app.getHttpServer())
      .delete(`/api/v1/producers/${id}`)
      .expect(204);

    const list = await request(app.getHttpServer())
      .get('/api/v1/producers')
      .query({ page: 1, pageSize: 100 })
      .expect(200);
    const ids = (list.body.items as Array<{ id: string }>).map((i) => i.id);
    expect(ids).not.toContain(id);
  });

  it('rejeita área de fazenda inválida', async () => {
    const producer = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send({
        name: 'Produtor Área',
        document: '111.444.777-35',
      });

    expect([200, 201]).toContain(producer.status);

    const response = await request(app.getHttpServer())
      .post('/api/v1/farms')
      .send({
        producerId: producer.body.id,
        name: 'Inválida',
        city: 'Ribeirão Preto',
        state: 'SP',
        totalArea: 100,
        arableArea: 80,
        vegetationArea: 30,
      })
      .expect(400);

    expect(response.body.code).toBe('INVALID_FARM_AREA');
  });

  it('retorna stats do dashboard', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard/stats')
      .expect(200);

    expect(response.body).toHaveProperty('totalFarms');
    expect(response.body).toHaveProperty('totalHectares');
    expect(response.body).toHaveProperty('byState');
    expect(response.body).toHaveProperty('byCrop');
    expect(response.body).toHaveProperty('byLandUse');
  });

  it('cria produtor com BrasilAPI offline (degradação → PENDING)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send({
        name: 'Offline BrasilAPI',
        document: '11.222.333/0001-81',
      });
    expect([200, 201]).toContain(response.status);
    expect(response.body.documentValidationStatus).toBe(
      'PENDING_EXTERNAL_VALIDATION',
    );
    expect(response.body.documentValidationPendingReason).toBeTruthy();
  });

  it('admin revalidate sem token → 401', async () => {
    await request(app.getHttpServer())
      .post(
        '/api/v1/admin/revalidate/producers/00000000-0000-4000-8000-000000000001',
      )
      .expect(401);
  });

  it('admin revalidate com token reprocessa PENDING', async () => {
    const token = process.env.ADMIN_API_TOKEN;
    if (!token) {
      // Sem token no ambiente, o guard sempre 401 — coberto acima.
      return;
    }
    const created = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send({
        name: 'Revalidate Target',
        document: '04.252.011/0001-10',
      });
    expect([200, 201]).toContain(created.status);
    expect(created.body.documentValidationStatus).toBe(
      'PENDING_EXTERNAL_VALIDATION',
    );

    const revalidated = await request(app.getHttpServer())
      .post(`/api/v1/admin/revalidate/producers/${created.body.id}`)
      .set('X-Admin-Token', token)
      .expect(200);

    expect(revalidated.body).toHaveProperty('previousStatus');
    expect(revalidated.body).toHaveProperty('newStatus');
    // Offline mock permanece PENDING
    expect(revalidated.body.newStatus).toBe('PENDING_EXTERNAL_VALIDATION');
  });
});
