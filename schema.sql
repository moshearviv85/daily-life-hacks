CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'unknown',
  page TEXT,
  referrer TEXT,
  status TEXT DEFAULT 'success',
  kit_subscriber_id TEXT,
  kit_response TEXT,
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

-- Agent scan audit log
CREATE TABLE IF NOT EXISTS agent_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  scan_type TEXT DEFAULT 'general',
  notes TEXT,
  issues_found INTEGER DEFAULT 0,
  issues_fixed INTEGER DEFAULT 0,
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_as_scanned_at ON agent_scans(scanned_at);

-- Clarity API response cache (single-row, updated on each fetch)
CREATE TABLE IF NOT EXISTS clarity_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pinterest auto-poster schedule
CREATE TABLE IF NOT EXISTS pins_schedule (
  row_id TEXT PRIMARY KEY,
  pin_title TEXT NOT NULL,
  pin_description TEXT,
  alt_text TEXT,
  image_url TEXT,
  board_id TEXT,
  link TEXT,
  scheduled_date TEXT,
  scheduled_time TEXT,
  status TEXT DEFAULT 'PENDING',
  pin_id TEXT,
  published_date TEXT,
  pinterest_response TEXT,
  fail_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ps_status ON pins_schedule(status);
CREATE INDEX IF NOT EXISTS idx_ps_scheduled_date ON pins_schedule(scheduled_date);

-- Staging-only Pinterest queue used by Cloudflare Pages Preview deployments.
-- This mirrors pins_schedule but is never read by the production auto-poster.
CREATE TABLE IF NOT EXISTS staging_pins_schedule (
  row_id TEXT PRIMARY KEY,
  pin_title TEXT NOT NULL,
  pin_description TEXT,
  alt_text TEXT,
  image_url TEXT,
  board_id TEXT,
  link TEXT,
  scheduled_date TEXT,
  scheduled_time TEXT,
  status TEXT DEFAULT 'PENDING',
  pin_id TEXT,
  published_date TEXT,
  pinterest_response TEXT,
  fail_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sps_status ON staging_pins_schedule(status);
CREATE INDEX IF NOT EXISTS idx_sps_scheduled_date ON staging_pins_schedule(scheduled_date);

-- Content pipeline: articles uploaded via CSV, published daily by GitHub Actions
CREATE TABLE IF NOT EXISTS articles_schedule (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  markdown_content TEXT NOT NULL,
  image_filename TEXT,
  publish_at TEXT,
  row_num INTEGER DEFAULT 0,      -- original CSV row order (preserves publish sequence)
  status TEXT DEFAULT 'PENDING',  -- PENDING, PUBLISHED, DUPLICATE
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
-- The table is also auto-created by articles-upload.js on first upload.
-- If upgrading an existing DB, run in Cloudflare D1 console:
--   ALTER TABLE articles_schedule ADD COLUMN row_num INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_artsch_status  ON articles_schedule(status);
CREATE INDEX IF NOT EXISTS idx_artsch_row_num ON articles_schedule(row_num);

-- Pinterest trending keywords cache (populated by GitHub Actions fetch-analytics.yml)
CREATE TABLE IF NOT EXISTS pinterest_trends_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pinterest analytics cache (populated by GitHub Actions fetch-analytics.yml)
CREATE TABLE IF NOT EXISTS pinterest_analytics_cache (
  pin_id TEXT PRIMARY KEY,
  pin_title TEXT,
  pin_url TEXT,
  pin_link TEXT,
  created_at TEXT,
  impressions INTEGER DEFAULT 0,
  outbound_clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  cached_at TEXT DEFAULT (datetime('now'))
);

-- Pipeline lifecycle tracking: one row per article from discovery to publication
CREATE TABLE IF NOT EXISTS pipeline_articles (
  slug TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('recipes', 'nutrition', 'tips')),
  source TEXT NOT NULL DEFAULT 'manual',
  stage TEXT NOT NULL DEFAULT 'topic' CHECK (stage IN (
    'topic', 'approved', 'written', 'reviewed',
    'hero_brief', 'pins_brief', 'hero_image', 'pin_images',
    'deployed', 'published', 'failed'
  )),
  error TEXT,
  error_stage TEXT,
  write_model TEXT,
  review_model TEXT,
  word_count INTEGER,
  hero_prompt TEXT,
  hero_alt TEXT,
  hero_model TEXT,
  hero_image_done INTEGER DEFAULT 0,
  support_model TEXT,
  support_image_done INTEGER DEFAULT 0,
  review_state TEXT,
  pin_count INTEGER DEFAULT 0,
  pin_images_done INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pa_stage ON pipeline_articles(stage);
CREATE INDEX IF NOT EXISTS idx_pa_category ON pipeline_articles(category);
CREATE INDEX IF NOT EXISTS idx_pa_updated ON pipeline_articles(updated_at);

-- Pin briefs + image status for each article's pins
CREATE TABLE IF NOT EXISTS pipeline_pins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_slug TEXT NOT NULL,
  pin_slug TEXT NOT NULL UNIQUE,
  pin_index INTEGER NOT NULL CHECK (pin_index BETWEEN 0 AND 9),
  title TEXT,
  description TEXT,
  prompt TEXT,
  alt TEXT,
  model_id TEXT,
  image_status TEXT DEFAULT 'pending' CHECK (image_status IN ('pending', 'done', 'failed')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(article_slug, pin_index)
);

CREATE INDEX IF NOT EXISTS idx_pp_article ON pipeline_pins(article_slug);

-- Discovered topics queue: pending approval, with source metadata
CREATE TABLE IF NOT EXISTS pipeline_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('recipes', 'nutrition', 'tips')),
  source TEXT NOT NULL CHECK (source IN ('gsc', 'autocomplete', 'pinterest', 'llm_gap', 'manual')),
  search_volume INTEGER,
  impressions INTEGER,
  ctr REAL,
  avg_position REAL,
  trend_score REAL,
  dedup_score REAL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'produced')),
  reject_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pt_status ON pipeline_topics(status);
CREATE INDEX IF NOT EXISTS idx_pt_category ON pipeline_topics(category);
CREATE INDEX IF NOT EXISTS idx_pt_source ON pipeline_topics(source);
