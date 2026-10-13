CREATE TABLE IF NOT EXISTS pastes (
  id          TEXT PRIMARY KEY,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NULL,                                          -- NULL = never expires by time
  max_views   INTEGER NULL CHECK (max_views IS NULL OR max_views >= 1),  -- NULL = unlimited
  view_count  INTEGER NOT NULL DEFAULT 0
);