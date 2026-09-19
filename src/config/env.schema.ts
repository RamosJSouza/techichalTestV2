import { z } from 'zod';

const booleanFromEnv = z.preprocess((value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),
  PEPPER_SECRET: z.string().min(16, 'PEPPER_SECRET must be at least 16 characters'),
  BRASIL_API_BASE_URL: z
    .string()
    .url()
    .default('https://brasilapi.com.br/api'),
  ENABLE_CAR_VALIDATION: booleanFromEnv.default(false),
  ENABLE_ESG_COMPLIANCE: booleanFromEnv.default(false),
  ESG_STRICT_MODE: booleanFromEnv.default(false),
  ENABLE_PROAGRO_RISK: booleanFromEnv.default(false),
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
