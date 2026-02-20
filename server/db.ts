import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const isProd = process.env.NODE_ENV === "production";

const rawUrl = isProd 
  ? process.env.SUPABASE_PROD_URL 
  : process.env.SUPABASE_DEV_URL;

if (!rawUrl) {
  const expectedVar = isProd ? 'SUPABASE_PROD_URL' : 'SUPABASE_DEV_URL';
  console.error(`FATAL: Supabase URL must be set. Expected ${expectedVar} to be configured.`);
  console.error(`Current NODE_ENV: ${process.env.NODE_ENV}`);
  console.error(`Available env vars: ${Object.keys(process.env).filter(k => k.includes('SUPA') || k.includes('DATA')).join(', ') || 'none matching SUPA/DATA'}`);
  throw new Error(
    `Supabase URL must be set. Expected ${expectedVar} to be configured.`,
  );
}

function encodePasswordInUrl(url: string): string {
  const match = url.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
  if (!match) return url;
  const [_, prefix, password, suffix] = match;
  return prefix + encodeURIComponent(password) + suffix;
}

const supabaseUrl = encodePasswordInUrl(rawUrl);

const dbHost = supabaseUrl.match(/@([^:/]+)/)?.[1] || "unknown";
const maskedHost = dbHost.length > 10 ? dbHost.slice(0, 6) + "..." + dbHost.slice(-8) : dbHost;
const dbUser = supabaseUrl.match(/\/\/([^:]+):/)?.[1] || "unknown";
console.log(`[DB] Mode: ${isProd ? "PRODUCTION (SUPABASE_PROD_URL)" : "DEVELOPMENT (SUPABASE_DEV_URL)"}, Host: ${maskedHost}, User: ${dbUser}`);

export const pool = new Pool({ 
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.query('SELECT 1')
  .then(() => console.log('[DB] Connection test: SUCCESS'))
  .catch((e: Error) => console.error('[DB] Connection test FAILED:', e.message));

export const db = drizzle(pool, { schema });
