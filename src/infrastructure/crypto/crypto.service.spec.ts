import { CryptoService } from './crypto.service.js';

describe('CryptoService', () => {
  const key =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const pepper = 'change-me-pepper-secret-min-16';
  const crypto = new CryptoService(key, pepper);

  it('faz roundtrip encrypt/decrypt', () => {
    const plaintext = '52998224725';
    const encrypted = crypto.encrypt(plaintext);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(crypto.decrypt(encrypted)).toBe(plaintext);
  });

  it('gera blind index determinístico', () => {
    const hash1 = crypto.blindIndex('52998224725');
    const hash2 = crypto.blindIndex('52998224725');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('gera IVs diferentes a cada encrypt', () => {
    const a = crypto.encrypt('52998224725');
    const b = crypto.encrypt('52998224725');
    expect(a).not.toBe(b);
  });
});
