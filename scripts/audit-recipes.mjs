import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, "src", "data", "articles");

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function listMarkdownFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => path.join(dir, e.name));
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) return { data: null, body: markdown };
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return { data: null, body: markdown };
  const fm = markdown.slice(3, end + 1);
  const body = markdown.slice(end + 4);

  // Minimal frontmatter parse: key: value / key: "value"
  const data = {};
  for (const line of fm.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const raw = m[2].trim();
    const unquoted = raw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    data[key] = unquoted;
  }

  return { data, fm, body };
}

function looksLikeRecipeBody(body) {
  // We only flag when it looks like a *full recipe*, not just "tips" content
  // that happens to include a list.
  const hasIngredientsSection =
    /(^|\n)#+\s+Ingredients\b/i.test(body) ||
    /\*\*Dry Stuff:\*\*/i.test(body) ||
    /\*\*Wet Stuff:\*\*/i.test(body);

  const hasStepsSection =
    /(^|\n)#+\s+(Instructions|Directions|Method)\b/i.test(body) ||
    /(^|\n)#+\s+The How[-–]To\b/i.test(body);

  const hasNumberedSteps =
    /^\s*\d+\.\s+/m.test(body) || /^\s*-\s+Step\s+\d+/im.test(body);

  return hasIngredientsSection && (hasStepsSection || hasNumberedSteps);
}

function hasYamlKeyBlock(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*$`, "m");
  return re.test(frontmatter);
}

function hasYamlScalar(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*.+$`, "m");
  return re.test(frontmatter);
}

function main() {
  const files = listMarkdownFiles(ARTICLES_DIR);
  const candidates = [];
  const recipeMissingFields = [];
  let recipeCount = 0;

  for (const filePath of files) {
    const id = path.basename(filePath, ".md");
    const { data, fm, body } = parseFrontmatter(readFile(filePath));
    if (!data) continue;

    const category = String(data.category || "");
    const hasStructuredRecipe =
      hasYamlKeyBlock(fm, "ingredients") ||
      hasYamlKeyBlock(fm, "steps") ||
      hasYamlScalar(fm, "prepTime") ||
      hasYamlScalar(fm, "cookTime") ||
      hasYamlScalar(fm, "servings");

    if (category === "recipes") {
      recipeCount += 1;
      // We expect these to be structured. (The page renderer relies on ingredients + steps.)
      const missing = [];
      if (!hasYamlKeyBlock(fm, "ingredients")) missing.push("ingredients");
      if (!hasYamlKeyBlock(fm, "steps")) missing.push("steps");
      if (missing.length) {
        recipeMissingFields.push({ id, filePath, missing });
      }
      continue;
    }

    if (looksLikeRecipeBody(body) && !hasStructuredRecipe) {
      candidates.push({ id, filePath, category });
    }
  }

  const summary = {
    total_posts_scanned: files.length,
    recipes_declared: recipeCount,
    recipe_schema_missing_fields: recipeMissingFields.length,
    recipe_like_posts_not_declared: candidates.length,
  };

  if (recipeMissingFields.length) {
    console.error("[audit-recipes] ERROR: recipe entries missing structured fields:");
    for (const item of recipeMissingFields) {
      console.error(
        `- ${item.id} (${path.relative(ROOT, item.filePath)}): missing ${item.missing.join(", ")}`,
      );
    }
    console.error(`[audit-recipes] Summary: ${JSON.stringify(summary)}`);
    process.exit(1);
  }

  if (candidates.length) {
    console.log(
      `[audit-recipes] Found ${candidates.length} non-recipe posts that look like they contain a recipe section (manual review needed):`,
    );
    for (const item of candidates) {
      console.log(
        `- ${item.id} (${item.category}) -> ${path.relative(ROOT, item.filePath)}`,
      );
    }
    console.log(`[audit-recipes] Summary: ${JSON.stringify(summary)}`);
    process.exit(2);
  }

  console.log("[audit-recipes] OK: no suspicious recipe-like posts found.");
  console.log(`[audit-recipes] Summary: ${JSON.stringify(summary)}`);
}

main();

