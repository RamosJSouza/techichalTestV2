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

  it('rejeita total_area <= 0', async () => {
    const farmId = randomUUID();
    await expectMapped(
      () => sql`
        INSERT INTO farms (
          id, producer_id, name, city, state,
          total_area, arable_area, vegetation_area
        ) VALUES (
          ${farmId}::uuid, ${producerId}::uuid, 'Zero', 'X', 'SP',
          0, 0, 0
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

  it('rejeita car_status inválido', async () => {
    const farmId = randomUUID();
    await expectMapped(
      () => sql`
        INSERT INTO farms (
          id, producer_id, name, city, state,
          total_area, arable_area, vegetation_area, car_status
        ) VALUES (
          ${farmId}::uuid, ${producerId}::uuid, 'CAR ruim', 'X', 'SP',
          100, 40, 20, 'NOPE'
        )
      `,
      InvalidDomainValueException,
    );
  });

  it('rejeita document_validation_status inválido', async () => {
    const id = randomUUID();
    await expectMapped(
      () => sql`
        INSERT INTO producers (
          id, name, document, document_hash, esg_status, document_validation_status
        ) VALUES (
          ${id}::uuid,
          'Bad Doc Val',
          'enc',
          ${'hash-dv-' + id.replace(/-/g, '').slice(0, 40)},
          'APPROVED',
          'NOPE'
        )
      `,
      InvalidDomainValueException,
    );
  });

  it('rejeita territorial_validation_status inválido', async () => {
    const farmId = randomUUID();
    await expectMapped(
      () => sql`
        INSERT INTO farms (
          id, producer_id, name, city, state,
          total_area, arable_area, vegetation_area,
          territorial_validation_status
        ) VALUES (
          ${farmId}::uuid, ${producerId}::uuid, 'Terr ruim', 'X', 'SP',
          100, 40, 20, 'NOPE'
        )
      `,
      InvalidDomainValueException,
    );
  });

  it('rejeita crop_name vazio', async () => {
    const farmId = randomUUID();
    const harvestId = randomUUID();
    await sql`
      INSERT INTO farms (
        id, producer_id, name, city, state,
        total_area, arable_area, vegetation_area
      ) VALUES (
        ${farmId}::uuid, ${producerId}::uuid, 'Crop farm', 'Campinas', 'SP',
        100, 40, 20
      )
    `;
    await sql`
      INSERT INTO harvests (id, farm_id, year, status)
      VALUES (${harvestId}::uuid, ${farmId}::uuid, '2025', 'ACTIVE')
    `;
    await expectMapped(
      () => sql`
        INSERT INTO farm_crops (id, harvest_id, crop_name)
        VALUES (${randomUUID()}::uuid, ${harvestId}::uuid, '')
      `,
      InvalidDomainValueException,
    );
  });

  it('rejeita climate_risk_score fora da faixa', async () => {
    const farmId = randomUUID();
    await expectMapped(
      () => sql`
        INSERT INTO farms (
          id, producer_id, name, city, state,
          total_area, arable_area, vegetation_area, climate_risk_score
        ) VALUES (
          ${farmId}::uuid, ${producerId}::uuid, 'Clima ruim', 'X', 'SP',
          100, 40, 20, -1
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

  it('soft delete libera reuso do document_hash', async () => {
    const sharedHash = 'soft-hash-' + 'b'.repeat(40);
    const id1 = randomUUID();
    const id2 = randomUUID();
    await sql`
      INSERT INTO producers (id, name, document, document_hash, esg_status)
      VALUES (${id1}::uuid, 'Soft1', 'enc-s1', ${sharedHash}, 'APPROVED')
    `;
    await sql`
      UPDATE producers
      SET deleted_at = now(),
          document_hash = ${'del:' + id1},
          updated_at = now()
      WHERE id = ${id1}::uuid
    `;
    await sql`
      INSERT INTO producers (id, name, document, document_hash, esg_status)
      VALUES (${id2}::uuid, 'Soft2', 'enc-s2', ${sharedHash}, 'APPROVED')
    `;
    const rows = await sql`
      SELECT id FROM producers
      WHERE document_hash = ${sharedHash} AND deleted_at IS NULL
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(id2);
  });

  it('hard DELETE em producers cascateia farms → harvests → farm_crops', async () => {
    const pid = randomUUID();
    const farmId = randomUUID();
    const harvestId = randomUUID();
    const cropId = randomUUID();
    await sql`
      INSERT INTO producers (id, name, document, document_hash, esg_status)
      VALUES (
        ${pid}::uuid,
        'Cascade',
        'enc-c',
        ${'hash-casc-' + pid.replace(/-/g, '').slice(0, 40)},
        'APPROVED'
      )
    `;
    await sql`
      INSERT INTO farms (
        id, producer_id, name, city, state,
        total_area, arable_area, vegetation_area
      ) VALUES (
        ${farmId}::uuid, ${pid}::uuid, 'F', 'Campinas', 'SP',
        100, 40, 20
      )
    `;
    await sql`
      INSERT INTO harvests (id, farm_id, year, status)
      VALUES (${harvestId}::uuid, ${farmId}::uuid, '2025', 'ACTIVE')
    `;
    await sql`
      INSERT INTO farm_crops (id, harvest_id, crop_name)
      VALUES (${cropId}::uuid, ${harvestId}::uuid, 'Soja')
    `;

    await sql`DELETE FROM producers WHERE id = ${pid}::uuid`;

    const farmsLeft = await sql`SELECT id FROM farms WHERE id = ${farmId}::uuid`;
    const harvestsLeft =
      await sql`SELECT id FROM harvests WHERE id = ${harvestId}::uuid`;
    const cropsLeft =
      await sql`SELECT id FROM farm_crops WHERE id = ${cropId}::uuid`;
    expect(farmsLeft).toHaveLength(0);
    expect(harvestsLeft).toHaveLength(0);
    expect(cropsLeft).toHaveLength(0);
  });
});
