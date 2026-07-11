/**
 * Checkpoint 1 routing audit — baseline inventory + drift report.
 * Does not fail the build; writes a JSON snapshot for human review.
 *
 * Usage: node scripts/audit-routing.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROUTER_MAPPING_PATH = path.join(ROOT, "pipeline-data", "router-mapping.json");
const SLUG_ALIASES_PATH = path.join(ROOT, "pipeline-data", "slug-aliases.json");
const ARTICLES_DIR = path.join(ROOT, "src", "data", "articles");
const REPORTS_DIR = path.join(ROOT, "pipeline-data", "reports");

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

function main() {
  const routerMapping = readJson(ROUTER_MAPPING_PATH);
  const slugAliases = readJson(SLUG_ALIASES_PATH);
  const articleIds = listArticleIds();

  const aliasEntries = Object.entries(slugAliases || {}).map(([alias, target]) => ({
    alias: normalizeSlug(alias),
    target: normalizeSlug(target),
  }));

  const aliasSlugs = new Set(aliasEntries.map((e) => e.alias));
  const aliasTargets = new Set(aliasEntries.map((e) => e.target));

  const variantRows = [];
  for (const [base, variants] of Object.entries(routerMapping || {})) {
    const baseSlug = normalizeSlug(base);
    for (const [key, variant] of Object.entries(variants || {})) {
      const urlSlug = normalizeSlug(variant?.url_slug);
      if (!urlSlug) continue;
      variantRows.push({
        base: baseSlug,
        key,
        url_slug: urlSlug,
        inAliases: aliasSlugs.has(urlSlug) || articleIds.has(urlSlug),
      });
    }
  }

  const variantSlugs = new Set(variantRows.map((r) => r.url_slug));
  const routerBases = new Set(Object.keys(routerMapping || {}).map(normalizeSlug));

  const variantsMissingFromAliases = variantRows
    .filter((r) => !r.inAliases)
    .map((r) => r.url_slug);

  const orphanAliases = aliasEntries.filter(
    (e) => !variantSlugs.has(e.alias) && !articleIds.has(e.alias),
  );

  const aliasesPointingMissing = aliasEntries.filter((e) => !articleIds.has(e.target));

  const articlesWithoutRouter = [...articleIds].filter((id) => !routerBases.has(id));

  const articlesWithPinCounts = [...routerBases].map((base) => {
    const count = variantRows.filter((r) => r.base === base).length;
    return { base, pinDestinations: count };
  });
  const articlesUnder4Pins = articlesWithPinCounts.filter((a) => a.pinDestinations < 4);

  const collisions = variantRows.filter(
    (r) => r.url_slug !== r.base && routerBases.has(r.url_slug),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    checkpoint: "CP1-baseline",
    policy: "docs/pin-routing-policy.md",
    targetModel: "pin-destination-301-to-canonical",
    counts: {
      articles: articleIds.size,
      aliases: aliasSlugs.size,
      routerBases: routerBases.size,
      routerVariants: variantSlugs.size,
      variantsMissingFromAliases: variantsMissingFromAliases.length,
      orphanAliasesNotInRouter: orphanAliases.length,
      aliasesPointingMissingArticle: aliasesPointingMissing.length,
      articlesWithoutRouterMapping: articlesWithoutRouter.length,
      articlesWithUnder4PinDestinations: articlesUnder4Pins.length,
      variantBaseCollisions: collisions.length,
    },
    samples: {
      variantsMissingFromAliases: variantsMissingFromAliases.slice(0, 25),
      orphanAliases: orphanAliases.slice(0, 25),
      aliasesPointingMissing: aliasesPointingMissing.slice(0, 25),
      articlesWithoutRouter: articlesWithoutRouter.slice(0, 25),
      articlesUnder4Pins: articlesUnder4Pins.slice(0, 25),
      collisions: collisions.slice(0, 25),
    },
    notes: [
      "Orphan aliases often include legacy best-/guide-/tips- patterns outside router-mapping.",
      "CP1 freeze: do not manually grow slug-aliases.json.",
      "CP2 will migrate to pin-destinations.json + runtime 301.",
    ],
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const day = report.generatedAt.slice(0, 10);
  const outPath = path.join(REPORTS_DIR, `routing-audit-${day}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("[audit-routing] Baseline report");
  console.log(JSON.stringify(report.counts, null, 2));
  console.log(`[audit-routing] Wrote ${path.relative(ROOT, outPath)}`);

  if (aliasesPointingMissing.length || collisions.length) {
    console.warn(
      "[audit-routing] WARNING: missing alias targets and/or collisions present — see report samples.",
    );
  }
}

main();
