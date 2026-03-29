// src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
 
// Uses the direct Supabase connection string (not the pooler).
// The pooler (port 6543) is for short-lived serverless queries.
// The direct connection (port 5432) is required for transactions and migrations.
// In Vercel serverless functions, use the pooler URL via SUPABASE_DB_URL_POOLER
// for read-heavy endpoints if needed — but the Master Transaction always uses direct.
const connectionString = process.env.DATABASE_URL;
 
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}
 
const client = postgres(connectionString, {
  // Limits concurrent connections in serverless environment.
  max: 1,
  // Disables prefetch — required for transaction support in serverless.
  prepare: false,
});
 
export const db = drizzle(client, { schema });
 