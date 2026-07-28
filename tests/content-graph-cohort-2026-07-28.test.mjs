import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const articleDirectory = join(process.cwd(), "src", "data", "articles");

const links = [
  ["hidden-sugars-popular-summer-salad-dressings", "how-to-store-homemade-salad-dressing-safely"],
  ["big-flavor-less-salt-citrus-herbs-umami-swaps", "how-to-double-recipe-seasoning-without-guessing"],
  ["sheet-pan-salmon-and-vegetables-30-minutes", "selenium-containing-foods-easy-ways"],
  ["crispy-roasted-chickpeas-high-fiber-snack", "healthy-alternatives-potato-chips-snacking"],
  ["how-to-make-sourdough-pizza-dough-same-day", "comparing-fiber-content-different-pizza-crusts"],
  ["cheap-crockpot-meals-large-families", "best-low-cost-protein-sources-large-families"],
  ["sheet-pan-breakfast-hash-with-eggs-and-sweet-potatoes", "baking-sheet-liners-parchment-silicone-when-to-use"],
];

test("the fixed growth cohort has one contextual source link per supported target", () => {
  assert.equal(links.length, 7);

  for (const [source, target] of links) {
    const sourcePath = join(articleDirectory, `${source}.md`);
    const targetPath = join(articleDirectory, `${target}.md`);
    assert.equal(existsSync(sourcePath), true, `missing source article: ${source}`);
    assert.equal(existsSync(targetPath), true, `missing target article: ${target}`);

    const sourceBody = readFileSync(sourcePath, "utf8");
    const matches = sourceBody.match(new RegExp(`\\]\\(\\/${target}\\/\\)`, "g")) ?? [];
    assert.equal(matches.length, 1, `${source} should link to ${target} exactly once`);
  }
});

test("the unsupported tea candidate isn't force-linked from an unrelated article", () => {
  for (const [source] of links) {
    const sourceBody = readFileSync(join(articleDirectory, `${source}.md`), "utf8");
    assert.equal(
      sourceBody.includes("](/gut-health-tea-peppermint-ginger/)"),
      false,
      `${source} shouldn't receive an unrelated tea link`,
    );
  }
});
