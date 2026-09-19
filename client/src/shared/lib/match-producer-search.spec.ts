import {
  filterProducersBySearch,
  matchesProducerSearch,
} from './match-producer-search';
import { mockProducers } from '../mocks/fixtures';
import type { ProducerResponse } from '../types/api';

const sample: ProducerResponse = mockProducers[0]!;

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

  it('bate por cultura da safra', () => {
    expect(matchesProducerSearch(sample, 'soja')).toBe(true);
    expect(matchesProducerSearch(sample, 'algodão')).toBe(false);
  });

  it('bate por cidade e nome da fazenda', () => {
    expect(matchesProducerSearch(sample, 'ribeirão')).toBe(true);
    expect(matchesProducerSearch(sample, 'santa maria')).toBe(true);
  });

  it('bate por dígitos do documento mascarado', () => {
    expect(matchesProducerSearch(sample, '982')).toBe(true);
    expect(matchesProducerSearch(sample, '000')).toBe(false);
  });

  it('filterProducersBySearch filtra a lista', () => {
    const result = filterProducersBySearch(mockProducers, 'milho');
    expect(result).toHaveLength(1);
    expect(filterProducersBySearch(mockProducers, 'inexistente')).toHaveLength(
      0,
    );
  });
});
