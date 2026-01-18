import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const isProd = process.env.NODE_ENV === "production";

const supabaseUrl = isProd 
  ? process.env.SUPABASE_PROD_URL 
  : process.env.SUPABASE_DEV_URL;

if (!supabaseUrl) {
  throw new Error(
    `Supabase URL must be set. Expected ${isProd ? 'SUPABASE_PROD_URL' : 'SUPABASE_DEV_URL'} to be configured.`,
  );
}

export const pool = new Pool({ 
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });
