/**
 * POC — H2 (frontend): toFarmApiPayload colapsa múltiplas safras em uma só.
 *
 * Cenário: fazenda criada via API/seed com 2 safras é editada pelo wizard.
 * farmFromResponse preserva as 2 safras, mas toFarmApiPayload só emite harvests[0].
 * O backend replaceHarvests substitui TODAS → 2ª safra perdida silenciosamente.
 *
 * Este POC falha com o código atual e passa após o fix (preservar harvests.slice(1)).
 */
import { toFarmApiPayload, farmFromResponse } from './producer-form-helpers';
import type { FarmResponse } from '../shared/types/api';

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

  it('toFarmApiPayload NÃO descarta safras além da primeira', () => {
    const formValues = farmFromResponse(farmWithTwoHarvests);
    const payload = toFarmApiPayload(formValues, ['Soja', 'Milho']);

    // EXPECTADO (correto): preserva a 2ª safra
    expect(payload.harvests).toHaveLength(2); // ← FAIL atual: 1
    expect(payload.harvests?.[0]?.year).toBe('2025/2026');
    expect(payload.harvests?.[0]?.crops).toEqual(['Soja', 'Milho']);
    expect(payload.harvests?.[1]?.year).toBe('2026/2027'); // ← FAIL atual: undefined
    expect(payload.harvests?.[1]?.crops).toEqual(['Café']);
  });
});
