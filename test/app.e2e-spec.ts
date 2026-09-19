import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { GlobalExceptionFilter } from '../src/presentation/filters/global-exception.filter.js';
import { ZodValidationPipe } from '../src/presentation/pipes/zod-validation.pipe.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

(hasDatabase ? describe : describe.skip)('Brain Agriculture API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok' });
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

  it('cria produtor com documento mascarado e soft-delete', async () => {
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

  it('rejeita área de fazenda inválida', async () => {
    const producer = await request(app.getHttpServer())
      .post('/api/v1/producers')
      .send({
        name: 'Produtor Área',
        document: '390.533.447-05',
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
});
