import { sql } from 'drizzle-orm';
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const producers = pgTable('producers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  document: text('document').notNull(),
  documentHash: varchar('document_hash', { length: 64 }).notNull().unique(),
  esgStatus: varchar('esg_status', { length: 20 }).default('APPROVED').notNull(),
  esgCheckedAt: timestamp('esg_checked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

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
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('farms_producer_id_idx').on(t.producerId),
    index('farms_active_state_idx')
      .on(t.state)
      .where(sql`${t.deletedAt} IS NULL`),
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
  (t) => [
    index('harvests_farm_id_idx').on(t.farmId),
    index('harvests_active_farm_id_idx')
      .on(t.farmId)
      .where(sql`${t.status} = 'ACTIVE'`),
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
  (t) => [index('farm_crops_harvest_id_idx').on(t.harvestId)],
);
