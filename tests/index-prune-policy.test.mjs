import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  INDEX_KEEP_PATHS,
  INDEX_PRUNE_SLUGS,
  INDEX_PROTECTED_SLUGS,
  isIndexPruned,
} from "../src/content/index-prune.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SITE = "https://www.daily-life-hacks.com";

function read(relative) {
  return readFileSync(join(ROOT, relative), "utf8");
}

test("prune set is 107 unique article slugs and never overlaps KEEP or protected URLs", () => {
  assert.equal(INDEX_PRUNE_SLUGS.size, 107);
  assert.equal(INDEX_KEEP_PATHS.size, 51);
  assert.equal(isIndexPruned("cheap-dinner-ideas-cost-per-serving"), true);
  assert.equal(isIndexPruned("fiber-per-dollar-cheapest-high-fiber-foods"), false);
  assert.equal(isIndexPruned("popcorn-vs-potato-chips-fiber-comparison"), false);

  for (const slug of INDEX_PRUNE_SLUGS) {
    assert.ok(
      existsSync(join(ROOT, "src/data/articles", `${slug}.md`)),
      `prune slug has no article file: ${slug}`,
    );
    assert.ok(!INDEX_KEEP_PATHS.has(slug), `KEEP slug was pruned: ${slug}`);
    assert.ok(!INDEX_PROTECTED_SLUGS.has(slug), `protected slug was pruned: ${slug}`);
  }

  for (const path of INDEX_KEEP_PATHS) {
    assert.equal(isIndexPruned(path), false, `KEEP path is pruned: ${path}`);
  }
});

test("article layout and sitemap config share the prune set", () => {
  const articlePage = read("src/pages/[slug].astro");
  const sitemapConfig = read("astro.config.mjs");
  const related = read("src/components/RelatedArticles.astro");

  assert.match(articlePage, /import \{ isIndexPruned \} from "\.\.\/content\/index-prune\.js"/);
  assert.match(
    articlePage,
    /const robotsMeta = \(!released \|\| isVariant \|\| indexPruned\) \? "noindex, follow" : undefined/,
  );
  assert.match(sitemapConfig, /import \{ INDEX_PRUNE_SLUGS \} from '\.\/src\/content\/index-prune\.js'/);
  assert.match(sitemapConfig, /for \(const slug of INDEX_PRUNE_SLUGS\) \{\s*addPath\(slug\);/s);
  assert.match(related, /isReleased\(a\) && !isIndexPruned\(a\.id\)/);
  assert.doesNotMatch(articlePage, /robots="noindex, nofollow"/);
});

test("sitemap serialize drops a prune slug and keeps the fiber-per-dollar flagship", () => {
  const pruneUrl = `${SITE}/cheap-dinner-ideas-cost-per-serving/`;
  const keepUrl = `${SITE}/fiber-per-dollar-cheapest-high-fiber-foods/`;
  const payload = JSON.stringify({
    urls: [pruneUrl, keepUrl, `${SITE}/`, ...[...INDEX_KEEP_PATHS].map((path) => `${SITE}/${path}/`)],
  });
  const result = spawnSync(process.execPath, [join(ROOT, "scripts/seo_config_bridge.mjs")], {
    input: payload,
    encoding: "utf8",
    cwd: ROOT,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true, parsed.error);
  assert.equal(parsed.results[pruneUrl].excluded, true);
  assert.equal(parsed.results[keepUrl].excluded, false);
  assert.equal(parsed.results[`${SITE}/`].excluded, false);

  for (const path of INDEX_KEEP_PATHS) {
    const url = `${SITE}/${path}/`;
    assert.equal(parsed.results[url].excluded, false, `KEEP URL excluded from sitemap: ${path}`);
  }
});
