/** Escalas e constantes do dataset de bench. */

export const SCALES = {
  S: 10_000,
  M: 100_000,
  L: 1_000_000,
};

export const SEED = 42;

export const MAJOR_STATES = ['SP', 'MG', 'PR', 'RS', 'GO'];
export const ALL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const CROPS = ['Soja', 'Milho', 'Café', 'Algodão', 'Cana'];
export const CITIES = [
  'Ribeirão Preto',
  'Campinas',
  'Londrina',
  'Cascavel',
  'Uberaba',
  'Dourados',
  'Passo Fundo',
  'Sorriso',
];

/** PRNG mulberry32 */
export function createRng(seed = SEED) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseScale(argv = process.argv) {
  const arg = argv.find((a) => a.startsWith('--scale='));
  const raw = (arg?.split('=')[1] ?? process.env.BENCH_SCALE ?? 'S').toUpperCase();
  if (!(raw in SCALES)) {
    throw new Error(`Invalid scale ${raw}; use S|M|L`);
  }
  return raw;
}

export function farmsForScale(scale) {
  return SCALES[scale];
}
