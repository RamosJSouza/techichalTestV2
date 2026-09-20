import { exportToCsv } from './export-csv';

describe('exportToCsv', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => 'blob:mock');
    URL.revokeObjectURL = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  it('dispara download de CSV com células escapadas', () => {
    const click = jest.fn();
    const createElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = createElement(tag);
      if (tag === 'a') {
        el.click = click;
      }
      return el;
    });

    exportToCsv(
      [{ name: 'KPIs', rows: [{ metric: 'fazendas', value: '12,5' }] }],
      'dashboard-analitico.csv',
    );

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    const blob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
  });

  it('reporta timing allowlisted sem PII (fire-and-forget)', () => {
    const click = jest.fn();
    const createElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = createElement(tag);
      if (tag === 'a') {
        el.click = click;
      }
      return el;
    });

    exportToCsv(
      [{ name: 'KPIs', rows: [{ metric: 'total', value: 1 }] }],
      'dashboard-analitico',
    );

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/observability/client-timings',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
      }),
    );
    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string,
    ) as { event: string; durationSeconds: number };
    expect(body.event).toBe('dashboard_csv_export');
    expect(body.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(body).not.toHaveProperty('email');
    expect(body).not.toHaveProperty('document');
  });
});
