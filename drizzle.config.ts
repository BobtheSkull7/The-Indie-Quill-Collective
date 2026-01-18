import { defineConfig } from "drizzle-kit";

const isProd = process.env.NODE_ENV === "production";

const dbUrl = isProd 
  ? process.env.SUPABASE_PROD_URL 
  : process.env.SUPABASE_DEV_URL;

if (!dbUrl) {
  throw new Error(`Supabase URL must be set. Expected ${isProd ? 'SUPABASE_PROD_URL' : 'SUPABASE_DEV_URL'}`);
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
