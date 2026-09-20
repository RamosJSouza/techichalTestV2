import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Pino redact config', () => {
  it('redige document em body/query/resposta e admin token', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app.module.ts'),
      'utf8',
    );
    expect(source).toContain('req.body.document');
    expect(source).toContain('req.query.document');
    expect(source).toContain('res.body.document');
    expect(source).toContain("'*.document'");
    expect(source).toContain('req.headers["x-admin-token"]');
    expect(source).toContain('remove: true');
  });

  it('configura genReqId e requestId nos logs', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app.module.ts'),
      'utf8',
    );
    expect(source).toContain('genReqId');
    expect(source).toContain('requestId');
    expect(source).toContain('X-Request-Id');
  });
});
