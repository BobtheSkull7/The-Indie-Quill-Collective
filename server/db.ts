import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const isProd = process.env.NODE_ENV === "production";

const supabaseUrl = isProd 
  ? process.env.SUPABASE_PROD_URL 
  : process.env.SUPABASE_DEV_URL;

if (!supabaseUrl) {
  const expectedVar = isProd ? 'SUPABASE_PROD_URL' : 'SUPABASE_DEV_URL';
  console.error(`FATAL: Supabase URL must be set. Expected ${expectedVar} to be configured.`);
  console.error(`Current NODE_ENV: ${process.env.NODE_ENV}`);
  console.error(`Available env vars: ${Object.keys(process.env).filter(k => k.includes('SUPA') || k.includes('DATA')).join(', ') || 'none matching SUPA/DATA'}`);
  throw new Error(
    `Supabase URL must be set. Expected ${expectedVar} to be configured.`,
  );
}

export const pool = new Pool({ 
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });
