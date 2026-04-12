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
  auth_token_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_buddies_rarity ON buddies(rarity);
CREATE INDEX IF NOT EXISTS idx_buddies_species ON buddies(species);
CREATE INDEX IF NOT EXISTS idx_buddies_submitted ON buddies(submitted_at DESC);

-- Migration for existing deployments (D1 ignores duplicate column adds via IF NOT EXISTS emulation):
-- Run manually once: ALTER TABLE buddies ADD COLUMN auth_token_hash TEXT;
