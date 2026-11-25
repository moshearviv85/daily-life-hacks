import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const BEAN_EXCERPT =
  "Soak dried beans 8-12 hours, then simmer: black or pinto 1 to 1.5 hours, chickpeas 1.5 to 2 hours. No soak? Plan an extra hour, or use the quick-soak method.";
const PIZZA_EXCERPT =
  "Sourdough discard pizza dough without added yeast, ready in about 40 minutes. Mix discard, flour, baking powder, salt, and oil; roll thin and bake hot.";

const INLINKS = [
  ["can-you-eat-rice-and-beans-everyday", "2026-11-25", "2026-11-25"],
  ["what-50-grams-of-protein-costs-per-day", "2026-09-24", undefined],
  ["protein-per-dollar-adjusted-for-quality", "2026-11-23", "2026-11-23"],
  ["beans-double-win-fiber-protein", "2026-09-24", undefined],
  ["how-to-quick-soak-dried-beans-same-day", undefined, undefined],
];

const TIME_SOURCES = [
  "https://food.unl.edu/article/how-cook-dry-beans-scratch/",
  "https://usdrybeans.com/bean-varieties/",
  "https://extension.umaine.edu/publications/4183e/",
  "https://www.ndsu.edu/agriculture/extension/publications/pocket-guide-preparing-pulse-foods",
  "https://www.ndsu.edu/agriculture/extension/publications/field-fork-pressure-cook-dry-beans-save-money-and-time",
  "https://usapulseseu.org/wp-content/uploads/2025/04/simple-guide-cooking-pulses.pdf",
  "https://www.montana.edu/extension/nutrition/nutrition-cooking-culture/documents/mim_montguide_with_recipes.pdf",
  "https://beaufort.ces.ncsu.edu/news/using-beans-peas-and-lentils-instead-of-meat/",
];

function readArticle(slug) {
  return readFileSync(join(ROOT, "src/data/articles", `${slug}.md`), "utf8");
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "article is missing frontmatter");
  return match[1];
}

function field(markdown, name) {
  const lines = frontmatter(markdown).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith(`${name}:`)) continue;
    const rest = lines[i].slice(name.length + 1).trim();
    if (
      (rest.startsWith('"') && rest.endsWith('"')) ||
      (rest.startsWith("'") && rest.endsWith("'"))
    ) {
      return rest.slice(1, -1);
    }
    return rest;
  }
  return undefined;
}

function words(value) {
  return value.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) ?? [];
}

test("dried bean cook-time page has the sourced table, two-day answer, and description", () => {
  const markdown = readArticle("how-to-cook-dried-beans-from-scratch");
  assert.equal(field(markdown, "excerpt"), BEAN_EXCERPT);
  assert.equal(BEAN_EXCERPT.length, 157);
  assert.equal(field(markdown, "title"), "How to Cook Dried Beans From Scratch");
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), "2026-11-25");
  assert.equal(field(markdown, "substantiveUpdate"), "2026-11-25");
  assert.equal(field(markdown, "image"), "/images/how-to-cook-dried-beans-from-scratch-main.jpg");
  assert.doesNotMatch(markdown, /FAQPage|photograph|real photo/i);
  assert.doesNotMatch(markdown, /\u2014/);

  const heading = "## How long do dried beans take to cook?";
  const at = markdown.indexOf(heading);
  assert.ok(at !== -1, "missing cook-time heading");
  const answer = markdown.slice(at + heading.length).trimStart().split(/\n\s*\n/)[0];
  const count = words(answer).length;
  assert.ok(count >= 40 && count <= 60, `answer is ${count} words`);
  assert.match(answer, /refrigerate/i);
  assert.match(answer, /change the water/i);
  assert.match(answer, /48 hours/);
  assert.match(answer, /smells off/i);

  const tableAt = markdown.indexOf("| Bean | Soaked stovetop | Unsoaked stovetop | Pressure cooker |");
  assert.ok(tableAt > at, "table should follow the question heading");
  const table = markdown.slice(tableAt).split(/\n\s*\n/)[0];
  for (const row of ["Black", "Pinto", "Kidney", "Navy", "Chickpeas", "Lentils (no soak)", "Split peas (no soak)"]) {
    assert.match(table, new RegExp(`^\\| ${row.replace(/[()]/g, "\\$&")} \\|`, "m"), row);
  }
  for (const line of table.split("\n").filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Soaked stovetop"))) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    assert.equal(cells.length, 4, line);
    for (const cell of cells.slice(1)) {
      assert.match(cell, /\]\(https?:\/\/[^)]+\)/, cell);
    }
  }
  for (const url of TIME_SOURCES) assert.match(markdown, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(markdown, /\]\(\/tools\/dried-beans-to-canned-converter\/\)/);
  assert.match(markdown, /\]\(\/canned-beans-vs-dried-beans-nutrition\/\)/);
  assert.match(markdown, /\]\(\/how-to-quick-soak-dried-beans-same-day\/\)/);
});

