import { clampPage, pageRange, totalPages } from './Pagination';

describe('Pagination helpers', () => {
  it('calcula total de páginas', () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(20, 20)).toBe(1);
    expect(totalPages(21, 20)).toBe(2);
    expect(totalPages(100, 20)).toBe(5);
  });

  it('calcula intervalo exibido', () => {
    expect(pageRange(1, 20, 100)).toEqual({ from: 1, to: 20 });
    expect(pageRange(5, 20, 95)).toEqual({ from: 81, to: 95 });
    expect(pageRange(1, 20, 0)).toEqual({ from: 0, to: 0 });
  });

  it('faz clamp da página alvo', () => {
    expect(clampPage(3, 100, 20)).toBe(3);
    expect(clampPage(0, 100, 20)).toBe(1);
    expect(clampPage(-5, 100, 20)).toBe(1);
    expect(clampPage(99, 100, 20)).toBe(5);
    expect(clampPage(Number.NaN, 100, 20)).toBe(1);
    expect(clampPage(1.9, 100, 20)).toBe(1);
  });
});
