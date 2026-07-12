// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Mirrors `isReleased` / publishAt logic: paths that are not yet public for Search.
 * Must stay in sync with `src/content/release.ts` (publishAt in frontmatter).
 */
function getPublishAtFromMarkdown(raw) {
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const m = fm[1].match(/^publishAt:\s*(.+)$/m);
  if (!m) return null;
  const d = new Date(m[1].trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function loadSitemapExclusions() {
  const now = Date.now();
  const articlesDir = join(__dirname, 'src/data/articles');
  const aliasesPath = join(__dirname, 'pipeline-data/slug-aliases.json');
  const aliases = JSON.parse(readFileSync(aliasesPath, 'utf8'));
  /** @type {Set<string>} */
  const excluded = new Set();

  function addPath(slug) {
    if (!slug) return;
    const p = slug.startsWith('/') ? slug : `/${slug}`;
    const normalized = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
    excluded.add(normalized);
  }

  // Exclude all alias slugs (non-canonical)
  for (const aliasSlug of Object.keys(aliases)) {
    addPath(aliasSlug);
  }

  // Exclude utility pages that should not compete with article content in Search.
  for (const path of [
    '/dashboard',
    '/deploy-proof',
    '/thank-you',
    '/contact',
    '/privacy',
    '/terms',
    '/disclaimer',
  ]) {
    addPath(path);
  }

  // Exclude unreleased articles
  for (const file of readdirSync(articlesDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const content = readFileSync(join(articlesDir, file), 'utf8');
    const publishAt = getPublishAtFromMarkdown(content);
    if (!publishAt || publishAt.getTime() <= now) continue;
    addPath(slug);
  }

  return excluded;
}

const excludedSitemapPaths = loadSitemapExclusions();

function shouldExcludeFromSitemap(url) {
  try {
    const pathname = new URL(url).pathname;
    const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    if (normalized === '/tag' || normalized.startsWith('/tag/')) return true;
    return excludedSitemapPaths.has(normalized);
  } catch {
    return false;
  }
}

export default defineConfig({
  site: 'https://www.daily-life-hacks.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      serialize(item) {
        if (shouldExcludeFromSitemap(item.url)) return undefined;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
