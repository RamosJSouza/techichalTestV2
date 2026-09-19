import type { ProducerResponse } from '../types/api';

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function buildProducerSearchBlob(producer: ProducerResponse): string {
  const parts: string[] = [
    producer.name,
    producer.document,
    producer.esgStatus,
  ];

  for (const farm of producer.farms) {
    parts.push(
      farm.name,
      farm.city,
      farm.state,
      farm.carNumber ?? '',
      String(farm.totalArea),
      String(farm.arableArea),
      String(farm.vegetationArea),
    );
    for (const harvest of farm.harvests) {
      parts.push(harvest.year, harvest.status, ...harvest.crops);
    }
  }

  return parts.join(' ');
}

function matchesDocumentDigits(
  producer: ProducerResponse,
  query: string,
): boolean {
  const needle = digitsOnly(query);
  if (needle.length === 0) {
    return false;
  }
  const docDigits = digitsOnly(producer.document);
  if (docDigits.includes(needle)) {
    return true;
  }
  return producer.farms.some((farm) =>
    digitsOnly(farm.carNumber ?? '').includes(needle),
  );
}

export function matchesProducerSearch(
  producer: ProducerResponse,
  query: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }

  // Query só com dígitos → apenas documento/CAR (evita falso positivo em "1000" etc.)
  if (/^\d+$/.test(digitsOnly(trimmed)) && digitsOnly(trimmed) === trimmed.replace(/\s/g, '')) {
    return matchesDocumentDigits(producer, trimmed);
  }

  const needle = normalizeSearchText(trimmed);
  const haystack = normalizeSearchText(buildProducerSearchBlob(producer));
  if (haystack.includes(needle)) {
    return true;
  }

  return matchesDocumentDigits(producer, trimmed);
}

export function filterProducersBySearch(
  producers: ProducerResponse[],
  query: string,
): ProducerResponse[] {
  return producers.filter((p) => matchesProducerSearch(p, query));
}
