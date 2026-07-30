import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const articleUrl = new URL(
  "../src/data/articles/how-to-double-recipe-seasoning-without-guessing.md",
  import.meta.url,
);
const article = readFileSync(articleUrl, "utf8");

test("doubling guide makes the sourced rule answer-first and non-universal", () => {
  assert.match(article, /quickAnswer:\s*>-/);
  assert.match(article, /Start\s+herbs, spices, and salt at 1\.5 times/i);
  assert.match(article, /practical starting point,\s+not a universal law/i);
  assert.doesNotMatch(
    article,
    /double the meat, vegetables, grains, and liquid/i,
  );
  assert.match(
    article,
    /Treat twice the broth or water as an initial\s+ceiling, reserve some/i,
  );
  assert.match(
    article,
    /\[Mississippi State University Extension recommends increasing herbs and spices by 1\.5x when doubling\]\(https:\/\/happyhealthy\.extension\.msstate\.edu\/node\/45\)/,
  );
  assert.match(
    article,
    /\[Heart Foundation NZ gives the same starting point for spices and salt\]\(https:\/\/www\.heartfoundation\.org\.nz\/documents\/food-industry\/hospitality-hub\/recipe-adaptation-guidelines\.pdf\)/,
  );
});

test("doubling guide separates solid batch math from vessel-dependent liquid", () => {
  assert.doesNotMatch(
    article,
    /\| Meat, vegetables, grains, beans, broth, water \| 2x \|/,
  );
  assert.match(
    article,
    /\| Meat, vegetables, grains, beans \| 2x \|/,
  );
  assert.match(
    article,
    /\| Broth or water in soups, stews, and sauces \| Up to 2x as an initial ceiling \| Reserve some;/,
  );
  assert.match(
    article,
    /lower surface-area-to-volume ratio can slow reduction and may require less added liquid or a more concentrated stock/i,
  );
  assert.match(
    article,
    /four cups is the double-batch ceiling, not an instruction to pour every drop/i,
  );
});

test("rendered doubling guide keeps solids and liquids separate in HTML and FAQ schema", () => {
  const renderedUrl = new URL(
    "../dist/how-to-double-recipe-seasoning-without-guessing/index.html",
    import.meta.url,
  );
  const rendered = readFileSync(renderedUrl, "utf8");

  assert.match(
    rendered,
    /Treat twice the broth or water as an initial\s+ceiling, reserve some/i,
  );
  assert.match(
    rendered,
    /<td>Meat, vegetables, grains, beans<\/td><td[^>]*>2x<\/td>/i,
  );
  assert.match(
    rendered,
    /<td>Broth or water in soups, stews, and sauces<\/td><td[^>]*>Up to 2x as an initial ceiling<\/td><td>Reserve some; add it as needed to match the original consistency<\/td>/i,
  );
  assert.match(
    rendered,
    /lower surface-area-to-volume ratio can slow reduction and may require less added liquid or a more concentrated stock/i,
  );
  assert.match(
    rendered,
    /href="https:\/\/happyhealthy\.extension\.msstate\.edu\/node\/45"/i,
  );
  assert.match(
    rendered,
    /href="https:\/\/www\.heartfoundation\.org\.nz\/documents\/food-industry\/hospitality-hub\/recipe-adaptation-guidelines\.pdf"/i,
  );
  assert.doesNotMatch(
    rendered,
    /(?:ifas\.ufl\.edu|University of Florida IFAS)/i,
    "Rendered attribution must not regress to the dead UF/IFAS source",
  );
  assert.doesNotMatch(
    rendered,
    /<td>Meat, vegetables, grains, beans, broth, water<\/td><td[^>]*>2x<\/td>/i,
  );
  assert.doesNotMatch(
    rendered,
    /Meat, vegetables, grains, beans, broth, water\s*\|\s*2x/i,
  );

  const jsonLdBlocks = [
    ...rendered.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].map((match) => JSON.parse(match[1]));
  const renderedJsonLd = JSON.stringify(jsonLdBlocks);

  assert.match(renderedJsonLd, /"@type":"FAQPage"/);
  assert.match(
    renderedJsonLd,
    /treat 2x broth or water as an initial ceiling and reserve some/i,
  );
  assert.doesNotMatch(
    renderedJsonLd,
    /double the meat, vegetables, grains, and liquid/i,
  );
});

test("doubling guide separates baking, preservation, and food-safety rules", () => {
  assert.match(article, /## Baking needs its own scaling rule/);
  assert.match(article, /two separate batches are the predictable option/i);
  assert.match(article, /## Don't improvise with canning or pickling/);
  assert.match(article, /not alter the proportions of vinegar, food, or water/i);
  assert.match(
    article,
    /https:\/\/nchfp\.uga\.edu\/how\/pickle\/general-information-pickling\/general-information-on-pickling\//,
  );
  assert.match(
    article,
    /https:\/\/www\.fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/safe-temperature-chart/,
  );
  assert.match(
    article,
    /https:\/\/www\.fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/refrigeration/,
  );
  assert.match(article, /dateModified: 2026-07-30/);
});

test("doubling guide removes invented experience and unsupported absolutes", () => {
  const bannedClaims = [
    /\bwhen I\b/i,
    /\bI (?:ruined|learned|tested|found|discovered)\b/i,
    /golden rule/i,
    /flavors don't scale in a straight line/i,
    /heat spreads further than you expect/i,
    /fresh herbs[^|\n]*2x/i,
    /warm spices read louder/i,
    /the same salt-to-food ratio ends up tasting saltier/i,
  ];

  for (const claim of bannedClaims) {
    assert.doesNotMatch(article, claim);
  }

  assert.doesNotMatch(article, /\u2014/, "David Miller copy cannot use em dashes");
});
