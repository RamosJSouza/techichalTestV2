import type { ProducerListItem } from '../types/api';

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

function buildProducerSearchBlob(producer: ProducerListItem): string {
  return [
    producer.name,
    producer.document,
    producer.esgStatus,
    ...producer.farmStates,
    String(producer.farmsCount),
    String(producer.totalAreaHa),
  ].join(' ');
}

function matchesDocumentDigits(
  producer: ProducerListItem,
  query: string,
): boolean {
  const needle = digitsOnly(query);
  if (needle.length === 0) {
    return false;
  }
  return digitsOnly(producer.document).includes(needle);
}

export function matchesProducerSearch(
  producer: ProducerListItem,
  query: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }

  if (
    /^\d+$/.test(digitsOnly(trimmed)) &&
    digitsOnly(trimmed) === trimmed.replace(/\s/g, '')
  ) {
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
  producers: ProducerListItem[],
  query: string,
): ProducerListItem[] {
  return producers.filter((p) => matchesProducerSearch(p, query));
}
