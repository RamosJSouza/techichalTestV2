import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ProagroServiceInterface } from '../../../application/services/proagro.service.interface.js';

/** Mock determinístico: score 0–100 a partir de hash estável city|UF|crops. */
@Injectable()
export class MockProagroAdapter implements ProagroServiceInterface {
  public async calculateClimateRisk(input: {
    city: string;
    state: string;
    crops: string[];
  }): Promise<number> {
    const normalizedCity = input.city
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
    const key = [
      normalizedCity,
      input.state.toUpperCase(),
      ...[...input.crops].map((c) => c.toLowerCase()).sort(),
    ].join('|');
    const digest = createHash('sha256').update(key).digest();
    const raw = digest.readUInt16BE(0);
    return Number(((raw % 10001) / 100).toFixed(2));
  }
}
