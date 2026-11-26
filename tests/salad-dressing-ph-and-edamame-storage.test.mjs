import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function field(markdown, name) {
  const match = markdown.match(
    new RegExp(`^${name}:\\s*["']?([^"'\\n#]+?)["']?\\s*$`, "m"),
  );
  return match ? match[1].trim() : null;
}

function body(markdown) {
  const match = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match ? match[1] : markdown;
}

function section(markdown, heading) {
  const start = markdown.indexOf(`## ${heading}`);
  assert.ok(start >= 0, `missing heading: ${heading}`);
  const rest = markdown.slice(start + heading.length + 3);
  const next = rest.search(/\n## /);
  return next === -1 ? rest : rest.slice(0, next);
}

function visibleWords(markdown) {
  const text = markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_]/g, "");
  return text.split(/\s+/).filter(Boolean);
}

const dressing = read("src/data/articles/how-to-store-homemade-salad-dressing-safely.md");
const salad = read("src/data/articles/cucumber-edamame-salad-sesame.md");
const tahini = read("src/data/articles/high-fiber-salad-dressings-homemade.md");
const pear = read("src/data/articles/pear-salad-with-walnuts-fiber-rich.md");
const indian = read("src/data/articles/healthy-homemade-indian-salad-dressing-recipes.md");
const packed = read("src/data/articles/how-to-pack-salad-for-work-not-soggy.md");

test("dressing sodium and pH section keeps the title and moves both dates together", () => {
  assert.equal(
    field(dressing, "title"),
    "Homemade Dressing Fridge Life: 2 Weeks, 1 Week, 3-4 Days",
  );
  assert.equal(field(dressing, "author"), "David Miller");
  assert.equal(field(dressing, "dateModified"), "2026-11-26");
  assert.equal(field(dressing, "substantiveUpdate"), "2026-11-26");
  assert.equal(dressing.includes("FAQPage"), false);
  assert.equal(dressing.includes(".csv"), false);

  const answer = section(
    dressing,
    "How much sodium and sugar do homemade vinaigrettes save vs. bottled dressing, and what pH keeps them safe?",
  );
  const paragraph = answer.trim().split(/\n\s*\n/)[0];
  const words = visibleWords(paragraph);
  assert.ok(words.length >= 40 && words.length <= 60, `dressing answer is ${words.length} words`);
  assert.match(paragraph, /14\.7 g/);
  assert.match(paragraph, /FDC 171019/);
  assert.match(paragraph, /150 mg sodium and 2 g sugar/);
  assert.match(paragraph, /FDC 171413/);
  assert.match(paragraph, /pH 4\.6 or below/);
  assert.match(paragraph, /21 CFR 114/);
  assert.match(paragraph, /Food Code/);
  assert.match(paragraph, /Clostridium botulinum/);
  assert.match(paragraph, /pH 5\.3 to 6\.7/);
  assert.match(paragraph, /4 days/);
  assert.match(answer, /FDC 2066636/);
  assert.match(answer, /510 mg/);
  assert.match(answer, /FDC 2164710/);
  assert.match(answer, /230 mg/);
  assert.match(answer, /FDC 173592/);
  assert.equal((answer.match(/^\| /gm) ?? []).length >= 6, true);
  assert.equal(answer.includes("](/"), false, "this section should not add an internal article link");
  assert.equal(answer.includes("#"), false);
});

test("cucumber edamame storage table keeps the recipe card and both dates", () => {
  assert.equal(
    field(salad, "title"),
    "Japanese-Inspired Cucumber and Edamame Salad With Sesame",
  );
  assert.equal(
    field(salad, "excerpt"),
    "Salted cucumbers and shelled edamame with a sesame dressing. One of four servings is about 6.7 g protein and 3.2 g fiber (USDA).",
  );
  assert.equal(field(salad, "author"), "David Miller");
  assert.equal(field(salad, "dateModified"), "2026-11-26");
  assert.equal(field(salad, "substantiveUpdate"), "2026-11-26");
  assert.match(salad, /fdcId: 168409/);
  assert.match(salad, /grams: 602/);
  assert.match(salad, /fdcId: 168410/);
  assert.match(salad, /grams: 177/);
  assert.equal(salad.includes("FAQPage"), false);
  assert.equal(salad.includes(".csv"), false);

  const answer = section(
    salad,
    "How long does cucumber edamame salad keep in the fridge without turning watery?",
  );
  const paragraph = answer.trim().split(/\n\s*\n/)[0];
  const words = visibleWords(paragraph);
  assert.ok(words.length >= 40 && words.length <= 60, `salad answer is ${words.length} words`);
  assert.match(paragraph, /10 minutes/);
  assert.match(paragraph, /FDC 168409/);
  assert.match(paragraph, /95\.23 g water per 100 g/);
  assert.match(paragraph, /177 g of shelled edamame/);
  assert.match(paragraph, /FDC 168410/);
  assert.match(paragraph, /6\.7 g protein and 3\.2 g fiber/);
  assert.match(paragraph, /FoodSafety\.gov/);
  assert.match(paragraph, /3 to 4 days/);
  assert.match(answer, /FDC 171016/);
  assert.match(answer, /FDC 170150/);
  assert.equal((answer.match(/^\| /gm) ?? []).length >= 6, true);
  assert.equal(answer.includes("#"), false);
});

test("contextual links stay on canonical paths and do not move source dates", () => {
  assert.equal(field(tahini, "dateModified"), "2026-07-12");
  assert.equal(field(tahini, "substantiveUpdate"), null);
  assert.match(tahini, /\]\(\/cucumber-edamame-salad-sesame\/\)/);
  assert.equal(tahini.includes("](/cucumber-edamame-salad-sesame/#"), false);

  assert.equal(field(pear, "dateModified"), "2026-07-20");
  assert.equal(field(pear, "substantiveUpdate"), null);
  assert.match(pear, /\]\(\/cucumber-edamame-salad-sesame\/\)/);
  assert.equal(pear.includes("](/cucumber-edamame-salad-sesame/#"), false);

  assert.equal(field(indian, "dateModified"), "2026-09-23");
  assert.equal(field(indian, "substantiveUpdate"), null);
  assert.match(indian, /\]\(\/how-to-store-homemade-salad-dressing-safely\/\)/);

  assert.equal(field(packed, "dateModified"), "2026-11-25");
  assert.equal(field(packed, "substantiveUpdate"), "2026-11-25");
  assert.match(packed, /\]\(\/how-to-store-homemade-salad-dressing-safely\/\)/);
});
