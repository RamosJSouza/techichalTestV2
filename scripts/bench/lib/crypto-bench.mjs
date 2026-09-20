import {
  createCipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

/**
 * AES-256-GCM + HMAC blind index — alinhado a CryptoService (kid:iv:tag:ct).
 */
export function createBenchCrypto(pepperSecret, keyHex, keyId = 'v1') {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes');
  }

  return {
    encrypt(plaintext) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      return `${keyId}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    },
    blindIndex(plaintext) {
      return createHmac('sha256', pepperSecret).update(plaintext).digest('hex');
    },
  };
}
