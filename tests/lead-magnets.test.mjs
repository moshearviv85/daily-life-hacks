import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { earlySignupNode } from "../src/content/early-signup-form.mjs";
import {
  fridgeLifeFacts,
  SMOKE_POINT_ROWS,
  smokePointFacts,
} from "../src/content/lead-magnet-data.mjs";
import {
  buildFridgeLifePdf,
  buildSmokePointPdf,
  decodePdfLiterals,
} from "../src/content/lead-magnet-pdf.mjs";
import { signupContextFromMarkdown, earlySignupPlan } from "../src/content/newsletter-variant.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("every lead-magnet figure is copied from the cited page", () => {
  const facts = [...smokePointFacts(), ...fridgeLifeFacts()];
  assert.ok(facts.length > 40);
  for (const fact of facts) {
    assert.equal(read(fact.file).includes(fact.text), true, `${fact.text} missing from ${fact.file}`);
  }
  assert.equal(SMOKE_POINT_ROWS.filter((row) => row.point.includes("°F")).length, 22);
});

test("both PDFs contain those same figures and match the committed downloads", () => {
  const smoke = buildSmokePointPdf();
  const fridge = buildFridgeLifePdf();
  const smokeText = decodePdfLiterals(smoke);
  const fridgeText = decodePdfLiterals(fridge);

  for (const fact of smokePointFacts()) {
    assert.equal(smokeText.includes(fact.text), true, fact.text);
  }
  for (const fact of fridgeLifeFacts()) {
    assert.equal(fridgeText.includes(fact.text), true, fact.text);
  }
  assert.equal(smokeText.includes("489°F"), true);
  assert.doesNotMatch(smokeText, /520°F/);

  assert.deepEqual(fs.readFileSync(path.join(ROOT, "public/downloads/smoke-point-chart.pdf")), smoke);
  assert.deepEqual(fs.readFileSync(path.join(ROOT, "public/downloads/fridge-life-card.pdf")), fridge);
});

test("the early signup node is compact, static, and marked placement=early", () => {
  const node = earlySignupNode({
    variant: "oils",
    category: "nutrition",
    baseSlug: "cooking-oils-smoke-points-best-uses",
  });
  assert.equal(node.properties.dataSignupPlacement, "early");
  assert.equal(node.properties.dataSignupOffer, "oils");
  assert.equal(node.tagName, "section");
  const headings = node.children.filter((child) => child.tagName === "h2");
  assert.equal(headings.length, 1);
  assert.equal(earlySignupNode({ variant: "generic" }), null);
});

test("real top landing pages map to the matching offer", () => {
  const expected = {
    "high-fiber-bran-muffins-that-taste-good": ["fiber", "after-table"],
    "cooking-oils-smoke-points-best-uses": ["oils", "after-table"],
    "high-fiber-fast-food-options-guide": ["fiber", "after-table"],
    "easy-sourdough-discard-recipes-beginners": ["sourdough", "after-table"],
    "healthy-alternatives-potato-chips-snacking": ["fiber", "after-table"],
    "savory-chia-seed-recipes-breakfast": ["fiber", "after-quick-answer"],
    "how-to-store-homemade-salad-dressing-safely": ["storage", "after-table"],
    "canned-beans-vs-dried-beans-nutrition": ["beans", "after-table"],
    "high-fiber-yogurt-parfait-for-breakfast": ["fiber", "after-table"],
    "how-to-keep-sandwiches-from-getting-soggy": ["storage", "after-quick-answer"],
    "artichoke-recipes-for-gut-health": ["fiber", "after-quick-answer"],
    "how-to-quick-soak-dried-beans-same-day": ["beans", "after-first-paragraph"],
    "costco-rotisserie-chicken-meal-ideas-dinner": ["budget", "after-table"],
  };

  for (const [slug, [variant, where]] of Object.entries(expected)) {
    const raw = read(`src/data/articles/${slug}.md`);
    const plan = earlySignupPlan(signupContextFromMarkdown(slug, raw));
    assert.deepEqual(plan, { variant, where }, slug);
  }

  const selenium = earlySignupPlan(
    signupContextFromMarkdown(
      "selenium-containing-foods-easy-ways",
      read("src/data/articles/selenium-containing-foods-easy-ways.md"),
    ),
  );
  assert.equal(selenium, null);
});
