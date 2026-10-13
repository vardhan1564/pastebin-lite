import { Pool } from "pg";

// Cache the pool on globalThis so it is reused between requests
// (and is not re-created on every hot reload in development).
const g = globalThis;

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  return new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
  });
}

export function getPool() {
  if (!g._pgPool) g._pgPool = createPool();
  return g._pgPool;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS pastes (
  id          TEXT PRIMARY KEY,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NULL,
  max_views   INTEGER NULL CHECK (max_views IS NULL OR max_views >= 1),
  view_count  INTEGER NOT NULL DEFAULT 0
);
`;

// Creates the table on first use. Runs only once per server instance.
export function ensureSchema() {
  if (!g._schemaReady) {
    g._schemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((err) => {
        g._schemaReady = undefined; // allow retry on next request
        throw err;
      });
  }
  return g._schemaReady;
}