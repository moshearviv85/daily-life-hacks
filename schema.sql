CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'unknown',
  page TEXT,
  referrer TEXT,
  status TEXT DEFAULT 'success',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created ON subscriptions(created_at);

-- Pinterest Smart Routing analytics
CREATE TABLE IF NOT EXISTS pinterest_hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  versioned_slug TEXT NOT NULL,
  base_slug TEXT NOT NULL,
  route_type TEXT NOT NULL DEFAULT 'internal',
  version TEXT,
  query_params TEXT,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ph_versioned_slug ON pinterest_hits(versioned_slug);
CREATE INDEX IF NOT EXISTS idx_ph_base_slug ON pinterest_hits(base_slug);
CREATE INDEX IF NOT EXISTS idx_ph_created_at ON pinterest_hits(created_at);
CREATE INDEX IF NOT EXISTS idx_ph_route_type ON pinterest_hits(route_type);
