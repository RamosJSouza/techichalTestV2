export const PROAGRO_SERVICE = Symbol('PROAGRO_SERVICE');

export interface ProagroServiceInterface {
  calculateClimateRisk(input: {
    city: string;
    state: string;
    crops: string[];
  }): Promise<number>;
}
