import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import { ListCitiesByStateUseCase } from './list-cities-by-state.use-case.js';

function buildUseCase(
  listCitiesByState: BrazilDataServiceInterface['listCitiesByState'],
): ListCitiesByStateUseCase {
  const stub: BrazilDataServiceInterface = {
    getCnpjData: async () => ({
      outcome: 'PENDING_EXTERNAL_VALIDATION',
      reason: 'timeout_or_network',
    }),
    isCityInState: async () => ({
      outcome: 'PENDING_EXTERNAL_VALIDATION',
      reason: 'timeout_or_network',
    }),
    listCitiesByState,
  };
  return new ListCitiesByStateUseCase(stub);
}

describe('ListCitiesByStateUseCase', () => {
  it('retorna lista de cidades do serviço', async () => {
    const useCase = buildUseCase(async () => ({
      outcome: 'VALIDATED',
      data: ['Ribeirão Preto', 'São Paulo'],
    }));
    const cities = await useCase.execute('SP');
    expect(cities).toEqual(['Ribeirão Preto', 'São Paulo']);
  });

  it('retorna array vazio quando serviço está PENDING (API indisponível)', async () => {
    const useCase = buildUseCase(async () => ({
      outcome: 'PENDING_EXTERNAL_VALIDATION',
      reason: 'timeout_or_network',
    }));
    const cities = await useCase.execute('SP');
    expect(cities).toEqual([]);
  });
});
