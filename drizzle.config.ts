import { defineConfig } from "drizzle-kit";

// Use Supabase for development, DATABASE_URL (Neon) for production
const dbUrl = process.env.NODE_ENV === "production" 
  ? process.env.DATABASE_URL 
  : process.env.SUPABASE_DEV_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("Database URL must be set (SUPABASE_DEV_URL for dev, DATABASE_URL for production)");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
