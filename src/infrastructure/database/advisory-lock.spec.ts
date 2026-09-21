import { withSessionAdvisoryLock } from './advisory-lock.js';

describe('withSessionAdvisoryLock', () => {
  it('libera a conexão reservada mesmo quando o callback falha', async () => {
    const calls: string[] = [];
    let unlocked = false;
    let released = false;

    const reserved = Object.assign(
      async (strings: TemplateStringsArray) => {
        const q = strings.join('');
        if (q.includes('pg_try_advisory_lock')) {
          calls.push('lock');
          return [{ ok: true }];
        }
        if (q.includes('pg_advisory_unlock')) {
          unlocked = true;
          calls.push('unlock');
          return [{ ok: true }];
        }
        return [];
      },
      {
        release: () => {
          released = true;
          calls.push('release');
        },
      },
    );

    const sql = {
      reserve: async () => reserved,
    } as unknown as Parameters<typeof withSessionAdvisoryLock>[0];

    await expect(
      withSessionAdvisoryLock(sql, 'k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(unlocked).toBe(true);
    expect(released).toBe(true);
    expect(calls).toEqual(['lock', 'unlock', 'release']);
  });

  it('retorna claimed=false sem executar o callback', async () => {
    let fnCalled = false;
    let released = false;
    const reserved = Object.assign(
      async () => [{ ok: false }],
      {
        release: () => {
          released = true;
        },
      },
    );
    const sql = {
      reserve: async () => reserved,
    } as unknown as Parameters<typeof withSessionAdvisoryLock>[0];

    const outcome = await withSessionAdvisoryLock(sql, 'k', async () => {
      fnCalled = true;
      return 1;
    });

    expect(outcome).toEqual({ claimed: false });
    expect(fnCalled).toBe(false);
    expect(released).toBe(true);
  });
});