test("pizza dough description is excerpt-only and does not move the modified day", () => {
  const markdown = readArticle("easy-sourdough-discard-pizza-dough-no-yeast");
  assert.equal(field(markdown, "excerpt"), PIZZA_EXCERPT);
  assert.equal(PIZZA_EXCERPT.length, 151);
  assert.match(PIZZA_EXCERPT, /without added yeast, ready in about 40 minutes/);
  assert.equal(field(markdown, "title"), "Sourdough Discard Pizza Dough Without Added Yeast");
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), "2026-11-23");
  assert.equal(field(markdown, "substantiveUpdate"), undefined);
  assert.doesNotMatch(markdown, /FAQPage/);
});

test("new dried-bean inlinks come from indexable pages and do not bump dates", () => {
  for (const [slug, dateModified, substantiveUpdate] of INLINKS) {
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${slug} is noindex`);
    const markdown = readArticle(slug);
    assert.match(markdown, /\]\(\/how-to-cook-dried-beans-from-scratch\/\)/, slug);
    assert.equal(field(markdown, "dateModified"), dateModified, `${slug} dateModified`);
    assert.equal(field(markdown, "substantiveUpdate"), substantiveUpdate, `${slug} substantiveUpdate`);
    assert.equal(field(markdown, "author"), "David Miller", slug);
  }
});

test("built bean and pizza pages publish the descriptions and no FAQPage", () => {
  const beanHtmlPath = join(ROOT, "dist/how-to-cook-dried-beans-from-scratch/index.html");
  const pizzaHtmlPath = join(ROOT, "dist/easy-sourdough-discard-pizza-dough-no-yeast/index.html");
  if (!existsSync(beanHtmlPath) || !existsSync(pizzaHtmlPath)) return;

  const bean = readFileSync(beanHtmlPath, "utf8");
  const pizza = readFileSync(pizzaHtmlPath, "utf8");
  assert.match(bean, new RegExp(`<meta name="description" content="${BEAN_EXCERPT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
  assert.match(pizza, new RegExp(`<meta name="description" content="${PIZZA_EXCERPT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
  assert.match(bean, /How long do dried beans take to cook\?/);
  assert.match(bean, /<caption class="sr-only">Soaked, unsoaked, and pressure-cooker times for dried beans<\/caption>/);
  assert.match(bean, /60 to 90 min/);
  assert.match(bean, /https:\/\/food\.unl\.edu\/article\/how-cook-dry-beans-scratch\//);
  assert.doesNotMatch(bean, /FAQPage/);
  assert.doesNotMatch(pizza, /FAQPage/);
  assert.match(bean, /"dateModified":"2026-11-25T00:00:00.000Z"/);
  assert.match(pizza, /"dateModified":"2026-11-23T00:00:00.000Z"/);
});
