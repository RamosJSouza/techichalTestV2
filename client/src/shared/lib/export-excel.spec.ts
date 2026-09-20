jest.mock('xlsx', () => ({
  utils: {
    book_new: () => ({ SheetNames: [] as string[], Sheets: {} as Record<string, unknown> }),
    json_to_sheet: () => ({}),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

import * as XLSX from 'xlsx';
import { exportToExcel } from './export-excel';

describe('exportToExcel', () => {
  it('gera workbook e dispara writeFile', () => {
    exportToExcel(
      [{ name: 'KPIs', rows: [{ metric: 'fazendas', value: 12 }] }],
      'dashboard.xlsx',
    );
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      'dashboard.xlsx',
      { compression: true },
    );
  });
});
