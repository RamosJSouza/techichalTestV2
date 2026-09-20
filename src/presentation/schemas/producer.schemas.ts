import { z } from 'zod';

const MAX_FARMS = 20;
const MAX_HARVESTS = 10;
const MAX_CROPS = 20;
const MAX_PAGE = 10_000;

const harvestSchema = z
  .object({
    year: z.string().min(1).max(10),
    crops: z.array(z.string().min(1).max(50)).min(1).max(MAX_CROPS),
  })
  .strict();

const farmBodySchema = z
  .object({
    name: z.string().min(1).max(255),
    city: z.string().min(1).max(100),
    state: z.string().length(2),
    totalArea: z.number().positive(),
    arableArea: z.number().nonnegative(),
    vegetationArea: z.number().nonnegative(),
    harvests: z.array(harvestSchema).max(MAX_HARVESTS).optional(),
    carNumber: z.string().min(1).max(100).optional(),
  })
  .strict();

export const createProducerSchema = z
  .object({
    name: z.string().min(1).max(255),
    document: z.string().min(11).max(18),
    farms: z.array(farmBodySchema).max(MAX_FARMS).optional(),
  })
  .strict();

export const updateProducerSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    document: z.string().min(11).max(18).optional(),
  })
  .strict();

export const searchProducerQuerySchema = z
  .object({
    document: z.string().min(11).max(18),
  })
  .strict();

export const listProducersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'name']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    name: z.string().trim().min(1).max(255).optional(),
    cursor: z.string().min(1).max(512).optional(),
  })
  .strict();

export const uuidParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const createFarmSchema = farmBodySchema.extend({
  producerId: z.string().uuid(),
});

export const updateFarmSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().length(2).optional(),
    totalArea: z.number().positive().optional(),
    arableArea: z.number().nonnegative().optional(),
    vegetationArea: z.number().nonnegative().optional(),
    carNumber: z.string().min(1).max(100).nullable().optional(),
    harvests: z.array(harvestSchema).max(MAX_HARVESTS).optional(),
  })
  .strict();
