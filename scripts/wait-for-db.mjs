import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const maxAttempts = 30;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const sql = postgres(databaseUrl, { max: 1, connect_timeout: 3 });
    await sql`select 1`;
    await sql.end({ timeout: 1 });
    process.exit(0);
  } catch {
    if (attempt === maxAttempts) {
      console.error('PostgreSQL is not ready after 60s');
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
