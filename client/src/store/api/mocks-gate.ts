/** Mocks só com flag explícita — nunca em produção/CI. */
export function isViteMocksEnabled(
  value: string | boolean | undefined,
): boolean {
  return value === 'true';
}
