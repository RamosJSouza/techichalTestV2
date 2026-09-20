import { clientTimingSchema } from './observability.schemas.js';

describe('clientTimingSchema', () => {
  it('aceita evento allowlisted', () => {
    expect(
      clientTimingSchema.parse({
        event: 'dashboard_csv_export',
        durationSeconds: 0.12,
      }),
    ).toEqual({
      event: 'dashboard_csv_export',
      durationSeconds: 0.12,
    });
  });

  it('rejeita evento desconhecido', () => {
    expect(() =>
      clientTimingSchema.parse({
        event: 'unknown_event',
        durationSeconds: 0.1,
      }),
    ).toThrow();
  });
});
