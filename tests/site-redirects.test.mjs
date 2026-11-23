import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
    ["/frozen-vs-fresh-vegetables-fiber-cost/", "/frozen-vs-fresh-produce-when-to-buy/"],
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

  assert.equal(expected.size, 32);
  for (const [source, destination] of expected) {
    for (const pathname of [source, source.replace(/\/$/, "")]) {
      const match = matchSiteRedirect(pathname);
      assert.ok(match, pathname);
      assert.equal(match.status, 301, pathname);
      assert.equal(match.destination, destination, pathname);
    }
  }
});
