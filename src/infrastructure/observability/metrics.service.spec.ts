import { MetricsService } from './metrics.service.js';

describe('MetricsService cardinality', () => {
  it('mapeia domain error desconhecido para other', async () => {
    const metrics = new MetricsService();
    metrics.recordDomainError('evil_uuid_or_document');
    const body = await metrics.scrape();
    expect(body).toMatch(/domain_errors_total\{code="other"\}/);
    expect(body).not.toMatch(/evil_uuid/);
  });

  it('ignora client timing fora da allowlist', () => {
    const metrics = new MetricsService();
    expect(metrics.recordClientTiming('not_allowed', 1)).toBe(false);
    expect(metrics.recordClientTiming('dashboard_csv_export', 0.5)).toBe(true);
  });

  it('normaliza labels do job PENDING', async () => {
    const metrics = new MetricsService();
    metrics.recordPendingRevalidateRun('disabled');
    metrics.recordPendingRevalidateRun('weird');
    metrics.recordPendingRevalidateItem('producer', 'ok');
    metrics.recordPendingRevalidateItem('unknown', 'boom');
    const body = await metrics.scrape();
    expect(body).toMatch(
      /pending_revalidate_runs_total\{result="disabled"\}/,
    );
    expect(body).toMatch(/pending_revalidate_runs_total\{result="error"\}/);
    expect(body).toMatch(
      /pending_revalidate_items_total\{resource="producer",result="ok"\}/,
    );
    expect(body).toMatch(
      /pending_revalidate_items_total\{resource="producer",result="error"\}/,
    );
    expect(body).not.toMatch(/resource="unknown"/);
  });

  it('recordHttp usa method OTHER fora da allowlist', async () => {
    const metrics = new MetricsService();
    metrics.recordHttp('TRACE', '/api/v1/health/live', 200, 0.01);
    const body = await metrics.scrape();
    expect(body).toMatch(/method="OTHER"/);
    expect(body).not.toMatch(/method="TRACE"/);
  });
});
