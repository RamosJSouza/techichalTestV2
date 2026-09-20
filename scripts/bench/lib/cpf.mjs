/** CPF sintético válido a partir de um índice (determinístico). */

export function cpfFromIndex(index) {
  const base = String(100_000_000 + (index % 899_999_999)).slice(0, 9);
  const d1 = calcDigit(base, 10);
  const d2 = calcDigit(base + String(d1), 11);
  return `${base}${d1}${d2}`;
}

function calcDigit(base, factor) {
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * (factor - i);
  }
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}
