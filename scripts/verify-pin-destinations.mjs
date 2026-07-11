import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, "src", "data", "articles");
const REGISTRY_PATH = path.join(ROOT, "public", "data", "content-registry.json");
const SLUG_ALIASES_PATH = path.join(ROOT, "pipeline-data", "slug-aliases.json");
const ROUTER_MAPPING_PATH = path.join(ROOT, "pipeline-data", "router-mapping.json");
const FLAT_PATH = path.join(ROOT, "public", "data", "pin-destinations-flat.json");

function fail(message) {
  console.error(`\n[verify-pin-destinations] ERROR: ${message}\n`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function listArticleIds() {
  if (!fs.existsSync(ARTICLES_DIR)) fail(`Missing articles directory: ${ARTICLES_DIR}`);

  return new Set(
    fs
      .readdirSync(ARTICLES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name.replace(/\.md$/, "")),
  );
}

function collectRouterVariantTargets(routerMapping) {
  const targets = new Map();

  for (const [base, variants] of Object.entries(routerMapping || {})) {
    const baseSlug = normalizeSlug(base);
    if (!baseSlug) continue;

    for (const variant of Object.values(variants || {})) {
      const variantSlug = normalizeSlug(variant?.url_slug);
      if (variantSlug) targets.set(variantSlug, baseSlug);
    }
  }

  return targets;
}

function parseDestinationSlug(destinationUrl, context) {
  try {
    return normalizeSlug(new URL(destinationUrl).pathname);
  } catch {
    fail(`Invalid destination_url for ${context}: ${destinationUrl}`);
  }
}

function resolveDestination(slug, { articleIds, aliasTargets, routerVariantTargets, flatTargets }) {
  if (articleIds.has(slug)) {
    return { kind: "canonical_article", target: slug };
  }

  const flatTarget = flatTargets.get(slug);
  if (flatTarget) {
    return { kind: "pin_destination", target: flatTarget };
  }

  const aliasTarget = aliasTargets.get(slug);
  if (aliasTarget) {
    return { kind: "slug_alias", target: aliasTarget };
  }

  const routerTarget = routerVariantTargets.get(slug);
  if (routerTarget) {
    return { kind: "router_variant", target: routerTarget };
  }

  const versionMatch = slug.match(/^(.+)-v\d+$/);
  if (versionMatch && articleIds.has(versionMatch[1])) {
    return { kind: "version_fallback", target: versionMatch[1] };
  }

  return { kind: "missing_local_route", target: "" };
}

function main() {
  const registry = readJson(REGISTRY_PATH);
  const slugAliases = readJson(SLUG_ALIASES_PATH);
  const routerMapping = readJson(ROUTER_MAPPING_PATH);
  const flatMap = fs.existsSync(FLAT_PATH) ? readJson(FLAT_PATH) : {};
  const articleIds = listArticleIds();
  const routerVariantTargets = collectRouterVariantTargets(routerMapping);
  const aliasTargets = new Map();
  const flatTargets = new Map();

  for (const [alias, target] of Object.entries(slugAliases || {})) {
    aliasTargets.set(normalizeSlug(alias), normalizeSlug(target));
  }
  for (const [alias, target] of Object.entries(flatMap || {})) {
    flatTargets.set(normalizeSlug(alias), normalizeSlug(target));
  }

  const errors = [];
  const counts = new Map();
  let checked = 0;

  for (const [registryKey, entry] of Object.entries(registry.articles || {})) {
    const baseSlug = normalizeSlug(entry?.article?.base_slug || registryKey);

    if (!articleIds.has(baseSlug)) {
      errors.push(`registry article "${registryKey}" points to missing article "${baseSlug}"`);
      continue;
    }

    for (const [variantId, variant] of Object.entries(entry.variants || {})) {
      if (!variant?.destination_url) continue;

      checked += 1;
      const slug = parseDestinationSlug(
        variant.destination_url,
        `${baseSlug}.${variantId}`,
      );
      const resolved = resolveDestination(slug, {
        articleIds,
        aliasTargets,
        routerVariantTargets,
        flatTargets,
      });

      counts.set(resolved.kind, (counts.get(resolved.kind) || 0) + 1);

      if (resolved.kind === "missing_local_route") {
        errors.push(
          `${baseSlug}.${variantId}: "${slug}" has no local route; add to pin-destinations.json`,
        );
        continue;
      }

      if (resolved.target !== baseSlug) {
        errors.push(
          `${baseSlug}.${variantId}: "${slug}" routes to "${resolved.target}", expected "${baseSlug}"`,
        );
      }
    }
  }

  if (errors.length) {
    console.error("[verify-pin-destinations] Failures:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  const summary = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, count]) => `${kind}=${count}`)
    .join(", ");

  console.log(
    `[verify-pin-destinations] OK: verified ${checked} pin destination URL(s) (${summary})`,
  );
}

main();
