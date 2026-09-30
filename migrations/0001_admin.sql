PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','author','approver')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0,1)),
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_username_idx ON sessions(username);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  identity TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  window_started_at INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('event','skill')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  publish_date TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'timeline',
  category TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  series TEXT NOT NULL DEFAULT '',
  sort_order INTEGER,
  body_blocks_json TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  author_username TEXT NOT NULL REFERENCES users(username),
  author_name TEXT NOT NULL,
  images_json TEXT NOT NULL,
  reference_link TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','REVIEW','APPROVED','PUBLISHED')),
  reviewed_by TEXT,
  reviewed_username TEXT,
  reviewed_at INTEGER,
  approved_by TEXT,
  approved_username TEXT,
  approved_at INTEGER,
  published_by TEXT,
  published_username TEXT,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revision_history_json TEXT NOT NULL,
  UNIQUE(type, slug)
);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status, updated_at);
CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_username, status, updated_at);
CREATE INDEX IF NOT EXISTS posts_public_idx ON posts(status, type, publish_date);
CREATE UNIQUE INDEX IF NOT EXISTS posts_one_pending_idx ON posts((1)) WHERE status <> 'PUBLISHED';
