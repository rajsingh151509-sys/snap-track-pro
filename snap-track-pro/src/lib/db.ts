import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  // Don't throw at import time during builds when env isn't injected; just warn.
  // Calls that actually use sql() will fail loudly.
  // eslint-disable-next-line no-console
  console.warn('[snap-track] DATABASE_URL is not set');
}

declare global {
  // eslint-disable-next-line no-var
  var __pg: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global.__pg ??
  postgres(process.env.DATABASE_URL ?? '', {
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? 'require' : undefined,
    prepare: false,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__pg = sql;
}
