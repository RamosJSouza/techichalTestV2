import { z } from 'zod';

export const EXAMPLE_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
export const EXAMPLE_PEPPER_SECRET = 'change-me-pepper-secret-min-16';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    ENCRYPTION_KEY: z
      .string()
      .regex(
        /^[0-9a-fA-F]{64}$/,
        'ENCRYPTION_KEY must be 64 hex chars (32 bytes)',
      ),
    PEPPER_SECRET: z
      .string()
      .min(16, 'PEPPER_SECRET must be at least 16 characters'),
    BRASIL_API_BASE_URL: z
      .string()
      .url()
      .default('https://brasilapi.com.br/api'),
    CORS_ORIGINS: z.string().optional().default(''),
    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') {
      return;
    }
    if (data.ENCRYPTION_KEY.toLowerCase() === EXAMPLE_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['ENCRYPTION_KEY'],
        message:
          'production forbids the example ENCRYPTION_KEY; generate a unique 64-hex key',
      });
    }
    if (data.PEPPER_SECRET === EXAMPLE_PEPPER_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['PEPPER_SECRET'],
        message:
          'production forbids the example PEPPER_SECRET; set a unique secret (≥16 chars)',
      });
    }
    if (
      data.DATABASE_URL.includes('postgrespassword') ||
      data.DATABASE_URL.includes('changeme')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'production forbids trivial database passwords (e.g. postgrespassword)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(env: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return result.data;
}
