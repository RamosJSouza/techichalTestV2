import { createHash } from 'node:crypto';

export function calculateClimateRisk(input: {
  city: string;
  state: string;
  crops: string[];
}): number {
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
