/**
 * Checkpoint 2 Phase B routing verification.
 *
 * - Canonical articles must exist in dist/
 * - Pin destinations must NOT be built as HTML (runtime 301 only)
 * - pin-destinations-flat.json must cover every derived alias and ship in dist/
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const ROUTER_MAPPING_PATH = path.join(ROOT, "pipeline-data", "router-mapping.json");
const SLUG_ALIASES_PATH = path.join(ROOT, "pipeline-data", "slug-aliases.json");
const PIN_DEST_PATH = path.join(ROOT, "pipeline-data", "pin-destinations.json");
const FLAT_SRC_PATH = path.join(ROOT, "public", "data", "pin-destinations-flat.json");
const FLAT_DIST_PATH = path.join(ROOT, "dist", "data", "pin-destinations-flat.json");
const ARTICLES_DIR = path.join(ROOT, "src", "data", "articles");

function fail(message) {
  console.error(`\n[verify-routing] ERROR: ${message}\n`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function listArticleIds() {
  if (!exists(ARTICLES_DIR)) fail(`Missing articles directory: ${ARTICLES_DIR}`);
  const entries = fs.readdirSync(ARTICLES_DIR, { withFileTypes: true });
  return new Set(
    entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name.replace(/\.md$/, "")),
  );
}

function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function collectRouterSlugs(routerMapping) {
  const baseSlugs = new Set();
  const variantSlugs = new Set();

  for (const [base, variants] of Object.entries(routerMapping || {})) {
    const baseSlug = normalizeSlug(base);
    if (!baseSlug) continue;
    baseSlugs.add(baseSlug);

    for (const variant of Object.values(variants || {})) {
      const variantSlug = normalizeSlug(variant?.url_slug);
      if (variantSlug) variantSlugs.add(variantSlug);
    }
  }

  return { baseSlugs, variantSlugs };
}

function checkDistHasSlug(slug) {
  return exists(path.join(DIST_DIR, slug, "index.html"));
}

function main() {
  if (!exists(PIN_DEST_PATH))
    fail(`Missing pin destinations registry: ${path.relative(ROOT, PIN_DEST_PATH)}`);
  if (!exists(ROUTER_MAPPING_PATH))
    fail(`Missing router mapping file: ${path.relative(ROOT, ROUTER_MAPPING_PATH)}`);
  if (!exists(SLUG_ALIASES_PATH))
    fail(`Missing slug aliases file: ${path.relative(ROOT, SLUG_ALIASES_PATH)}`);
  if (!exists(FLAT_SRC_PATH))
    fail(`Missing flat map: ${path.relative(ROOT, FLAT_SRC_PATH)}`);
  if (!exists(DIST_DIR))
    fail(`Missing dist/ output. Run "npm run build" before verifying routing.`);
  if (!exists(FLAT_DIST_PATH))
    fail(
      `Missing ${path.relative(ROOT, FLAT_DIST_PATH)} — runtime 301 map must ship with the site`,
    );

  const routerMapping = readJson(ROUTER_MAPPING_PATH);
  const slugAliases = readJson(SLUG_ALIASES_PATH);
  const flatMap = readJson(FLAT_SRC_PATH);
  const flatDist = readJson(FLAT_DIST_PATH);
  const pinDest = readJson(PIN_DEST_PATH);
  const { baseSlugs, variantSlugs } = collectRouterSlugs(routerMapping);
  const articleIds = listArticleIds();

  const aliasEntries = Object.entries(slugAliases || {}).map(([alias, target]) => ({
    alias: normalizeSlug(alias),
    target: normalizeSlug(target),
  }));
  const aliasSlugs = new Set(aliasEntries.map((e) => e.alias));

  const errors = [];
  const warnings = [];

  // 1) Registry / mapping bases must exist as articles.
  for (const baseSlug of Object.keys(routerMapping || {})) {
    const normalized = normalizeSlug(baseSlug);
    if (!articleIds.has(normalized)) {
      errors.push(
        `router-mapping base "${normalized}" has no matching article file in src/data/articles/`,
      );
    }
  }

  for (const [canonical, entry] of Object.entries(pinDest.articles || {})) {
    const c = normalizeSlug(entry?.canonical || canonical);
    if (!articleIds.has(c)) {
      errors.push(`pin-destinations article "${c}" has no matching markdown file`);
    }
  }

  // 2) Every derived alias must point at a real article and appear in the flat map.
  for (const { alias, target } of aliasEntries) {
    if (!target || !articleIds.has(target)) {
      errors.push(`slug alias "${alias}" points to missing article "${target}"`);
      continue;
    }
    if (flatMap[alias] !== target) {
      errors.push(
        `flat map mismatch for "${alias}": expected "${target}", got "${flatMap[alias] ?? ""}"`,
      );
    }
  }

  // 3) Canonical articles must be built; pin destinations must NOT be built.
  for (const slug of articleIds) {
    if (!checkDistHasSlug(slug)) {
      errors.push(`Missing built canonical page: dist/${slug}/index.html`);
    }
  }

  const leakedAliasHtml = [];
  for (const alias of aliasSlugs) {
    if (articleIds.has(alias)) continue; // canonical collision shouldn't happen
    if (checkDistHasSlug(alias)) leakedAliasHtml.push(alias);
  }
  if (leakedAliasHtml.length) {
    errors.push(
      `${leakedAliasHtml.length} alias HTML page(s) still present in dist/ (Phase B forbids static aliases). Sample: ${leakedAliasHtml.slice(0, 5).join(", ")}`,
    );
  }

  // 4) Flat map in dist must match source (runtime depends on dist copy).
  const srcKeys = Object.keys(flatMap || {}).sort();
  const distKeys = Object.keys(flatDist || {}).sort();
  if (srcKeys.length !== distKeys.length) {
    errors.push(
      `flat map size mismatch: public has ${srcKeys.length}, dist has ${distKeys.length}`,
    );
  } else {
    for (const key of srcKeys) {
      if (flatDist[key] !== flatMap[key]) {
        errors.push(`dist flat map differs for "${key}"`);
        break;
      }
    }
  }

  // 5) Collision: variant must not equal another article base.
  const routerBaseSlugs = new Set(Object.keys(routerMapping || {}).map(normalizeSlug));
  for (const [base, variants] of Object.entries(routerMapping || {})) {
    const baseSlug = normalizeSlug(base);
    for (const variant of Object.values(variants || {})) {
      const variantSlug = normalizeSlug(variant?.url_slug);
      if (!variantSlug) continue;
      if (variantSlug !== baseSlug && routerBaseSlugs.has(variantSlug)) {
        errors.push(
          `Slug collision: variant "${variantSlug}" (from base "${baseSlug}") matches another base slug`,
        );
      }
    }
  }

  const unmigratedVariants = [...variantSlugs].filter(
    (slug) => !aliasSlugs.has(slug) && !articleIds.has(slug),
  );
  if (unmigratedVariants.length) {
    warnings.push(
      `${unmigratedVariants.length} router variant slug(s) are not present in slug-aliases.json`,
    );
  }

  if (baseSlugs.size === 0 && aliasSlugs.size === 0) {
    warnings.push("router-mapping produced 0 slugs (is the file empty?)");
  }

  if (warnings.length) {
    console.warn("[verify-routing] Warnings:");
    for (const w of warnings) console.warn(`- ${w}`);
  }

  if (errors.length) {
    console.error("[verify-routing] Failures:");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  const articlesWithoutRouter = [...articleIds].filter((id) => !baseSlugs.has(id));
  const pinCounts = [];
  for (const variants of Object.values(routerMapping || {})) {
    pinCounts.push(
      Object.values(variants || {}).filter((v) => normalizeSlug(v?.url_slug)).length,
    );
  }
  const under4 = pinCounts.filter((n) => n < 4).length;

  console.log(
    `[verify-routing] OK: verified ${articleIds.size} canonical page(s) in dist/; ${aliasSlugs.size} pin destination(s) are runtime-301 only`,
  );
  console.log(
    `[verify-routing] Summary: articles=${articleIds.size} destinations=${aliasSlugs.size} flat=${srcKeys.length} routerBases=${baseSlugs.size} routerVariants=${variantSlugs.size} unmigratedVariants=${unmigratedVariants.length} articlesWithoutRouter=${articlesWithoutRouter.length} routerBasesUnder4Pins=${under4} leakedAliasHtml=0`,
  );
  console.log(
    `[verify-routing] Policy: CP2 Phase B — canonical HTML only; pin destinations via 301 (docs/pin-routing-policy.md)`,
  );
}

main();
