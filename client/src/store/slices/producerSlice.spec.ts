import { setFilter, producerReducer } from './producerSlice';

describe('producerSlice', () => {
  it('atualiza filtro', () => {
    const next = producerReducer(undefined, setFilter('cnpj'));
    expect(next.filter).toBe('cnpj');
  });
});
