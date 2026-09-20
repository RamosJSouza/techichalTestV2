import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown =>
  value === '' || value === null || value === undefined ? undefined : value;

export const dashboardStatsQuerySchema = z
  .object({
    state: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .length(2)
        .regex(/^[A-Za-z]{2}$/)
        .transform((v) => v.toUpperCase())
        .optional(),
    ),
    crop: z.preprocess(emptyToUndefined, z.string().min(1).max(50).optional()),
    harvestYear: z.preprocess(
      emptyToUndefined,
      z.string().min(1).max(10).optional(),
    ),
    esgStatus: z.preprocess(
      emptyToUndefined,
      z.enum(['APPROVED', 'WARNING', 'BLOCKED']).optional(),
    ),
    carStatus: z.preprocess(
      emptyToUndefined,
      z.enum(['ACTIVE', 'PENDING', 'CANCELLED']).optional(),
    ),
    minClimateRisk: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0).max(100).optional(),
    ),
    maxClimateRisk: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0).max(100).optional(),
    ),
  })
  .strict();
