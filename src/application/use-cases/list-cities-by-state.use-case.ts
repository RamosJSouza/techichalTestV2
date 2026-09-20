import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';

export class ListCitiesByStateUseCase {
  public constructor(
    private readonly brazilData: BrazilDataServiceInterface,
  ) {}

  public async execute(uf: string): Promise<string[]> {
    const cities = await this.brazilData.listCitiesByState(uf);
    return cities ?? [];
  }
}
