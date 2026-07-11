/**
 * One-shot (idempotent) migration: slug-aliases + router-mapping → pin-destinations.json
 * Then derives routing artifacts.
 *
 *   node scripts/migrate-pin-destinations.mjs
 *   node scripts/migrate-pin-destinations.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { derivePinRouting } from "./lib/derive-pin-routing.mjs";

const ROOT = process.cwd();
const ROUTER_MAPPING_PATH = path.join(ROOT, "pipeline-data", "router-mapping.json");
const SLUG_ALIASES_PATH = path.join(ROOT, "pipeline-data", "slug-aliases.json");
const ARTICLES_DIR = path.join(ROOT, "src", "data", "articles");
const OUT_PATH = path.join(ROOT, "pipeline-data", "pin-destinations.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function listArticleIds() {
  return new Set(
    fs
      .readdirSync(ARTICLES_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name.replace(/\.md$/, "")),
  );
}

function classifyAliasOrigin(alias, canonical) {
  if (alias === `best-${canonical}`) return "legacy_seo_variant";
  if (alias === `${canonical}-guide` || alias === `${canonical}-tips`) {
    return "legacy_seo_variant";
  }
  if (/^best-/.test(alias) || /-(guide|tips)$/.test(alias)) {
    return "legacy_seo_variant";
  }
  return "legacy_orphan";
}

function ensureArticle(articles, canonical) {
  if (!articles[canonical]) {
    articles[canonical] = { canonical, destinations: [] };
  }
  return articles[canonical];
}

function hasUrlSlug(entry, urlSlug) {
  return entry.destinations.some((d) => d.url_slug === urlSlug);
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const articleIds = listArticleIds();
  const routerMapping = readJson(ROUTER_MAPPING_PATH);
  const slugAliases = readJson(SLUG_ALIASES_PATH);

  const articles = {};
  let pinCount = 0;
  let orphanCount = 0;
  let skippedMissing = 0;

  for (const [base, variants] of Object.entries(routerMapping || {})) {
    const canonical = normalizeSlug(base);
    if (!articleIds.has(canonical)) {
      skippedMissing += 1;
      continue;
    }
    const entry = ensureArticle(articles, canonical);
    let idx = 0;
    for (const [key, variant] of Object.entries(variants || {})) {
      const urlSlug = normalizeSlug(variant?.url_slug);
      if (!urlSlug || urlSlug === canonical) continue;
      if (hasUrlSlug(entry, urlSlug)) continue;
      idx += 1;
      entry.destinations.push({
        id: /^v\d+$/i.test(key) ? key.toLowerCase() : `v${idx}`,
        url_slug: urlSlug,
        title: variant?.title || "",
        origin: "pin",
        created_at: variant?.created_at || null,
      });
      pinCount += 1;
    }
  }

  for (const [aliasRaw, targetRaw] of Object.entries(slugAliases || {})) {
    const alias = normalizeSlug(aliasRaw);
    const canonical = normalizeSlug(targetRaw);
    if (!alias || !canonical || alias === canonical) continue;
    if (!articleIds.has(canonical)) {
      skippedMissing += 1;
      continue;
    }
    const entry = ensureArticle(articles, canonical);
    if (hasUrlSlug(entry, alias)) continue;
    entry.destinations.push({
      id: `legacy-${entry.destinations.length + 1}`,
      url_slug: alias,
      title: "",
      origin: classifyAliasOrigin(alias, canonical),
      created_at: null,
    });
    orphanCount += 1;
  }

  // Stable order
  for (const entry of Object.values(articles)) {
    entry.destinations.sort((a, b) => a.url_slug.localeCompare(b.url_slug));
  }

  const doc = {
    version: 1,
    updatedAt: new Date().toISOString(),
    articles: Object.fromEntries(
      Object.keys(articles)
        .sort()
        .map((k) => [k, articles[k]]),
    ),
  };

  const destTotal = Object.values(doc.articles).reduce(
    (n, a) => n + a.destinations.length,
    0,
  );

  console.log("[migrate-pin-destinations] Summary:");
  console.log(
    JSON.stringify(
      {
        articlesWithDestinations: Object.keys(doc.articles).length,
        destinations: destTotal,
        fromRouterPins: pinCount,
        fromOrphanAliases: orphanCount,
        skippedMissingTargets: skippedMissing,
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log("[migrate-pin-destinations] Dry run — not writing files");
    return;
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log(`[migrate-pin-destinations] Wrote ${path.relative(ROOT, OUT_PATH)}`);

  const derived = derivePinRouting(doc);
  console.log("[migrate-pin-destinations] Derived:", derived);
}

main();
