export const CRYPTO_SERVICE_PORT = Symbol('CRYPTO_SERVICE_PORT');

export interface CryptoServiceInterface {
  encrypt(plaintext: string): string;
  decrypt(payload: string): string;
  blindIndex(plaintext: string): string;
}
