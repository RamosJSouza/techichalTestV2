/** Unidades federativas brasileiras (ISO 3166-2:BR). */
export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export type BrazilianState = (typeof BRAZILIAN_STATES)[number];

export function isBrazilianState(value: string): value is BrazilianState {
  return (BRAZILIAN_STATES as readonly string[]).includes(value);
}
