/**
 * Print which recipe pages resolve to a full FDC gram list.
 * Reads article frontmatter. Does not write files.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calorieGap,
  foodsByDescription,
  perServingTotals,
  resolveRecipeLines,
  roundNutrition,
} from "../src/lib/recipe-nutrition.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = JSON.parse(readFileSync(join(root, "src/data/fdc-cache.json"), "utf8"));
const foods = foodsByDescription(cache);
const dir = join(root, "src/data/articles");

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) return null;
  const end = markdown.indexOf("\n---", 3);
  if (end < 0) return null;
  const fm = markdown.slice(3, end);
  const data = {};
  const lines = fm.split("\n");
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }
    const key = match[1];
    const rest = match[2];
    if (rest === "") {
      const items = [];
      let cursor = index + 1;
      while (cursor < lines.length && /^\s*-\s+/.test(lines[cursor]) && !/^\s*-\s+\w+:/.test(lines[cursor])) {
        let value = lines[cursor].replace(/^\s*-\s+/, "");
        cursor += 1;
        while (
          cursor < lines.length
          && /^\s+\S/.test(lines[cursor])
          && !/^\s*-\s+/.test(lines[cursor])
          && !/^[A-Za-z0-9_]+:/.test(lines[cursor])
        ) {
          value += ` ${lines[cursor].trim()}`;
          cursor += 1;
        }
        items.push(value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
      }
      if (items.length) {
        data[key] = items;
        index = cursor;
        continue;
      }
    }
    data[key] = rest.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    index += 1;
  }
  return data;
}

const mapped = [];
const skipped = [];
const reasons = new Map();

for (const name of readdirSync(dir).filter((file) => file.endsWith(".md")).sort()) {
  const id = name.replace(/\.md$/, "");
  const data = parseFrontmatter(readFileSync(join(dir, name), "utf8"));
  if (!data) continue;
  const ingredients = data.ingredients;
  const steps = data.steps;
  const isCatalog = data.category === "recipes";
  const isRecipe = (isCatalog && ingredients?.length && steps?.length)
    || (!isCatalog && ingredients?.length && steps?.length && String(data.recipeCategory || "").trim());
  if (!isRecipe) continue;
  const result = resolveRecipeLines(ingredients, foods);
  if (result.unmapped.length || !result.rows.length) {
    skipped.push({ id, unmapped: result.unmapped, rows: result.rows.length });
    for (const miss of result.unmapped) {
      const key = miss.reason;
      reasons.set(key, (reasons.get(key) || 0) + 1);
    }
    continue;
  }
  const raw = perServingTotals(result.rows, Number(data.servings));
  const rounded = roundNutrition(raw);
  const stated = Number(data.calories);
  mapped.push({
    id,
    stated,
    computed: rounded.kcal,
    gap: calorieGap(stated, raw.kcal),
    rows: result.rows.length,
    omitted: result.omitted.length,
  });
}

console.log(`mapped ${mapped.length} skipped ${skipped.length}`);
console.log("--- over 15% ---");
for (const row of mapped.filter((item) => item.gap > 0.15)) {
  console.log(`${row.id} stated ${row.stated} computed ${row.computed} gap ${(row.gap * 100).toFixed(1)}%`);
}
console.log("--- skipped ---");
for (const row of skipped) {
  console.log(`\n${row.id} (${row.rows} mapped rows)`);
  for (const miss of row.unmapped) console.log(`  - ${miss.reason} :: ${miss.item}`);
}
console.log("\n--- reason counts ---");
for (const [reason, count] of [...reasons.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${count}  ${reason}`);
}
