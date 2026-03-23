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

-- Funnel and attribution events
CREATE TABLE IF NOT EXISTS funnel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  page TEXT,
  base_slug TEXT,
  variant_slug TEXT,
  category TEXT,
  source TEXT,
  cta_variant TEXT,
  email_segment TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fe_event_type ON funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fe_page ON funnel_events(page);
CREATE INDEX IF NOT EXISTS idx_fe_base_slug ON funnel_events(base_slug);
CREATE INDEX IF NOT EXISTS idx_fe_variant_slug ON funnel_events(variant_slug);
CREATE INDEX IF NOT EXISTS idx_fe_created_at ON funnel_events(created_at);

-- Global article/recipe ratings
CREATE TABLE IF NOT EXISTS article_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  user_key TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(slug, user_key)
);

CREATE INDEX IF NOT EXISTS idx_ar_slug ON article_ratings(slug);
CREATE INDEX IF NOT EXISTS idx_ar_updated_at ON article_ratings(updated_at);
