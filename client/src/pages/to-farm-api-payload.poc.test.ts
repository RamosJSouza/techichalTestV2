import type { FarmResponse } from '../shared/types/api';
import {
  farmFromResponse,
  removedHarvestYears,
  toFarmApiPayload,
} from './producer-form-helpers';

const farmWithTwoHarvests: FarmResponse = {
  id: 'farm-x',
  producerId: 'p1',
  name: 'Boa Vista',
  city: 'Ribeirão Preto',
  state: 'SP',
  totalArea: 500,
  arableArea: 300,
  vegetationArea: 100,
  carNumber: null,
  carStatus: null,
  climateRiskScore: null,
  territorialValidationStatus: 'VALIDATED',
  harvests: [
    { id: 'h1', year: '2025/2026', status: 'ACTIVE', crops: ['Soja', 'Milho'] },
    { id: 'h2', year: '2026/2027', status: 'ACTIVE', crops: ['Café'] },
  ],
};

describe('POC H2 (frontend) — toFarmApiPayload preserva safras extras', () => {
  it('farmFromResponse preserva todas as safras', () => {
    const formValues = farmFromResponse(farmWithTwoHarvests);
    expect(formValues.harvests).toHaveLength(2);
    expect(formValues.harvests?.[0]?.year).toBe('2025/2026');
    expect(formValues.harvests?.[1]?.year).toBe('2026/2027');
  });

  it('toFarmApiPayload devolve as safras editadas, com ano sem espaços', () => {
    const formValues = farmFromResponse(farmWithTwoHarvests);
    formValues.harvests = [
      { year: ' 2021 ', crops: ['Soja', 'Milho'] },
      { year: '2022', crops: ['Café'] },
    ];
    const payload = toFarmApiPayload(formValues);

    expect(payload.harvests).toHaveLength(2);
    expect(payload.harvests?.[0]?.year).toBe('2021');
    expect(payload.harvests?.[0]?.crops).toEqual(['Soja', 'Milho']);
    expect(payload.harvests?.[1]?.year).toBe('2022');
    expect(payload.harvests?.[1]?.crops).toEqual(['Café']);
  });

  it('removedHarvestYears lista o ano que saiu da tela e ignora o que voltou', () => {
    expect(
      removedHarvestYears(
        ['2021', '2022'],
        [{ year: '2021' }, { year: '2023' }],
      ),
    ).toEqual(['2022']);
    expect(
      removedHarvestYears(['2021', '2022'], [{ year: '2021' }, { year: '2022' }]),
    ).toEqual([]);
  });
});
