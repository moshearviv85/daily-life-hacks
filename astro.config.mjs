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

function loadExcludedPathsForUnreleasedArticles() {
  const now = Date.now();
  const articlesDir = join(__dirname, 'src/data/articles');
  const mappingPath = join(__dirname, 'pipeline-data/router-mapping.json');
  const mapping = JSON.parse(readFileSync(mappingPath, 'utf8'));
  /** @type {Set<string>} */
  const excluded = new Set();

  function addPath(slug) {
    if (!slug) return;
    const p = slug.startsWith('/') ? slug : `/${slug}`;
    const normalized = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
    excluded.add(normalized);
  }

  for (const file of readdirSync(articlesDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const content = readFileSync(join(articlesDir, file), 'utf8');
    const publishAt = getPublishAtFromMarkdown(content);
    if (!publishAt || publishAt.getTime() <= now) continue;

    addPath(slug);
    const variants = mapping[slug];
    if (variants && typeof variants === 'object') {
      for (const v of Object.values(variants)) {
        if (v && typeof v === 'object' && 'url_slug' in v && v.url_slug) {
          addPath(v.url_slug);
        }
      }
    }
  }
  return excluded;
}

const excludedArticlePaths = loadExcludedPathsForUnreleasedArticles();

function isUnreleasedSitemapUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    return excludedArticlePaths.has(normalized);
  } catch {
    return false;
  }
}

export default defineConfig({
  site: 'https://www.daily-life-hacks.com',
  integrations: [
    sitemap({
      serialize(item) {
        if (isUnreleasedSitemapUrl(item.url)) return undefined;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
