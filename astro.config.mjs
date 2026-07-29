// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import rehypeArticleImages from './scripts/rehype-article-images.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SITE = 'https://www.daily-life-hacks.com';

/**
 * Mirrors `isReleased` / publishAt logic: paths that are not yet public for Search.
 * Must stay in sync with `src/content/release.ts` (publishAt in frontmatter).
 */
/** @param {string} raw */
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

  /** @param {string} slug */
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

function loadArticleLastModifiedDates() {
  const articlesDir = join(__dirname, 'src/data/articles');
  /** @type {Map<string, string>} */
  const dates = new Map();

  for (const file of readdirSync(articlesDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const content = readFileSync(join(articlesDir, file), 'utf8');
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) continue;
    const modified = frontmatter[1].match(/^dateModified:\s*(.+)$/m);
    const published = frontmatter[1].match(/^date:\s*(.+)$/m);
    const rawDate = (modified?.[1] || published?.[1] || '').trim().replace(/^['"]|['"]$/g, '');
    if (!rawDate) continue;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) continue;
    dates.set(`/${slug}/`, parsed.toISOString());
  }

  return dates;
}

/**
 * Parent-pillar slugs, read straight out of the cluster registry so the sitemap
 * hierarchy cannot drift from the content hierarchy.
 */
function loadPillarSlugs() {
  /** @type {Set<string>} */
  const slugs = new Set();
  try {
    const raw = readFileSync(join(__dirname, 'src/content/clusters.ts'), 'utf8');
    for (const m of raw.matchAll(/parentPillar:\s*["']([^"']+)["']/g)) {
      slugs.add(`/${m[1]}/`);
    }
  } catch {
    // A missing registry must not break the build; every article just keeps the
    // default article priority.
  }
  return slugs;
}

/** Article slugs that publish a downloadable CSV + schema.org/Dataset. */
function loadDatasetSlugs() {
  /** @type {Set<string>} */
  const slugs = new Set();
  try {
    const raw = readFileSync(join(__dirname, 'src/content/datasets.ts'), 'utf8');
    const body = raw.slice(raw.indexOf('export const DATASETS'));
    for (const m of body.matchAll(/^ {2}["']([a-z0-9-]+)["']:\s*\{/gm)) {
      slugs.add(`/${m[1]}/`);
    }
  } catch {
    // Same fail-open reasoning as loadPillarSlugs.
  }
  return slugs;
}

/**
 * Images an article is the canonical host of, read from the article source
 * rather than the rendered HTML.
 *
 * Rendered HTML also contains related-article thumbnails, which belong to other
 * pages; listing those would tell Google Images that one photo lives on twenty
 * URLs. Reading the markdown gives an exact page->image mapping: the hero from
 * frontmatter `image`, plus any /images/ reference in the body.
 *
 * @returns {Map<string, {url: string, caption?: string}[]>}
 */
function loadArticleImages() {
  const articlesDir = join(__dirname, 'src/data/articles');
  const publicDir = join(__dirname, 'public');
  /** @type {Map<string, {url: string, caption?: string}[]>} */
  const byPath = new Map();

  for (const file of readdirSync(articlesDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(join(articlesDir, file), 'utf8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const frontmatter = fmMatch?.[1] ?? '';
    const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

    const unquote = (/** @type {string} */ v) => v.trim().replace(/^['"]|['"]$/g, '');
    const hero = frontmatter.match(/^image:\s*(.+)$/m);
    const heroAlt = frontmatter.match(/^imageAlt:\s*(.+)$/m);
    const title = frontmatter.match(/^title:\s*(.+)$/m);

    /** @type {Map<string, string|undefined>} */
    const found = new Map();
    if (hero) {
      const u = unquote(hero[1]);
      if (u.startsWith('/images/')) found.set(u, heroAlt ? unquote(heroAlt[1]) : undefined);
    }
    // Markdown ![alt](/images/x.jpg) and raw <img src="/images/x.jpg">
    for (const m of body.matchAll(/!\[([^\]]*)\]\((\/images\/[^)\s]+)/g)) {
      if (!found.has(m[2])) found.set(m[2], m[1] || undefined);
    }
    for (const m of body.matchAll(/<img[^>]+src=["'](\/images\/[^"']+)["']/g)) {
      if (!found.has(m[1])) found.set(m[1], undefined);
    }

    // A small set of recipe articles injects a real ingredients photo after
    // hydration. Google does not scroll or trigger that client-side insertion,
    // so the normal sitemap is the photo's only reliable discovery path. The
    // existence check below keeps this fail-closed for every article that does
    // not publish the optional asset.
    const ingredientsImage = `/images/${slug}-ingredients.jpg`;
    const articleTitle = title ? unquote(title[1]) : undefined;
    if (!found.has(ingredientsImage)) {
      found.set(
        ingredientsImage,
        articleTitle ? `${articleTitle} ingredients` : undefined,
      );
    }

    /** @type {{url: string, caption?: string}[]} */
    const images = [];
    for (const [u, caption] of found) {
      // Never advertise an image that this build does not actually ship.
      try {
        readFileSync(join(publicDir, u.replace(/^\//, '')));
      } catch {
        continue;
      }
      images.push(caption ? { url: new URL(u, SITE).toString(), caption } : { url: new URL(u, SITE).toString() });
    }
    if (images.length) byPath.set(`/${slug}/`, images);
  }

  return byPath;
}

const excludedSitemapPaths = loadSitemapExclusions();
const articleLastModifiedDates = loadArticleLastModifiedDates();
const pillarPaths = loadPillarSlugs();
const datasetPaths = loadDatasetSlugs();
const articleImages = loadArticleImages();

/**
 * The newest article dateModified in the build. Hub pages (home, category
 * indexes, /guides/, /research/) are generated *from* the article set, so this
 * is their real last-modified date — not the build timestamp.
 */
const newestArticleLastModified = [...articleLastModifiedDates.values()].sort().at(-1);

/** Hub pages whose content is derived from the article set. */
const derivedHubPaths = new Set([
  '/',
  '/nutrition/',
  '/recipes/',
  '/tips/',
  '/guides/',
  '/research/',
]);

/**
 * Sitemap `priority` is a *relative* hint within one site. Google has stated
 * publicly that it ignores both `priority` and `changefreq`; Bing treats
 * priority as a weak hint at best. This is therefore documentation of our own
 * hierarchy that costs nothing, not a ranking lever. `changefreq` is
 * deliberately omitted — it is pure noise.
 *
 * @param {string} pathname
 * @returns {number}
 */
function sitemapPriorityFor(pathname) {
  if (pathname === '/') return 1.0;
  if (pillarPaths.has(pathname)) return 0.9;
  if (datasetPaths.has(pathname)) return 0.8;
  if (derivedHubPaths.has(pathname) || pathname === '/data/' || pathname === '/statistics/') return 0.8;
  if (pathname.startsWith('/tools/') && pathname !== '/tools/') return 0.7;
  if (articleLastModifiedDates.has(pathname)) return 0.6;
  // /about/, /methodology/, /api-docs/, /tools/ — real pages, low relative rank.
  return 0.5;
}

/** @param {string} url */
function shouldExcludeFromSitemap(url) {
  try {
    const pathname = new URL(url).pathname;
    const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    if (normalized === '/tag' || normalized.startsWith('/tag/')) return true;
    // Embeddable chart pages are noindex by design (growth method #18).
    if (normalized === '/embed' || normalized.startsWith('/embed/')) return true;
    return excludedSitemapPaths.has(normalized);
  } catch {
    return false;
  }
}

export default defineConfig({
  site: 'https://www.daily-life-hacks.com',
  trailingSlash: 'always',
  markdown: {
    rehypePlugins: [rehypeArticleImages],
  },
  integrations: [
    sitemap({
      serialize(item) {
        if (shouldExcludeFromSitemap(item.url)) return undefined;
        const pathname = new URL(item.url).pathname;

        // Real dateModified for articles; newest-article date for the hubs that
        // are generated from them. Everything else (/about/, /methodology/,
        // /api-docs/, /tools/*) deliberately ships with NO lastmod: we do not
        // know when it last meaningfully changed, and Google discards a lastmod
        // it decides is unreliable. Omitting is more honest than the build time.
        const lastmod =
          articleLastModifiedDates.get(pathname) ??
          (derivedHubPaths.has(pathname) ? newestArticleLastModified : undefined);

        /** @type {any} */
        const next = { ...item, priority: sitemapPriorityFor(pathname) };
        if (lastmod) next.lastmod = lastmod;

        // Image sitemap data goes inline in the URL entry. Google's own
        // documentation allows image extension tags inside a normal sitemap,
        // and at ~240 URLs a second sitemap file would add a crawl target for
        // no benefit. `img` is passed through to the underlying `sitemap`
        // package, which emits the image:image namespace.
        const images = articleImages.get(pathname);
        if (images) next.img = images;
        return next;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
