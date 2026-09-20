import { z } from 'zod';

export const clientTimingSchema = z
  .object({
    event: z.enum(['dashboard_csv_export']),
    durationSeconds: z.number().positive().max(120),
  })
  .strict();

export type ClientTimingInput = z.infer<typeof clientTimingSchema>;
