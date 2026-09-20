import { z } from 'zod';

export const ufParamSchema = z
  .object({
    uf: z
      .string()
      .length(2)
      .regex(/^[A-Za-z]{2}$/, 'UF deve ter 2 letras'),
  })
  .strict();
