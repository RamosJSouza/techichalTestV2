import { CarNumber } from './car-number.js';

describe('CarNumber', () => {
  it('aceita formato válido', () => {
    const car = CarNumber.create(
      'SP-3550308-E9D8C7B6A5F4E3D2C1B0A9F8E7D6C5B4',
    );
    expect(car.value).toBe('SP-3550308-E9D8C7B6A5F4E3D2C1B0A9F8E7D6C5B4');
  });

  it('rejeita formato inválido', () => {
    expect(() => CarNumber.create('INVALID')).toThrow(/CAR inválido/);
  });
});
