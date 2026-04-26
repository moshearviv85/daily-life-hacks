import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const ROUTER_MAPPING_PATH = path.join(ROOT, "pipeline-data", "router-mapping.json");
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

function collectSlugs(routerMapping) {
  const baseToVariants = new Map();
  const allSlugs = new Set();

  for (const [base, variants] of Object.entries(routerMapping || {})) {
    const baseSlug = normalizeSlug(base);
    if (!baseSlug) continue;

    if (!baseToVariants.has(baseSlug)) baseToVariants.set(baseSlug, new Set());
    allSlugs.add(baseSlug);

    for (const variant of Object.values(variants || {})) {
      const variantSlug = normalizeSlug(variant?.url_slug);
      if (!variantSlug) continue;
      allSlugs.add(variantSlug);
      baseToVariants.get(baseSlug).add(variantSlug);
    }
  }

  return { baseToVariants, allSlugs };
}

function checkDistHasSlug(slug) {
  const expected = path.join(DIST_DIR, slug, "index.html");
  return exists(expected);
}

function main() {
  if (!exists(ROUTER_MAPPING_PATH))
    fail(`Missing router mapping file: ${path.relative(ROOT, ROUTER_MAPPING_PATH)}`);

  if (!exists(DIST_DIR))
    fail(`Missing dist/ output. Run "npm run build" before verifying routing.`);

  const routerMapping = readJson(ROUTER_MAPPING_PATH);
  const { allSlugs } = collectSlugs(routerMapping);
  const articleIds = listArticleIds();

  const errors = [];
  const warnings = [];

  // 1) Every base slug in router-mapping should exist as an article file.
  for (const baseSlug of Object.keys(routerMapping || {})) {
    const normalized = normalizeSlug(baseSlug);
    if (!articleIds.has(normalized)) {
      errors.push(
        `router-mapping base "${normalized}" has no matching article file in src/data/articles/`,
      );
    }
  }

  // 2) Every slug from mapping should exist in dist as a built page.
  for (const slug of allSlugs) {
    if (!checkDistHasSlug(slug)) {
      errors.push(`Missing built page: dist/${slug}/index.html`);
    }
  }

  // 3) Collision check: a variant slug should not equal another base slug (except its own base).
  const baseSlugs = new Set(Object.keys(routerMapping || {}).map(normalizeSlug));
  for (const [base, variants] of Object.entries(routerMapping || {})) {
    const baseSlug = normalizeSlug(base);
    for (const variant of Object.values(variants || {})) {
      const variantSlug = normalizeSlug(variant?.url_slug);
      if (!variantSlug) continue;
      if (variantSlug !== baseSlug && baseSlugs.has(variantSlug)) {
        errors.push(
          `Slug collision: variant "${variantSlug}" (from base "${baseSlug}") matches another base slug`,
        );
      }
    }
  }

  // Soft check: ensure at least one slug exists (guards against empty mapping).
  if (allSlugs.size === 0) {
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

  console.log(`[verify-routing] OK: verified ${allSlugs.size} slugs against dist/`);
}

main();

