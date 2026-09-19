import { z } from 'zod';

export const harvestSchema = z
  .object({
    year: z.string().min(1).max(10),
    crops: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const farmBodySchema = z
  .object({
    name: z.string().min(1).max(255),
    city: z.string().min(1).max(100),
    state: z.string().length(2),
    totalArea: z.number().positive(),
    arableArea: z.number().nonnegative(),
    vegetationArea: z.number().nonnegative(),
    harvests: z.array(harvestSchema).optional(),
  })
  .strict();

export const createProducerSchema = z
  .object({
    name: z.string().min(1).max(255),
    document: z.string().min(11).max(18),
    farms: z.array(farmBodySchema).optional(),
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

export const uuidParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const createFarmSchema = farmBodySchema.extend({
  producerId: z.string().uuid(),
});

export type CreateProducerSchema = z.infer<typeof createProducerSchema>;
export type UpdateProducerSchema = z.infer<typeof updateProducerSchema>;
export type CreateFarmSchema = z.infer<typeof createFarmSchema>;
