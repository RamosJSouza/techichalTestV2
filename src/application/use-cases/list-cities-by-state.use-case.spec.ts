import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import { ListCitiesByStateUseCase } from './list-cities-by-state.use-case.js';

function buildUseCase(
  listCitiesByState: BrazilDataServiceInterface['listCitiesByState'],
): ListCitiesByStateUseCase {
  const stub: BrazilDataServiceInterface = {
    getCnpjData: async () => null,
    isCityInState: async () => null,
    listCitiesByState,
  };
  return new ListCitiesByStateUseCase(stub);
}

describe('ListCitiesByStateUseCase', () => {
  it('retorna lista de cidades do serviço', async () => {
    const useCase = buildUseCase(async () => ['Ribeirão Preto', 'São Paulo']);
    const cities = await useCase.execute('SP');
    expect(cities).toEqual(['Ribeirão Preto', 'São Paulo']);
  });

  it('retorna array vazio quando serviço devolve null (API indisponível)', async () => {
    const useCase = buildUseCase(async () => null);
    const cities = await useCase.execute('SP');
    expect(cities).toEqual([]);
  });
});
