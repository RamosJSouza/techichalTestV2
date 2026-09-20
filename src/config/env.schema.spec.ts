import {
  EXAMPLE_ENCRYPTION_KEY,
  EXAMPLE_PEPPER_SECRET,
  isTrustProxyEnabled,
  parseEnv,
} from './env.schema.js';

describe('parseEnv', () => {
  const base = {
    DATABASE_URL: 'postgres://user:strong-pass@localhost:5432/db',
    ENCRYPTION_KEY:
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    PEPPER_SECRET: 'production-pepper-secret-min-32-chars!!',
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
    expect(env.ENCRYPTION_KEY_ID).toBe('v1');
    expect(env.BODY_LIMIT).toBe('100kb');
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

  it('rejeita PEPPER_SECRET com menos de 32 chars em production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        PEPPER_SECRET: 'unique-but-too-short-16',
      }),
    ).toThrow(/at least 32 characters/);
  });

  it('aceita production com pepper ≥32 e chave não-exemplo', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'production',
      ENCRYPTION_KEY_ID: 'v2',
      TRUST_PROXY: '1',
    });
    expect(env.ENCRYPTION_KEY_ID).toBe('v2');
    expect(isTrustProxyEnabled(env)).toBe(true);
  });

  it('exige ENCRYPTION_KEY_PREVIOUS_ID quando há chave anterior', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'development',
        ENCRYPTION_KEY_PREVIOUS:
          'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      }),
    ).toThrow(/ENCRYPTION_KEY_PREVIOUS_ID/);
  });

  it('exige ENCRYPTION_KEY_PREVIOUS quando há PREVIOUS_ID', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'development',
        ENCRYPTION_KEY_PREVIOUS_ID: 'v0',
      }),
    ).toThrow(/ENCRYPTION_KEY_PREVIOUS/);
  });

  it('rejeita PREVIOUS_ID igual ao ENCRYPTION_KEY_ID', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'development',
        ENCRYPTION_KEY_ID: 'v1',
        ENCRYPTION_KEY_PREVIOUS_ID: 'v1',
        ENCRYPTION_KEY_PREVIOUS:
          'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      }),
    ).toThrow(/must differ/);
  });

  it('rejeita BRASIL_API_BASE_URL com host não allowlisted', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'development',
        BRASIL_API_BASE_URL: 'https://evil.example/api',
      }),
    ).toThrow(/BRASIL_API_BASE_URL/);
  });

  it('aceita BRASIL_API_BASE_URL oficial', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'development',
      BRASIL_API_BASE_URL: 'https://brasilapi.com.br/api',
    });
    expect(env.BRASIL_API_BASE_URL).toContain('brasilapi.com.br');
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
