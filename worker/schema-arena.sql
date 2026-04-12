-- Arena battle system tables
-- To remove: DROP TABLE IF EXISTS battle_rounds; DROP TABLE IF EXISTS battle_records; DROP TABLE IF EXISTS battles;

CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_name TEXT UNIQUE NOT NULL,
  trump_stat TEXT NOT NULL,
  total_matches INTEGER NOT NULL DEFAULT 0,
  fought_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS battle_rounds (
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

CREATE TABLE IF NOT EXISTS battle_records (
  buddy_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_br_battle ON battle_rounds(battle_id);
CREATE INDEX IF NOT EXISTS idx_battles_fought ON battles(fought_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_wins ON battle_records(wins DESC);
