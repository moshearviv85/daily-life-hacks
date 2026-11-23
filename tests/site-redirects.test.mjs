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
    ["/whole-wheat-flour-vs-quinoa-fiber-cost/", "/fiber-per-dollar-cheapest-high-fiber-foods/"],
    ["/grains-fiber-per-dollar-ranked/", "/fiber-per-dollar-cheapest-high-fiber-foods/"],
    ["/produce-fiber-per-dollar-ranked/", "/fiber-per-dollar-cheapest-high-fiber-foods/"],
    ["/high-fiber-snacks-per-dollar/", "/fiber-per-dollar-cheapest-high-fiber-foods/"],
    ["/one-dollar-fiber-what-it-buys/", "/fiber-per-dollar-cheapest-high-fiber-foods/"],
    ["/dairy-protein-per-dollar-ranked/", "/protein-per-dollar-cheapest-protein-sources/"],
    ["/meat-per-dollar-protein-ranked/", "/protein-per-dollar-cheapest-protein-sources/"],
    ["/plant-protein-per-dollar-ranked/", "/protein-per-dollar-cheapest-protein-sources/"],
    ["/no-cook-protein-per-dollar/", "/protein-per-dollar-cheapest-protein-sources/"],
    ["/shelf-stable-pantry-per-dollar/", "/protein-per-dollar-cheapest-protein-sources/"],
    ["/one-dollar-protein-what-it-buys/", "/protein-per-dollar-cheapest-protein-sources/"],
    ["/cheapest-protein-per-gram/", "/protein-per-dollar-cheapest-protein-sources/"],
  ]);

  assert.equal(expected.size, 26);
  for (const [source, destination] of expected) {
    for (const pathname of [source, source.replace(/\/$/, "")]) {
      const match = matchSiteRedirect(pathname);
      assert.ok(match, pathname);
      assert.equal(match.status, 301, pathname);
      assert.equal(match.destination, destination, pathname);
    }
  }
});
