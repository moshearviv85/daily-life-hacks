-- Migration: 2026-04-28
-- Add hero_briefs and pin_briefs tables to topic-research.sqlite.
-- Replaces pipeline-data/{pin,hero}-briefs.jsonl as source of truth.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS hero_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','failed','pending')),
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  model_id TEXT,
  prompt TEXT CHECK (status='failed' OR (prompt IS NOT NULL AND length(prompt) >= 30)),
  alt TEXT,
  scene TEXT,
  composition TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS pin_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_slug TEXT NOT NULL,
  pin_index INTEGER NOT NULL CHECK (pin_index BETWEEN 0 AND 9),
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','failed','pending')),
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  model_id TEXT,
  pin_slug TEXT,
  title TEXT CHECK (status='failed' OR (title IS NOT NULL AND length(title) BETWEEN 30 AND 100)),
  description TEXT CHECK (status='failed' OR (description IS NOT NULL AND length(description) BETWEEN 50 AND 500)),
  prompt TEXT CHECK (status='failed' OR (prompt IS NOT NULL AND length(prompt) >= 30)),
  alt TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  UNIQUE (article_slug, pin_index)
);

CREATE INDEX IF NOT EXISTS idx_hero_briefs_status ON hero_briefs(status);
CREATE INDEX IF NOT EXISTS idx_pin_briefs_article ON pin_briefs(article_slug);
CREATE INDEX IF NOT EXISTS idx_pin_briefs_status ON pin_briefs(status);

DROP VIEW IF EXISTS v_brief_coverage;
CREATE VIEW v_brief_coverage AS
SELECT
  w.slug,
  CASE WHEN h.status = 'ok' THEN 1 ELSE 0 END AS has_hero,
  COALESCE(SUM(CASE WHEN p.status = 'ok' THEN 1 ELSE 0 END), 0) AS pin_count_ok,
  COALESCE(SUM(CASE WHEN p.status = 'failed' THEN 1 ELSE 0 END), 0) AS pin_count_failed
FROM write_outputs w
LEFT JOIN hero_briefs h ON h.article_slug = w.slug
LEFT JOIN pin_briefs p ON p.article_slug = w.slug
WHERE w.status = 'written'
GROUP BY w.slug, h.status;
