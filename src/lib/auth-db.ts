import { Pool } from "@neondatabase/serverless";

type AuthDatabase = Pool;

let cached: AuthDatabase | null = null;

export function getNeonConnectionString() {
  return (
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    null
  );
}

export function createAuthDatabase() {
  const connectionString = getNeonConnectionString();

  if (!connectionString) {
    return null;
  }

  return new Pool({ connectionString });
}

export function getAuthDatabase() {
  if (!getNeonConnectionString()) {
    return null;
  }

  cached ??= createAuthDatabase();
  return cached;
}