import { z } from "zod";

export const MAX_CONTENT_LENGTH = 1_000_000; // about 1 MB of text
const MAX_TTL_SECONDS = 10 * 365 * 24 * 60 * 60; // 10 years
const MAX_VIEWS_LIMIT = 1_000_000_000; // fits in a Postgres INTEGER

// Rules for the body of POST /api/pastes
export const createPasteSchema = z.object({
  content: z
    .string({ error: "content is required and must be a string" })
    .refine((s) => s.trim().length > 0, { error: "content must not be empty" })
    .refine((s) => s.length <= MAX_CONTENT_LENGTH, {
      error: `content must be at most ${MAX_CONTENT_LENGTH} characters`,
    }),
  ttl_seconds: z
    .number({ error: "ttl_seconds must be an integer" })
    .int({ error: "ttl_seconds must be an integer" })
    .min(1, { error: "ttl_seconds must be >= 1" })
    .max(MAX_TTL_SECONDS, { error: `ttl_seconds must be <= ${MAX_TTL_SECONDS}` })
    .nullish(), // optional: missing or null means "never expires by time"
  max_views: z
    .number({ error: "max_views must be an integer" })
    .int({ error: "max_views must be an integer" })
    .min(1, { error: "max_views must be >= 1" })
    .max(MAX_VIEWS_LIMIT, { error: `max_views must be <= ${MAX_VIEWS_LIMIT}` })
    .nullish(), // optional: missing or null means "unlimited views"
});

// Paste ids only contain letters, numbers, "_" and "-"
export function isValidId(id) {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id);
}