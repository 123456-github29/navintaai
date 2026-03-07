import { defineConfig } from "drizzle-kit";

// Prefer Supabase database if configured, otherwise fall back to Replit database
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("No database URL configured. Set SUPABASE_DATABASE_URL or DATABASE_URL.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
