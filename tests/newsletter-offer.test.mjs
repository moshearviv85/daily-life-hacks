import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  isBeanConversionSlug,
  newsletterSignupForArticle,
} from "../src/content/newsletter-variant.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("article offers match the topic, and bean sides stay off the conversion card", () => {
  assert.equal(
    newsletterSignupForArticle({ slug: "how-to-measure-sourdough-discard-grams" }),
    "sourdough",
  );
  assert.equal(
    newsletterSignupForArticle({
      slug: "easy-sourdough-discard-recipes-beginners",
      tags: ["fiber"],
      title: "A high fiber use for discard",
    }),
    "sourdough",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "how-to-cook-dried-beans-from-scratch" }),
    "beans",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "black-bean-brownies-hidden-fiber-dessert" }),
    "beans",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "canned-beans-vs-dried-beans-nutrition" }),
    "beans",
  );
  assert.equal(isBeanConversionSlug("baked-cod-lemon-capers-green-beans"), false);
  assert.equal(
    newsletterSignupForArticle({ slug: "baked-cod-lemon-capers-green-beans" }),
    "generic",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "natto-japanese-fermented-soybeans-gut-health" }),
    "generic",
  );
  assert.equal(
    newsletterSignupForArticle({
      slug: "how-to-eat-more-fiber-on-a-budget-complete-guide",
    }),
    "fiber",
  );
  assert.equal(
    newsletterSignupForArticle({
      slug: "high-fiber-bran-muffins-that-taste-good",
      cluster: "budget-fiber",
    }),
    "fiber",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "how-to-store-fresh-ginger" }),
    "generic",
  );
});

test("article pages keep one signup, at the end of the body, with no footer form", () => {
  const page = read("src/pages/[slug].astro");
  assert.match(page, /placement="inline"/);
  assert.match(page, /!flagship\?\.emailCapture/);
  assert.match(page, /<Footer signup="none" \/>/);
  assert.doesNotMatch(page, /signup=\{newsletterSignup\}/);
});

test("the five pages that lost the popup get one generic subscribe form", () => {
  const restored = [
    "src/pages/printables/weekly-grocery-budget-planner/index.astro",
    "src/pages/food-value-database/index.astro",
    "src/pages/data/index.astro",
    "src/pages/data/[stem]/index.astro",
  ];
  for (const file of restored) {
    const page = read(file);
    assert.match(page, /signup="generic"/, file);
    assert.doesNotMatch(page, /signup="none"/, file);
  }

  const apiDocs = read("src/pages/api-docs.astro");
  assert.match(apiDocs, /signup="none"/);
  assert.doesNotMatch(apiDocs, /signup="generic"/);
});

test("new printables use published kitchen figures and the thank-you page links to them", () => {
  const sourdough = read("src/pages/printables/sourdough-discard-grams-cheat-sheet/index.astro");
  assert.match(sourdough, /113 g/);
  assert.match(sourdough, /227 g/);
  assert.match(sourdough, /CUP_GRAMS/);
  assert.match(sourdough, /signup="none"/);
  assert.doesNotMatch(sourdough, /FAQPage|aggregateRating/);

  const beans = read("src/pages/printables/bean-conversion-card/index.astro");
  assert.match(beans, /CUPS_COOKED_PER_POUND/);
  assert.match(beans, /CANS_PER_DRY_POUND/);
  assert.match(beans, /CUPS_COOKED_PER_CAN/);
  assert.match(beans, /signup="none"/);
  assert.doesNotMatch(beans, /FAQPage|aggregateRating/);

  const thanks = read("src/pages/thank-you.astro");
  assert.match(thanks, /\/printables\/sourdough-discard-grams-cheat-sheet\//);
  assert.match(thanks, /\/printables\/bean-conversion-card\//);
  assert.match(thanks, /href: "\/downloads\/7-day-high-fiber-meal-plan\.pdf"/);
  assert.match(thanks, /signup="none"/);
});

test("signup forms still post to /api/subscribe", () => {
  const newsletter = read("src/components/Newsletter.astro");
  assert.match(newsletter, /fetch\("\/api\/subscribe"/);
  assert.match(newsletter, /Get the Sourdough Discard Grams Cheat Sheet/);
  assert.match(newsletter, /Get the Bean Conversion Card/);
  assert.match(newsletter, /Get the Free 7-Day High-Fiber Meal Plan/);
  assert.doesNotMatch(newsletter, /\u2014/);
});
