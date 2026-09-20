import { CryptoService } from './crypto.service.js';

describe('CryptoService', () => {
  const key =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const previousKey =
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  const pepper = 'change-me-pepper-secret-min-16';
  const crypto = new CryptoService(pepper, { keyId: 'v1', keyHex: key });

  it('faz roundtrip encrypt/decrypt com kid', () => {
    const plaintext = '52998224725';
    const encrypted = crypto.encrypt(plaintext);
    expect(encrypted.split(':')).toHaveLength(4);
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(crypto.decrypt(encrypted)).toBe(plaintext);
  });

  it('descriptografa payload legado sem kid', () => {
    const legacy = new CryptoService(pepper, { keyId: 'v1', keyHex: key });
    const withKid = legacy.encrypt('52998224725');
    const parts = withKid.split(':');
    const legacyPayload = parts.slice(1).join(':');
    expect(legacyPayload.split(':')).toHaveLength(3);
    expect(crypto.decrypt(legacyPayload)).toBe('52998224725');
  });

  it('descriptografa com chave anterior (rotação)', () => {
    const oldCrypto = new CryptoService(pepper, {
      keyId: 'v0',
      keyHex: previousKey,
    });
    const ciphertext = oldCrypto.encrypt('11144477735');
    const rotated = new CryptoService(pepper, {
      keyId: 'v1',
      keyHex: key,
      previousKeyId: 'v0',
      previousKeyHex: previousKey,
    });
    expect(rotated.decrypt(ciphertext)).toBe('11144477735');
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
