import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

export interface CryptoKeyRing {
  keyId: string;
  keyHex: string;
  previousKeyId?: string;
  previousKeyHex?: string;
}

export class CryptoService {
  private readonly activeKeyId: string;
  private readonly keys: Map<string, Buffer>;
  private readonly pepperSecret: string;

  public constructor(pepperSecret: string, keyRing: CryptoKeyRing) {
    this.pepperSecret = pepperSecret;
    this.activeKeyId = keyRing.keyId;
    this.keys = new Map();
    this.registerKey(keyRing.keyId, keyRing.keyHex);
    if (keyRing.previousKeyId && keyRing.previousKeyHex) {
      this.registerKey(keyRing.previousKeyId, keyRing.previousKeyHex);
    }
  }

  private registerKey(keyId: string, keyHex: string): void {
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
      throw new Error(`ENCRYPTION_KEY for ${keyId} must decode to 32 bytes`);
    }
    this.keys.set(keyId, key);
  }

  public encrypt(plaintext: string): string {
    const key = this.keys.get(this.activeKeyId);
    if (!key) {
      throw new Error('Active encryption key is not registered');
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${this.activeKeyId}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  public decrypt(payload: string): string {
    const parts = payload.split(':');
    let keyId = this.activeKeyId;
    let ivHex: string;
    let authTagHex: string;
    let ciphertextHex: string;

    if (parts.length === 4) {
      [keyId, ivHex, authTagHex, ciphertextHex] = parts as [
        string,
        string,
        string,
        string,
      ];
    } else if (parts.length === 3) {
      [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];
    } else {
      throw new Error('Invalid encrypted payload format');
    }

    if (!ivHex || !authTagHex || !ciphertextHex) {
      throw new Error('Invalid encrypted payload format');
    }

    const key = this.keys.get(keyId) ?? this.keys.get(this.activeKeyId);
    if (!key) {
      throw new Error(`Unknown encryption key id: ${keyId}`);
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
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
