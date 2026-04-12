-- v2 auth cutover: full schema refresh for buddies + arena.
--
-- v1 auth was derived from the Claude account UUID with a hardcoded salt in
-- the published npm package, making tokens trivially forgeable. v2 uses a
-- per-user random secret stored in a CLI sidecar, with user_hash bound to the
-- secret via a proof-of-knowledge check on submit. See plan in
-- /Users/andreibaloleanu/.claude/plans/compiled-whistling-umbrella.md
--
-- This migration drops and recreates every table. It's destructive by design
-- (hard cutover) and also bootstraps arena tables that were never applied on
-- prod via migrations.

DROP TABLE IF EXISTS battle_rounds;
DROP TABLE IF EXISTS battle_records;
DROP TABLE IF EXISTS battles;
DROP TABLE IF EXISTS buddies;

CREATE TABLE buddies (
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
  stats TEXT NOT NULL,
  hatched_at TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  auth_token_hmac TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_buddies_rarity ON buddies(rarity);
CREATE INDEX idx_buddies_species ON buddies(species);
CREATE INDEX idx_buddies_submitted ON buddies(submitted_at DESC);
CREATE INDEX idx_buddies_user_hash ON buddies(user_hash);

CREATE TABLE battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_name TEXT UNIQUE NOT NULL,
  trump_stat TEXT NOT NULL,
  total_matches INTEGER NOT NULL DEFAULT 0,
  fought_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE battle_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id INTEGER NOT NULL REFERENCES battles(id),
  buddy_a TEXT NOT NULL,
  buddy_b TEXT NOT NULL,
  name_a TEXT NOT NULL,
  name_b TEXT NOT NULL,
  stat_a INTEGER NOT NULL,
  stat_b INTEGER NOT NULL,
  winner TEXT NOT NULL
);

CREATE TABLE battle_records (
  buddy_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_br_battle ON battle_rounds(battle_id);
CREATE INDEX idx_battles_fought ON battles(fought_at DESC);
CREATE INDEX idx_records_wins ON battle_records(wins DESC);
