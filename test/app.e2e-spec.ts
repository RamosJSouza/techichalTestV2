import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { join } from 'node:path';
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

const databaseUrl = process.env.DATABASE_URL;
const isCi = process.env.CI === 'true' || process.env.CI === '1';

if (isCi && !databaseUrl) {
  throw new Error('DATABASE_URL is required for e2e in CI');
}

const offlineBrazil: BrazilDataServiceInterface = {
  getCnpjData: async () => null,
  isCityInState: async () => true,
  listCitiesByState: async () => ['Ribeirão Preto', 'Campinas'],
};

(databaseUrl ? describe : describe.skip)('Brain Agriculture API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const client = postgres(databaseUrl!, { max: 1 });
    try {
      await migrate(drizzle(client), {
        migrationsFolder: join(process.cwd(), 'drizzle'),
      });
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

    await request(app.getHttpServer())
      .get(`/api/v1/producers/${id}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/producers/${id}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/producers/${id}`)
      .expect(404);
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

  it('cria produtor com BrasilAPI offline (degradação)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send({
        name: 'Offline BrasilAPI',
        document: '153.509.460-56',
      });
    expect([200, 201]).toContain(response.status);
  });
});
