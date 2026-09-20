import { z } from 'zod';

export const EXAMPLE_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
export const EXAMPLE_PEPPER_SECRET = 'change-me-pepper-secret-min-16';

const hex64 = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, 'must be 64 hex chars (32 bytes)');

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    ENCRYPTION_KEY: hex64,
    ENCRYPTION_KEY_ID: z.string().min(1).max(32).default('v1'),
    ENCRYPTION_KEY_PREVIOUS: hex64.optional(),
    ENCRYPTION_KEY_PREVIOUS_ID: z.string().min(1).max(32).optional(),
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
    TRUST_PROXY: z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .default('false'),
    BODY_LIMIT: z.string().min(2).max(16).default('100kb'),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(
      (value) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
      z.string().url().optional(),
    ),
    OTEL_SERVICE_NAME: z.preprocess(
      (value) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
      z.string().min(1).max(128).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.ENCRYPTION_KEY_PREVIOUS && !data.ENCRYPTION_KEY_PREVIOUS_ID) {
      ctx.addIssue({
        code: 'custom',
        path: ['ENCRYPTION_KEY_PREVIOUS_ID'],
        message:
          'ENCRYPTION_KEY_PREVIOUS_ID is required when ENCRYPTION_KEY_PREVIOUS is set',
      });
    }
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
          'production forbids the example PEPPER_SECRET; set a unique secret',
      });
    }
    if (data.PEPPER_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['PEPPER_SECRET'],
        message: 'production requires PEPPER_SECRET with at least 32 characters',
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

export function isTrustProxyEnabled(env: Env): boolean {
  return env.TRUST_PROXY === 'true' || env.TRUST_PROXY === '1';
}
