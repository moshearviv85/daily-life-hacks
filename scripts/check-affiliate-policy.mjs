/**
 * Fail the build when an excluded page opts into affiliate links, or when
 * an affiliate marker lands in a health-claim page, a recipe nutrition
 * block, a study table, or a data page.
 *
 * AFFILIATE_LINKS_ENABLED defaults off. A marker in content while it is off
 * also fails, so a commercial link cannot ship without the flag.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  collectAffiliateViolations,
  isDataPagePath,
  readArticleFields,
  studySlugsFromRegistry,
} from "../src/content/affiliate-policy.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function nutritionSchemaSlice(source) {
  const start = source.indexOf("nutrition: article.data.calories");
  const end = source.indexOf("keywords:", start);
  if (start < 0 || end < start) {
    throw new Error("Recipe nutrition schema block was not found in src/pages/[slug].astro");
  }
  return source.slice(start, end);
}

export function findAffiliateViolations(root = ROOT) {
  const studySlugs = studySlugsFromRegistry(
    readFileSync(join(root, "src", "content", "datasets.ts"), "utf8"),
  );
  const articles = walk(join(root, "src", "data", "articles"))
    .filter((path) => path.endsWith(".md"))
    .map((path) => {
      const slug = path.split(/[/\\]/).pop().replace(/\.md$/i, "");
      return readArticleFields(readFileSync(path, "utf8"), slug);
    });
  const dataPages = walk(join(root, "src", "pages"))
    .filter((path) => isDataPagePath(relative(root, path)))
    .map((path) => ({
      path: relative(root, path),
      source: readFileSync(path, "utf8"),
    }));
  return collectAffiliateViolations({
    articles,
    dataPages,
    recipeMetaBar: readFileSync(join(root, "src", "components", "RecipeMetaBar.astro"), "utf8"),
    nutritionSchema: nutritionSchemaSlice(
      readFileSync(join(root, "src", "pages", "[slug].astro"), "utf8"),
    ),
    studySlugs,
    enabled: ["1", "true", "yes", "on"].includes(
      String(process.env.AFFILIATE_LINKS_ENABLED || "").trim().toLowerCase(),
    ),
  });
}

const isDirect = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  const violations = findAffiliateViolations();
  if (violations.length) {
    console.error("Affiliate policy failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }
  console.error("Affiliate policy: no excluded pages opted in, no affiliate links in content.");
}
