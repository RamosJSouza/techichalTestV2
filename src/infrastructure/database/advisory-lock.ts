import type postgres from 'postgres';

export type PostgresSql = ReturnType<typeof postgres>;

function isPgBoolTrue(value: unknown): boolean {
  return value === true || value === 't' || value === 1;
}

/**
 * Advisory lock de **sessão** com conexão reservada do pool (`sql.reserve()`).
 * Lock e unlock usam a mesma sessão — seguro com pool > 1.
 * O callback pode usar outras conexões Drizzle; a exclusão é só o advisory.
 * Crash da conexão libera o lock no Postgres.
 */
export async function withSessionAdvisoryLock<T>(
  sql: PostgresSql,
  key: string,
  fn: () => Promise<T>,
): Promise<{ claimed: true; value: T } | { claimed: false }> {
  const reserved = await sql.reserve();
  try {
    const rows = await reserved`
      SELECT pg_try_advisory_lock(hashtextextended(${key}, 0)) AS ok
    `;
    const locked = isPgBoolTrue(rows[0]?.ok);
    if (!locked) {
      return { claimed: false };
    }
    try {
      const value = await fn();
      return { claimed: true, value };
    } finally {
      await reserved`
        SELECT pg_advisory_unlock(hashtextextended(${key}, 0))
      `;
    }
  } finally {
    reserved.release();
  }
}
