import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const slug = "sourdough-discard-cinnamon-rolls-no-yeast";
const articlePath = join("src/data/articles", `${slug}.md`);
const source = readFileSync(articlePath, "utf8");
const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");

const clusterPages = [
  "sourdough-discard-recipes-no-yeast",
  "easy-sourdough-discard-recipes-beginners",
  "easy-sourdough-discard-pizza-dough-no-yeast",
  "how-to-measure-sourdough-discard-grams",
];

test("no-yeast cinnamon rolls are a gram recipe by David Miller", () => {
  assert.match(source, /^author: "David Miller"$/m);
  assert.match(source, /^category: recipes$/m);
  assert.match(source, /^recipeCategory: "Breakfast"$/m);
  assert.match(source, /^image: "\/images\/sourdough-discard-cinnamon-rolls-no-yeast-main\.jpg"$/m);
  assert.match(source, /Illustration of eight golden cinnamon rolls/);
  assert.doesNotMatch(source, /photograph|photo of/i);
  assert.match(body, /240 g/);
  assert.match(body, /baking powder/i);
  assert.match(body, /baking soda/i);
  assert.match(body, /as soon as the dough is wet/);
  assert.match(body, /350 degrees F/);
  assert.doesNotMatch(source, /FAQPage/);
});

test("the discard cluster links the new cinnamon rolls in the body", () => {
  for (const page of clusterPages) {
    const pageSource = readFileSync(join("src/data/articles", `${page}.md`), "utf8");
    const pageBody = pageSource.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
    assert.match(pageBody, new RegExp(`\\(/${slug}/\\)`), page);
  }
  const hub = readFileSync(
    join("src/data/articles", "sourdough-discard-recipes-no-yeast.md"),
    "utf8",
  );
  assert.match(hub, /farmhouseonboone\.com\/quick-sourdough-discard-cinnamon-rolls/);
  assert.doesNotMatch(
    hub,
    /\|\s*\[Quick cinnamon rolls\]\(https:\/\/www\.farmhouseonboone\.com/,
  );
});
