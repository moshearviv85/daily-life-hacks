/**
 * Write ingredientsGrams onto recipe articles the FDC resolver can finish.
 * When the published calorie figure is more than 15% from the computed
 * per-serving total, replace it with the rounded computed value.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRecipeArticles, yamlQuote } from "../src/lib/recipe-articles.mjs";
import {
  calorieGap,
  caloriesWithinTolerance,
  foodsByDescription,
  perServingTotals,
  resolveRecipeLines,
  roundNutrition,
} from "../src/lib/recipe-nutrition.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = JSON.parse(readFileSync(join(root, "src/data/fdc-cache.json"), "utf8"));
const foods = foodsByDescription(cache);
const articlesDir = join(root, "src/data/articles");
const TODAY = "2026-11-23";

function gramsBlock(rows) {
  const lines = ["ingredientsGrams:"];
  for (const row of rows) {
    lines.push(`  - item: ${yamlQuote(row.item)}`);
    lines.push(`    grams: ${row.grams}`);
    lines.push(`    fdcId: ${row.fdcId}`);
  }
  return lines.join("\n");
}

function stripGrams(markdown) {
  return markdown.replace(/\ningredientsGrams:\n(?:[ \t]+- .*\n|[ \t]+\w+:.*\n)*/g, "\n");
}

function replaceCalories(markdown, calories) {
  if (/^calories:\s*.+$/m.test(markdown)) {
    return markdown.replace(/^calories:\s*.+$/m, `calories: ${calories}`);
  }
  return markdown.replace(/^servings:\s*.+$/m, (line) => `${line}\ncalories: ${calories}`);
}

function bumpDate(markdown) {
  if (/^dateModified:\s*/m.test(markdown)) {
    return markdown.replace(/^dateModified:\s*.+$/m, `dateModified: ${TODAY}`);
  }
  return markdown.replace(/^date:\s*.+$/m, (line) => `${line}\ndateModified: ${TODAY}`);
}

function replaceBodyCalories(markdown, from, to) {
  const end = markdown.indexOf("\n---", 3);
  const front = markdown.slice(0, end + 4);
  const body = markdown.slice(end + 4);
  const next = body.replace(new RegExp(`\\b${from}\\s+(calories|kcal)\\b`, "gi"), `${to} $1`);
  return front + next;
}

const corrections = [];
const mapped = [];
const unmapped = [];

for (const article of loadRecipeArticles(articlesDir)) {
  const result = resolveRecipeLines(article.data.ingredients, foods);
  if (result.unmapped.length || !result.rows.length) {
    unmapped.push({
      slug: article.id,
      title: article.data.title,
      unmapped: result.unmapped,
    });
    let markdown = stripGrams(article.markdown);
    if (markdown !== article.markdown) writeFileSync(article.path, markdown);
    continue;
  }
  const raw = perServingTotals(result.rows, Number(article.data.servings));
  const rounded = roundNutrition(raw);
  const stated = Number(article.data.calories);
  const gap = calorieGap(stated, raw.kcal);
  let markdown = stripGrams(article.markdown);
  const block = gramsBlock(result.rows);
  if (/^calories:\s*.+$/m.test(markdown)) {
    markdown = markdown.replace(/^calories:\s*.+$/m, (line) => `${line}\n${block}`);
  } else {
    markdown = markdown.replace(/^servings:\s*.+$/m, (line) => `${line}\n${block}`);
  }
  let changedCalories = false;
  if (!caloriesWithinTolerance(stated, raw.kcal)) {
    markdown = replaceCalories(markdown, rounded.kcal);
    markdown = replaceBodyCalories(markdown, stated, rounded.kcal);
    const beforeDate = String(article.data.dateModified || "");
    if (beforeDate.slice(0, 10) !== TODAY) markdown = bumpDate(markdown);
    changedCalories = true;
    corrections.push({
      slug: article.id,
      title: article.data.recipeName || article.data.title,
      from: stated,
      to: rounded.kcal,
      gap: Number((gap * 100).toFixed(1)),
    });
  }
  writeFileSync(article.path, markdown.endsWith("\n") ? markdown : `${markdown}\n`);
  mapped.push({ slug: article.id, calories: changedCalories ? rounded.kcal : stated, computed: rounded.kcal });
}

writeFileSync(join(root, "src/data/recipe-calorie-corrections.json"), `${JSON.stringify(corrections, null, 2)}\n`);
writeFileSync(join(root, "src/data/recipe-nutrition-unmapped.json"), `${JSON.stringify(unmapped, null, 2)}\n`);
console.log(`mapped ${mapped.length}; calorie corrections ${corrections.length}; unmapped ${unmapped.length}`);
for (const row of corrections) {
  console.log(`- ${row.slug}: ${row.from} -> ${row.to} (${row.gap}%)`);
}
