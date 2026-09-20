import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Pino redact config', () => {
  it('redige document em body/query/resposta', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app.module.ts'),
      'utf8',
    );
    expect(source).toContain('req.body.document');
    expect(source).toContain('req.query.document');
    expect(source).toContain('res.body.document');
    expect(source).toContain("'*.document'");
    expect(source).toContain('remove: true');
  });
});
