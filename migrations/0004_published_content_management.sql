ALTER TABLE posts ADD COLUMN title_align TEXT NOT NULL DEFAULT 'justify'
  CHECK (title_align IN ('left','center','right','justify'));
ALTER TABLE posts ADD COLUMN summary_align TEXT NOT NULL DEFAULT 'justify'
  CHECK (summary_align IN ('left','center','right','justify'));

CREATE TABLE IF NOT EXISTS published_post_controls (
  type TEXT NOT NULL CHECK (type IN ('event','skill')),
  slug TEXT NOT NULL,
  display_order INTEGER,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0,1)),
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (type, slug)
);

CREATE INDEX IF NOT EXISTS published_post_controls_order_idx
  ON published_post_controls(type, hidden, display_order);

CREATE TABLE IF NOT EXISTS site_text_overrides (
  text_key TEXT PRIMARY KEY,
  text_value TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
