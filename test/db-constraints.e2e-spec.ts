import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { ConflictException } from '../src/domain/exceptions/conflict.exception.js';
import { InvalidDomainValueException } from '../src/domain/exceptions/invalid-domain-value.exception.js';
import { InvalidFarmAreaException } from '../src/domain/exceptions/invalid-farm-area.exception.js';
import { mapPgIntegrityError } from '../src/infrastructure/database/pg-error.js';

loadEnv();

const databaseUrl = process.env.DATABASE_URL;
const isCi = process.env.CI === 'true' || process.env.CI === '1';

if (isCi && !databaseUrl) {
  throw new Error('DATABASE_URL is required for db-constraints e2e in CI');
}

(databaseUrl ? describe : describe.skip)('PostgreSQL CHECK / UNIQUE constraints', () => {
  let sql: ReturnType<typeof postgres>;
  let producerId: string;

  beforeAll(async () => {
    sql = postgres(databaseUrl!, { max: 1 });
    await migrate(drizzle(sql), {
      migrationsFolder: join(process.cwd(), 'drizzle'),
    });
    await sql`
      TRUNCATE TABLE farm_crops, harvests, farms, producers RESTART IDENTITY CASCADE
    `;

    producerId = randomUUID();
    await sql`
      INSERT INTO producers (id, name, document, document_hash, esg_status)
      VALUES (
        ${producerId}::uuid,
        'Constraint Fixture',
        'encrypted-doc',
        ${'hash-' + producerId.replace(/-/g, '').slice(0, 48)},
        'APPROVED'
      )
    `;
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  async function expectMapped(
    action: () => Promise<unknown>,
    Expected: new (...args: never[]) => Error,
  ): Promise<void> {
    try {
      await action();
      throw new Error('expected constraint violation');
    } catch (error) {
      expect(() => mapPgIntegrityError(error)).toThrow(Expected);
    }
  }

  it('rejeita soma de áreas > total', async () => {
    const farmId = randomUUID();
    await expectMapped(
      () => sql`
        INSERT INTO farms (
          id, producer_id, name, city, state,
          total_area, arable_area, vegetation_area
        ) VALUES (
          ${farmId}::uuid, ${producerId}::uuid, 'Inválida', 'X', 'SP',
          100, 80, 30
        )
      `,
      InvalidFarmAreaException,
    );
  });

  it('rejeita UF inválida', async () => {
    const farmId = randomUUID();
    await expectMapped(
      () => sql`
        INSERT INTO farms (
          id, producer_id, name, city, state,
          total_area, arable_area, vegetation_area
        ) VALUES (
          ${farmId}::uuid, ${producerId}::uuid, 'UF ruim', 'X', 'XX',
          100, 40, 20
        )
      `,
      InvalidDomainValueException,
    );
  });

  it('rejeita harvest status inválido', async () => {
    const farmId = randomUUID();
    const harvestId = randomUUID();
    await sql`
      INSERT INTO farms (
        id, producer_id, name, city, state,
        total_area, arable_area, vegetation_area
      ) VALUES (
        ${farmId}::uuid, ${producerId}::uuid, 'Ok', 'Campinas', 'SP',
        100, 40, 20
      )
    `;
    await expectMapped(
      () => sql`
        INSERT INTO harvests (id, farm_id, year, status)
        VALUES (${harvestId}::uuid, ${farmId}::uuid, '2025', 'NOPE')
      `,
      InvalidDomainValueException,
    );
  });

  it('rejeita esg_status inválido', async () => {
    const id = randomUUID();
    await expectMapped(
      () => sql`
        INSERT INTO producers (id, name, document, document_hash, esg_status)
        VALUES (
          ${id}::uuid,
          'Bad ESG',
          'enc',
          ${'hash-esg-' + id.replace(/-/g, '').slice(0, 40)},
          'NOPE'
        )
      `,
      InvalidDomainValueException,
    );
  });

  it('rejeita document_hash duplicado ativo (23505)', async () => {
    const sharedHash = 'dup-hash-' + 'a'.repeat(40);
    const id1 = randomUUID();
    const id2 = randomUUID();
    await sql`
      INSERT INTO producers (id, name, document, document_hash, esg_status)
      VALUES (${id1}::uuid, 'P1', 'enc1', ${sharedHash}, 'APPROVED')
    `;
    await expectMapped(
      () => sql`
        INSERT INTO producers (id, name, document, document_hash, esg_status)
        VALUES (${id2}::uuid, 'P2', 'enc2', ${sharedHash}, 'APPROVED')
      `,
      ConflictException,
    );
  });
});
