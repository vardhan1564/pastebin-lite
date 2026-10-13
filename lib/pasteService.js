import { customAlphabet } from "nanoid";
import { ensureSchema, getPool } from "./db";

// 10 random characters from 62 possible = short, URL-safe, impossible to guess
const newId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);

// Saves a new paste. "now" comes from lib/clock.js.
export async function createPaste(input, now) {
  await ensureSchema();

  const expiresAt = input.ttl_seconds
    ? new Date(now.getTime() + input.ttl_seconds * 1000)
    : null;
  const maxViews = input.max_views ?? null;

  // Try again if the random id already exists (extremely unlikely)
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newId();
    const res = await getPool().query(
      `INSERT INTO pastes (id, content, created_at, expires_at, max_views)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [id, input.content, now, expiresAt, maxViews]
    );
    if (res.rowCount === 1) {
      return {
        id,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        max_views: maxViews,
      };
    }
  }
  throw new Error("Could not generate a unique paste id");
}

// Fetches a paste AND counts one view, in ONE atomic SQL statement.
//
// Why one statement? If we did "SELECT, check in JavaScript, then UPDATE",
// two people opening the paste at the same moment could both see
// "1 view left" and both get it. With a single UPDATE ... WHERE,
// Postgres locks the row and re-checks the conditions, so a paste with
// max_views = N is shown exactly N times, even under heavy traffic.
//
// Returns null if the paste doesn't exist, has expired, or has no views left.
export async function getAndConsumePaste(id, now) {
  await ensureSchema();

  const res = await getPool().query(
    `UPDATE pastes
        SET view_count = view_count + 1
      WHERE id = $1
        AND (expires_at IS NULL OR expires_at > $2)
        AND (max_views IS NULL OR view_count < max_views)
      RETURNING content, expires_at, max_views, view_count`,
    [id, now]
  );

  if (res.rowCount === 0) return null;

  const row = res.rows[0];
  return {
    content: row.content,
    remaining_views:
      row.max_views === null ? null : Math.max(0, row.max_views - row.view_count),
    expires_at: row.expires_at ? row.expires_at.toISOString() : null,
  };
}

// Simple database check for the health endpoint
export async function pingDatabase() {
  await ensureSchema();
  await getPool().query("SELECT 1");
}