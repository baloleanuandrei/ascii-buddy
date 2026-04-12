CREATE TABLE IF NOT EXISTS buddies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buddy_id TEXT UNIQUE NOT NULL,
  user_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  personality TEXT,
  species TEXT NOT NULL,
  rarity TEXT NOT NULL,
  eye TEXT NOT NULL,
  hat TEXT NOT NULL,
  shiny INTEGER NOT NULL DEFAULT 0,
  stats TEXT NOT NULL, -- JSON
  hatched_at TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  auth_token_hmac TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_buddies_rarity ON buddies(rarity);
CREATE INDEX IF NOT EXISTS idx_buddies_species ON buddies(species);
CREATE INDEX IF NOT EXISTS idx_buddies_submitted ON buddies(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_buddies_user_hash ON buddies(user_hash);

-- auth_token_hmac is HMAC-SHA256(AUTH_PEPPER, bearer_token).
-- AUTH_PEPPER is a Wrangler secret — set via `wrangler secret put AUTH_PEPPER`.
-- See worker/migrations/0002_v2_auth_cutover.sql for the cutover from v1.
