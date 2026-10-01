PRAGMA foreign_keys = ON;

-- Khôi phục 4.155 lượt đã được GoatCounter ghi nhận trước khi website chuyển
-- sang bộ đếm D1 nội bộ. Migration chỉ chạy một lần nên các lượt D1 hiện có
-- vẫn được giữ nguyên và tiếp tục tăng từ tổng mới.
UPDATE traffic_totals
SET total_visits = total_visits + 4155,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 1;

CREATE TABLE IF NOT EXISTS site_banner_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  interval_ms INTEGER NOT NULL DEFAULT 4000 CHECK (interval_ms BETWEEN 2000 AND 20000),
  updated_by TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO site_banner_settings(id, interval_ms, updated_at)
VALUES(1, 4000, 0);

CREATE TABLE IF NOT EXISTS site_banner_images (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  storage_key TEXT UNIQUE,
  caption TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS site_banner_images_order_idx
ON site_banner_images(sort_order, created_at);

INSERT OR IGNORE INTO site_banner_images(id, path, storage_key, caption, sort_order, created_at, updated_at) VALUES
  ('legacy-banner-01', '/uploads/banner-01.jpg', NULL, '', 10, 0, 0),
  ('legacy-banner-02', '/uploads/banner-02.jpg', NULL, '', 20, 0, 0),
  ('legacy-banner-03', '/uploads/banner-03.jpg', NULL, '', 30, 0, 0),
  ('legacy-banner-04', '/uploads/banner-04.jpg', NULL, '', 40, 0, 0),
  ('legacy-banner-05', '/uploads/banner-05.jpg', NULL, '', 50, 0, 0),
  ('legacy-banner-06', '/uploads/banner-06.jpg', NULL, '', 60, 0, 0),
  ('legacy-banner-07', '/uploads/banner-07.jpg', NULL, '', 70, 0, 0),
  ('legacy-banner-08', '/uploads/banner-08.jpg', NULL, '', 80, 0, 0),
  ('legacy-banner-09', '/uploads/banner-09.jpg', NULL, '', 90, 0, 0),
  ('legacy-banner-10', '/uploads/banner-10.jpg', NULL, '', 100, 0, 0),
  ('legacy-banner-11', '/uploads/banner-11.jpg', NULL, '', 110, 0, 0),
  ('legacy-banner-12', '/uploads/banner-12.jpg', NULL, '', 120, 0, 0),
  ('legacy-banner-13', '/uploads/banner-13.jpg', NULL, '', 130, 0, 0),
  ('legacy-banner-14', '/uploads/banner-14.jpg', NULL, '', 140, 0, 0),
  ('legacy-banner-15', '/uploads/banner-15.jpg', NULL, '', 150, 0, 0);
