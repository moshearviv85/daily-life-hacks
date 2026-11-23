import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import {
  SITE_REDIRECT_RULES,
  SITE_REDIRECT_SOURCE,
  matchSiteRedirect,
  parseRedirectRules,
} from "../functions/site-redirects.js";

const file = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");

test("the function redirect copy matches public/_redirects", () => {
  assert.equal(SITE_REDIRECT_SOURCE.trim(), file.trim());
  assert.deepEqual(SITE_REDIRECT_RULES, parseRedirectRules(file));
  assert.ok(SITE_REDIRECT_RULES.length >= 50);
  for (const rule of SITE_REDIRECT_RULES) {
    assert.equal(rule.status, 301, rule.source);
  }
});

test("every consolidation source 301s to its plain target", () => {
  const expected = new Map([
    ["/kfc-protein-per-dollar/", "/fast-food-protein-per-dollar-ranked/"],
    ["/mcdonalds-protein-per-dollar/", "/fast-food-protein-per-dollar-ranked/"],
    ["/taco-bell-protein-per-dollar/", "/fast-food-protein-per-dollar-ranked/"],
    ["/wendys-protein-per-dollar/", "/fast-food-protein-per-dollar-ranked/"],
    ["/chipotle-protein-per-dollar/", "/fast-food-protein-per-dollar-ranked/"],
    ["/tofu-vs-chicken-protein-cost/", "/protein-per-serving-beans-chicken-tofu-compared/"],
    ["/lentils-vs-chicken-breast-protein-cost/", "/protein-per-serving-beans-chicken-tofu-compared/"],
    ["/ground-beef-vs-beans-protein-cost/", "/protein-per-serving-beans-chicken-tofu-compared/"],
    ["/chicken-thighs-vs-breast-protein-cost/", "/protein-per-serving-beans-chicken-tofu-compared/"],
    ["/peanut-butter-vs-almonds-protein-cost/", "/protein-per-serving-beans-chicken-tofu-compared/"],
    ["/eggs-vs-greek-yogurt-protein-cost/", "/protein-per-serving-beans-chicken-tofu-compared/"],
    ["/canned-vs-dry-beans-cost/", "/canned-beans-vs-dried-beans-nutrition/"],
    ["/popcorn-vs-almonds-fiber-cost/", "/popcorn-vs-potato-chips-fiber-comparison/"],
    ["/frozen-vs-fresh-vegetables-fiber-cost/", "/can-you-refreeze-frozen-vegetables-after-thawing/"],
    ["/how-to-cool-rice-for-fried-rice/", "/can-you-eat-rice-and-beans-everyday/#how-long-can-cooked-rice-and-beans-sit-out"],
    ["/cauliflower-fried-rice-with-eggs/", "/high-fiber-stir-fry-vegetables/"],
    ["/freezer-meal-prep-ideas-for-beginners/", "/freezer-organization-tips-large-family-meals/"],
    ["/whole-wheat-flour-vs-quinoa-fiber-cost/", "/what-30-grams-of-fiber-costs-per-day/"],
    ["/grains-fiber-per-dollar-ranked/", "/what-30-grams-of-fiber-costs-per-day/"],
    ["/produce-fiber-per-dollar-ranked/", "/what-30-grams-of-fiber-costs-per-day/"],
    ["/high-fiber-snacks-per-dollar/", "/what-30-grams-of-fiber-costs-per-day/"],
    ["/one-dollar-fiber-what-it-buys/", "/what-30-grams-of-fiber-costs-per-day/"],
    ["/dairy-protein-per-dollar-ranked/", "/protein-per-dollar-adjusted-for-quality/"],
    ["/meat-per-dollar-protein-ranked/", "/protein-per-dollar-adjusted-for-quality/"],
    ["/plant-protein-per-dollar-ranked/", "/protein-per-dollar-adjusted-for-quality/"],
    ["/no-cook-protein-per-dollar/", "/protein-per-dollar-adjusted-for-quality/"],
    ["/shelf-stable-pantry-per-dollar/", "/protein-per-dollar-adjusted-for-quality/"],
    ["/one-dollar-protein-what-it-buys/", "/protein-per-dollar-adjusted-for-quality/"],
    ["/cheapest-protein-per-gram/", "/protein-per-dollar-adjusted-for-quality/"],
    ["/protein-per-dollar-cheapest-protein-sources/", "/protein-per-dollar-adjusted-for-quality/"],
    ["/high-protein-on-a-budget-complete-guide/", "/protein-per-dollar-adjusted-for-quality/"],
    ["/fiber-per-dollar-cheapest-high-fiber-foods/", "/what-30-grams-of-fiber-costs-per-day/"],
    ["/how-to-eat-more-fiber-on-a-budget-complete-guide/", "/what-30-grams-of-fiber-costs-per-day/"],
    ["/research/", "/data/"],
    ["/guides/", "/nutrition/"],
  ]);

  assert.equal(expected.size, 35);
  for (const [source, destination] of expected) {
    for (const pathname of [source, source.replace(/\/$/, "")]) {
      const match = matchSiteRedirect(pathname);
      assert.ok(match, pathname);
      assert.equal(match.status, 301, pathname);
      assert.equal(match.destination, destination, pathname);
    }
  }
});

/**
 * Paths that stay live with `noindex` and are not in INDEX_PRUNE_SLUGS.
 * A 301 into one of these is the same dead end as a pruned article.
 */
const NOINDEX_PATHS = new Set([
  "/contact",
  "/dashboard",
  "/data/fiber-per-dollar-2026",
  "/data/protein-per-dollar-2026",
  "/deploy-proof",
  "/disclaimer",
  "/gauntlet",
  "/printables/bean-conversion-card",
  "/printables/sourdough-discard-grams-cheat-sheet",
  "/printables/weekly-grocery-budget-planner",
  "/privacy",
  "/terms",
  "/thank-you",
]);

function redirectPath(value) {
  const path = String(value).split("#")[0].split("?")[0];
  if (!path.startsWith("/")) return path;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

test("no redirect destination is noindexed, pruned, or another redirect", () => {
  const sources = new Set(
    SITE_REDIRECT_RULES
      .filter((rule) => !rule.source.includes("*"))
      .map((rule) => redirectPath(rule.source)),
  );

  assert.equal(
    SITE_REDIRECT_RULES.filter((rule) =>
      [
        "/frozen-vs-fresh-vegetables-fiber-cost",
        "/how-to-cool-rice-for-fried-rice",
        "/cauliflower-fried-rice-with-eggs",
        "/freezer-meal-prep-ideas-for-beginners",
      ].includes(redirectPath(rule.source)),
    ).length,
    8,
  );

  for (const rule of SITE_REDIRECT_RULES) {
    const path = redirectPath(rule.destination);
    assert.equal(sources.has(path), false, `${rule.source} chains to ${rule.destination}`);
    assert.equal(NOINDEX_PATHS.has(path), false, `${rule.source} -> ${path}`);
    const slug = path.replace(/^\/+/, "");
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${rule.source} -> ${slug}`);
    assert.equal(INDEX_NOINDEX_TOOL_PATHS.has(slug), false, `${rule.source} -> ${slug}`);
    const leaf = slug.split("/").filter(Boolean).pop();
    if (leaf && leaf !== slug) {
      assert.equal(INDEX_PRUNE_SLUGS.has(leaf), false, `${rule.source} -> ${leaf}`);
    }
  }
});
