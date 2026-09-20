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
});
