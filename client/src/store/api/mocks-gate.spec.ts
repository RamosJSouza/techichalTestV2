import { isViteMocksEnabled } from './mocks-gate';

describe('isViteMocksEnabled', () => {
  it('default / ausente → API real (false)', () => {
    expect(isViteMocksEnabled(undefined)).toBe(false);
    expect(isViteMocksEnabled('')).toBe(false);
    expect(isViteMocksEnabled('false')).toBe(false);
    expect(isViteMocksEnabled(false)).toBe(false);
  });

  it('só true literal ativa mocks', () => {
    expect(isViteMocksEnabled('true')).toBe(true);
  });
});
