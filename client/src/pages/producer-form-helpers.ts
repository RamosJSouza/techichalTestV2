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
): FarmAreasFormValues {
  return {
    ...farm,
    carNumber: normalizeCarNumber(farm.carNumber),
    harvests: (farm.harvests ?? []).map((harvest) => ({
      year: harvest.year.trim(),
      crops: [...harvest.crops],
    })),
  };
}

export function removedHarvestYears(
  loadedYears: readonly string[],
  harvests: ReadonlyArray<{ year: string }> | undefined,
): string[] {
  const visible = new Set(
    (harvests ?? [])
      .map((harvest) => harvest.year.trim())
      .filter((year) => year.length > 0),
  );
  const removed: string[] = [];
  for (const year of loadedYears) {
    const trimmed = year.trim();
    if (
      trimmed.length > 0 &&
      !visible.has(trimmed) &&
      !removed.includes(trimmed)
    ) {
      removed.push(trimmed);
    }
  }
  return removed;
}
