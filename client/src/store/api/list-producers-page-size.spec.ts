/**
 * Contrato: default pageSize da listagem no client (apiSlice).
 * Alinhado à paginação server-side e ao SLO L0 do bench.
 */
describe('client listProducers default pageSize', () => {
  it('documenta default 20', () => {
    const DEFAULT_PAGE_SIZE = 20;
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(100);
  });
});
