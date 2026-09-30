PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS traffic_totals (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_visits INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO traffic_totals(id, total_visits, updated_at) VALUES(1, 0, 0);

CREATE TABLE IF NOT EXISTS traffic_daily (
  day TEXT PRIMARY KEY,
  visits INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS active_visitors (
  visitor_hash TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS active_visitors_last_seen_idx ON active_visitors(last_seen);

CREATE TABLE IF NOT EXISTS article_views (
  article_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('event','skill')),
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS article_views_popular_idx ON article_views(view_count DESC, last_viewed_at DESC);

CREATE TABLE IF NOT EXISTS article_view_dedup (
  article_key TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  view_day TEXT NOT NULL,
  viewed_at INTEGER NOT NULL,
  PRIMARY KEY(article_key, visitor_hash, view_day)
);
CREATE INDEX IF NOT EXISTS article_view_dedup_time_idx ON article_view_dedup(viewed_at);

CREATE TABLE IF NOT EXISTS feedback_messages (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','READ')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS feedback_messages_status_idx ON feedback_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_messages_visitor_idx ON feedback_messages(visitor_hash, created_at DESC);
