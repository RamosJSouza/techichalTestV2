import {
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const producers = pgTable(
  'producers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    document: text('document').notNull(),
    documentHash: varchar('document_hash', { length: 64 }).notNull(),
    esgStatus: varchar('esg_status', { length: 20 }).default('APPROVED').notNull(),
    esgCheckedAt: timestamp('esg_checked_at', { withTimezone: true }),
    documentValidationStatus: varchar('document_validation_status', {
      length: 40,
    })
      .default('VALIDATED')
      .notNull(),
    documentValidationPendingAt: timestamp('document_validation_pending_at', {
      withTimezone: true,
    }),
    documentValidationPendingReason: varchar(
      'document_validation_pending_reason',
      { length: 120 },
    ),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('producers_deleted_created_idx').on(table.deletedAt, table.createdAt),
    uniqueIndex('producers_document_hash_active_uidx')
      .on(table.documentHash)
      .where(sql`${table.deletedAt} is null`),
    check(
      'producers_esg_status_chk',
      sql`${table.esgStatus} IN ('APPROVED', 'WARNING', 'BLOCKED')`,
    ),
    check(
      'producers_document_validation_status_chk',
      sql`${table.documentValidationStatus} IN ('VALIDATED', 'PENDING_EXTERNAL_VALIDATION', 'REJECTED')`,
    ),
  ],
);

export const farms = pgTable(
  'farms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    producerId: uuid('producer_id')
      .notNull()
      .references(() => producers.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    totalArea: numeric('total_area', { precision: 12, scale: 2 }).notNull(),
    arableArea: numeric('arable_area', { precision: 12, scale: 2 }).notNull(),
    vegetationArea: numeric('vegetation_area', {
      precision: 12,
      scale: 2,
    }).notNull(),
    carNumber: varchar('car_number', { length: 100 }),
    carStatus: varchar('car_status', { length: 20 }),
    climateRiskScore: numeric('climate_risk_score', {
      precision: 5,
      scale: 2,
    }),
    territorialValidationStatus: varchar('territorial_validation_status', {
      length: 40,
    })
      .default('VALIDATED')
      .notNull(),
    territorialValidationPendingAt: timestamp(
      'territorial_validation_pending_at',
      { withTimezone: true },
    ),
    territorialValidationPendingReason: varchar(
      'territorial_validation_pending_reason',
      { length: 120 },
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('farms_deleted_state_idx').on(table.deletedAt, table.state),
    index('farms_deleted_car_status_idx').on(table.deletedAt, table.carStatus),
    index('farms_producer_id_active_idx')
      .on(table.producerId)
      .where(sql`${table.deletedAt} is null`),
    index('farms_climate_risk_idx')
      .on(table.climateRiskScore)
      .where(
        sql`${table.deletedAt} is null and ${table.climateRiskScore} is not null`,
      ),
    check('farms_total_area_positive_chk', sql`${table.totalArea} > 0`),
    check('farms_arable_area_nonneg_chk', sql`${table.arableArea} >= 0`),
    check(
      'farms_vegetation_area_nonneg_chk',
      sql`${table.vegetationArea} >= 0`,
    ),
    check(
      'farms_area_sum_chk',
      sql`(${table.arableArea} + ${table.vegetationArea}) <= ${table.totalArea}`,
    ),
    check('farms_state_len_chk', sql`char_length(${table.state}) = 2`),
    check(
      'farms_state_uf_chk',
      sql`${table.state} IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
    check(
      'farms_car_status_chk',
      sql`${table.carStatus} IS NULL OR ${table.carStatus} IN ('ACTIVE', 'PENDING', 'CANCELLED')`,
    ),
    check(
      'farms_territorial_validation_status_chk',
      sql`${table.territorialValidationStatus} IN ('VALIDATED', 'PENDING_EXTERNAL_VALIDATION', 'REJECTED')`,
    ),
    check(
      'farms_climate_risk_range_chk',
      sql`${table.climateRiskScore} IS NULL OR (${table.climateRiskScore} >= 0 AND ${table.climateRiskScore} <= 100.01)`,
    ),
  ],
);

export const harvests = pgTable(
  'harvests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id, { onDelete: 'cascade' }),
    year: varchar('year', { length: 10 }).notNull(),
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('harvests_farm_status_year_idx').on(
      table.farmId,
      table.status,
      table.year,
    ),
    check(
      'harvests_status_chk',
      sql`${table.status} IN ('ACTIVE', 'ARCHIVED')`,
    ),
  ],
);

export const farmCrops = pgTable(
  'farm_crops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    harvestId: uuid('harvest_id')
      .notNull()
      .references(() => harvests.id, { onDelete: 'cascade' }),
    cropName: varchar('crop_name', { length: 50 }).notNull(),
  },
  (table) => [
    check(
      'farm_crops_name_nonempty_chk',
      sql`char_length(trim(${table.cropName})) > 0`,
    ),
  ],
);

/** Trilha append-only de mudanças de validação externa (sem PII em claro). */
export const externalValidationAudit = pgTable(
  'external_validation_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceType: varchar('resource_type', { length: 40 }).notNull(),
    resourceId: uuid('resource_id').notNull(),
    previousStatus: varchar('previous_status', { length: 40 }).notNull(),
    newStatus: varchar('new_status', { length: 40 }).notNull(),
    reason: varchar('reason', { length: 120 }),
    trigger: varchar('trigger', { length: 20 }).notNull(),
    actor: varchar('actor', { length: 40 }).notNull(),
    traceId: varchar('trace_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('external_validation_audit_resource_idx').on(
      table.resourceType,
      table.resourceId,
      table.createdAt,
    ),
    check(
      'external_validation_audit_resource_type_chk',
      sql`${table.resourceType} IN ('producer_document', 'farm_territorial')`,
    ),
    check(
      'external_validation_audit_trigger_chk',
      sql`${table.trigger} IN ('write', 'job', 'admin')`,
    ),
    check(
      'external_validation_audit_actor_chk',
      sql`${table.actor} IN ('system', 'admin')`,
    ),
  ],
);
