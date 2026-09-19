import { FarmArea } from './farm-area.js';
import { InvalidFarmAreaException } from '../exceptions/invalid-farm-area.exception.js';

describe('FarmArea', () => {
  it('cria área válida quando a soma cabe no total', () => {
    const area = FarmArea.create(1000, 600, 350);
    expect(area.totalArea).toBe(1000);
    expect(area.arableArea).toBe(600);
    expect(area.vegetationArea).toBe(350);
  });

  it('aceita soma exatamente igual ao total', () => {
    expect(() => FarmArea.create(100, 60, 40)).not.toThrow();
  });

  it('rejeita total menor ou igual a zero', () => {
    expect(() => FarmArea.create(0, 0, 0)).toThrow(InvalidFarmAreaException);
  });

  it('rejeita áreas negativas', () => {
    expect(() => FarmArea.create(100, -1, 10)).toThrow(InvalidFarmAreaException);
  });

  it('rejeita soma que excede o total', () => {
    expect(() => FarmArea.create(100, 60, 50)).toThrow(InvalidFarmAreaException);
  });
});
