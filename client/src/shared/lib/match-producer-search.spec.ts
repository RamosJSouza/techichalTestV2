import {
  filterProducersBySearch,
  matchesProducerSearch,
} from './match-producer-search';
import { mockProducers } from '../mocks/fixtures';
import {
  producerResponseToListItem,
  type ProducerListItem,
} from '../types/api';

const sample: ProducerListItem = producerResponseToListItem(mockProducers[0]!);
const listItems = mockProducers.map(producerResponseToListItem);

describe('matchesProducerSearch', () => {
  it('query vazia retorna true (match all)', () => {
    expect(matchesProducerSearch(sample, '')).toBe(true);
    expect(matchesProducerSearch(sample, '   ')).toBe(true);
  });

  it('bate por nome (case/acento-insensitive)', () => {
    expect(matchesProducerSearch(sample, 'joão')).toBe(true);
    expect(matchesProducerSearch(sample, 'JOAO')).toBe(true);
    expect(matchesProducerSearch(sample, 'xyz')).toBe(false);
  });

  it('bate por UF da fazenda', () => {
    expect(matchesProducerSearch(sample, 'SP')).toBe(true);
    expect(matchesProducerSearch(sample, 'MT')).toBe(false);
  });

  it('não busca mais por cultura (summary sem crops)', () => {
    expect(matchesProducerSearch(sample, 'soja')).toBe(false);
  });

  it('bate por dígitos do documento mascarado', () => {
    expect(matchesProducerSearch(sample, '982')).toBe(true);
    expect(matchesProducerSearch(sample, '000')).toBe(false);
  });

  it('filterProducersBySearch filtra a lista', () => {
    const result = filterProducersBySearch(listItems, 'joão');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(filterProducersBySearch(listItems, 'inexistente')).toHaveLength(0);
  });
});
