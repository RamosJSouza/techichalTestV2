import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

export class CryptoService {
  private readonly encryptionKey: Buffer;
  private readonly pepperSecret: string;

  public constructor(encryptionKeyHex: string, pepperSecret: string) {
    this.encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
    if (this.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must decode to 32 bytes');
    }
    this.pepperSecret = pepperSecret;
  }

  public encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  public decrypt(payload: string): string {
    const [ivHex, authTagHex, ciphertextHex] = payload.split(':');
    if (!ivHex || !authTagHex || !ciphertextHex) {
      throw new Error('Invalid encrypted payload format');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  public blindIndex(plaintext: string): string {
    return createHmac('sha256', this.pepperSecret)
      .update(plaintext)
      .digest('hex');
  }
}
