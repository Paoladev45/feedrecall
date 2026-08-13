export const schema = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  source_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  author TEXT NOT NULL,
  published_at TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  external_links TEXT NOT NULL,
  media TEXT NOT NULL,
  topics TEXT NOT NULL,
  priority INTEGER NOT NULL,
  processing_status TEXT NOT NULL,
  evidence_status TEXT NOT NULL,
  confidence REAL NOT NULL,
  decision_status TEXT NOT NULL,
  decision_reason TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  UNIQUE(platform, source_type, external_id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  memory_id UNINDEXED,
  title,
  body,
  author,
  topics,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE IF NOT EXISTS memory_knowledge (
  memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  possible_uses TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  goals TEXT NOT NULL,
  technologies TEXT NOT NULL,
  repositories TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relevance (
  memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  score REAL NOT NULL,
  reasons TEXT NOT NULL,
  PRIMARY KEY(memory_id, project_slug)
);

CREATE TABLE IF NOT EXISTS lifecycle_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connector TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  inserted_count INTEGER NOT NULL,
  updated_count INTEGER NOT NULL,
  unchanged_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0
);
`
