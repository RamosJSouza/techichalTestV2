import type { FarmAreasFormValues } from '../shared/schemas/producer.schemas';
import type { FarmResponse } from '../shared/types/api';

export const defaultFarm = (): FarmAreasFormValues => ({
  name: '',
  city: '',
  state: 'SP',
  totalArea: 100,
  arableArea: 50,
  vegetationArea: 20,
  harvests: [{ year: '2025/2026', crops: [] }],
  carNumber: undefined,
});

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function emptyToUndefined(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeCarNumber(
  value: string | null | undefined,
): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function farmFromResponse(farm: FarmResponse): FarmAreasFormValues {
  return {
    name: farm.name,
    city: farm.city,
    state: farm.state,
    totalArea: farm.totalArea,
    arableArea: farm.arableArea,
    vegetationArea: farm.vegetationArea,
    harvests: farm.harvests.map((h) => ({
      year: h.year,
      crops: [...h.crops],
    })),
    carNumber: farm.carNumber,
  };
}

export function toFarmApiPayload(
  farm: FarmAreasFormValues,
  crops: string[],
): FarmAreasFormValues {
  const year = farm.harvests?.[0]?.year?.trim() || '2025/2026';
  // Preserva safras extras além da primeira (o wizard edita apenas harvests[0]).
  const tail = (farm.harvests ?? []).slice(1);
  return {
    ...farm,
    carNumber: normalizeCarNumber(farm.carNumber),
    harvests: [
      {
        year,
        crops,
      },
      ...tail,
    ],
  };
}
