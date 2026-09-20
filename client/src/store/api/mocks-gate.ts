/**
 * Mocks offline só com flag explícita (dev/teste).
 * Produção e CI não devem definir VITE_USE_MOCKS=true.
 * Sem import.meta aqui — o caller passa o valor do env (Jest-friendly).
 */
export function isViteMocksEnabled(
  value: string | boolean | undefined,
): boolean {
  return value === 'true';
}
