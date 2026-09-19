import { InvalidCarNumberException } from '../exceptions/invalid-car-number.exception.js';

/**
 * Formato oficial do CAR: UF-XXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 * Ex.: SP-3550308-E9D8C7B6A5F4E3D2C1B0A9F8E7D6C5B4
 */
const CAR_PATTERN = /^[A-Z]{2}-\d{7}-[A-F0-9]{32}$/i;

export class CarNumber {
  private constructor(public readonly value: string) {}

  public static create(raw: string): CarNumber {
    const normalized = raw.trim().toUpperCase();
    if (!CAR_PATTERN.test(normalized)) {
      throw new InvalidCarNumberException(
        'CAR inválido. Formato esperado: UF-XXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.',
      );
    }
    return new CarNumber(normalized);
  }
}
