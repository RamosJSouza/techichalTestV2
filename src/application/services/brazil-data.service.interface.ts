export const BRAZIL_DATA_SERVICE = Symbol('BRAZIL_DATA_SERVICE');

export interface CnpjCompanyData {
  cnpj: string;
  razaoSocial: string;
  situacaoCadastral: string;
  isActive: boolean;
}

export interface BrazilDataServiceInterface {
  getCnpjData(cnpj: string): Promise<CnpjCompanyData | null>;
  isCityInState(city: string, state: string): Promise<boolean | null>;
}
