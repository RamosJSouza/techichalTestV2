export const BRAZIL_DATA_SERVICE = Symbol('BRAZIL_DATA_SERVICE');

export interface CnpjCompanyData {
  cnpj: string;
  razaoSocial: string;
  situacaoCadastral: string;
  isActive: boolean;
}

/**
 * Resultado discriminado da BrasilAPI.
 * Outage / circuit open → PENDING (nunca positivo silencioso).
 * Rejeição definitiva → REJECTED.
 */
export type BrazilLookupResult<T> =
  | { outcome: 'VALIDATED'; data: T }
  | { outcome: 'PENDING_EXTERNAL_VALIDATION'; reason: string }
  | { outcome: 'REJECTED'; reason: string };

export interface BrazilDataServiceInterface {
  getCnpjData(cnpj: string): Promise<BrazilLookupResult<CnpjCompanyData>>;
  isCityInState(
    city: string,
    state: string,
  ): Promise<BrazilLookupResult<boolean>>;
  listCitiesByState(uf: string): Promise<BrazilLookupResult<string[]>>;
}
