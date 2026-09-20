import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';

export class ListCitiesByStateUseCase {
  public constructor(
    private readonly brazilData: BrazilDataServiceInterface,
  ) {}

  public async execute(uf: string): Promise<string[]> {
    const result = await this.brazilData.listCitiesByState(uf);
    switch (result.outcome) {
      case 'VALIDATED':
        return result.data;
      case 'PENDING_EXTERNAL_VALIDATION':
      case 'REJECTED':
        return [];
      default: {
        const _exhaustive: never = result;
        throw new Error(`Unexpected cities lookup: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }
}
