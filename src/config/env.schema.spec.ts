import {
  EXAMPLE_ENCRYPTION_KEY,
  EXAMPLE_PEPPER_SECRET,
  parseEnv,
} from './env.schema.js';

describe('parseEnv', () => {
  const base = {
    DATABASE_URL: 'postgres://user:strong-pass@localhost:5432/db',
    ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    PEPPER_SECRET: 'production-pepper-secret',
  };

  it('aceita secrets de exemplo em development', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'development',
      ENCRYPTION_KEY: EXAMPLE_ENCRYPTION_KEY,
      PEPPER_SECRET: EXAMPLE_PEPPER_SECRET,
      DATABASE_URL: 'postgres://postgres:postgrespassword@localhost:5433/db',
    });
    expect(env.NODE_ENV).toBe('development');
  });

  it('rejeita ENCRYPTION_KEY de exemplo em production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        ENCRYPTION_KEY: EXAMPLE_ENCRYPTION_KEY,
      }),
    ).toThrow(/ENCRYPTION_KEY/);
  });

  it('rejeita PEPPER_SECRET de exemplo em production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        PEPPER_SECRET: EXAMPLE_PEPPER_SECRET,
      }),
    ).toThrow(/PEPPER_SECRET/);
  });

  it('rejeita senha trivial no DATABASE_URL em production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://postgres:postgrespassword@db:5432/brain',
      }),
    ).toThrow(/DATABASE_URL/);
  });
});
