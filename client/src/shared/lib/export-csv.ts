interface CsvSheet {
  name: string;
  rows: Record<string, unknown>[];
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function sheetToCsv(sheet: CsvSheet): string {
  if (sheet.rows.length === 0) {
    return `${escapeCsvCell(sheet.name)}\n`;
  }
  const headers = Object.keys(sheet.rows[0] ?? {});
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...sheet.rows.map((row) =>
      headers.map((key) => escapeCsvCell(row[key])).join(','),
    ),
  ];
  return lines.join('\n');
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function reportClientTiming(durationSeconds: number): void {
  const body = JSON.stringify({
    event: 'dashboard_csv_export',
    durationSeconds,
  });
  void fetch('/api/v1/observability/client-timings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    /* fire-and-forget */
  });
}

/** Exporta uma ou mais abas como arquivos CSV (um arquivo por aba). */
export function exportToCsv(sheets: CsvSheet[], basename: string): void {
  const started = performance.now();
  const safeBase = basename.replace(/\.csv$/i, '').replace(/\.xlsx$/i, '');
  for (const sheet of sheets) {
    const safeName = sheet.name.replace(/[^\w-]+/g, '_').slice(0, 40) || 'sheet';
    const filename =
      sheets.length === 1
        ? `${safeBase}.csv`
        : `${safeBase}-${safeName}.csv`;
    downloadBlob(sheetToCsv(sheet), filename, 'text/csv;charset=utf-8');
  }
  const durationSeconds = (performance.now() - started) / 1000;
  reportClientTiming(durationSeconds);
}
