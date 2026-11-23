import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { SIGNUP_OFFERS } from "../src/content/signup-offers.mjs";
import {
  earlySignupPlan,
  isBeanConversionSlug,
  newsletterSignupForArticle,
  TOP_LANDING_SLUGS,
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
  assert.equal(
    newsletterSignupForArticle({ slug: "cooking-oils-smoke-points-best-uses" }),
    "oils",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "how-to-store-homemade-salad-dressing-safely" }),
    "storage",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "how-to-keep-sandwiches-from-getting-soggy" }),
    "storage",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "keep-berries-fresh-longer-when-to-wash" }),
    "storage",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "how-to-store-fresh-herbs-to-last-longer" }),
    "storage",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "best-way-to-store-avocados-to-stop-browning" }),
    "storage",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "how-long-do-leftovers-last-in-the-fridge" }),
    "storage",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "does-leftover-pizza-need-to-be-refrigerated" }),
    "storage",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "costco-rotisserie-chicken-meal-ideas-dinner" }),
    "budget",
  );
  assert.equal(
    newsletterSignupForArticle({
      slug: "eat-healthy-on-a-budget-complete-playbook",
      title: "Eat Healthy on a Budget for About $60 a Week",
    }),
    "budget",
  );
  assert.equal(
    newsletterSignupForArticle({
      slug: "low-sodium-budget-foods-ranked",
      cluster: "weekly-budget-shopping",
      parentPillar: "eat-healthy-on-a-budget-complete-playbook",
    }),
    "budget",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "usda-thrifty-food-plan-weekly-cost" }),
    "budget",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "selenium-containing-foods-easy-ways" }),
    "generic",
  );
  assert.equal(
    newsletterSignupForArticle({ slug: "how-to-organize-a-small-kitchen-on-a-budget" }),
    "generic",
  );
  assert.equal(
    newsletterSignupForArticle({
      slug: "canned-beans-vs-dried-beans-nutrition",
      cluster: "budget-protein",
      parentPillar: "high-protein-on-a-budget-complete-guide",
    }),
    "beans",
  );
});

test("article pages keep the end signup, add an early one only from the plan, and skip the footer form", () => {
  const page = read("src/pages/[slug].astro");
  assert.match(page, /placement="inline"/);
  assert.match(page, /placement="early"/);
  assert.match(page, /earlyPlan\?\.where === "after-quick-answer"/);
  assert.match(page, /!flagship\?\.emailCapture/);
  assert.match(page, /<Footer signup="none" \/>/);
  assert.doesNotMatch(page, /signup=\{newsletterSignup\}/);
  assert.doesNotMatch(page, /NewsletterPopup/);
});

test("the early form is limited to matched top landing pages", () => {
  assert.equal(TOP_LANDING_SLUGS.size, 14);
  assert.equal(
    earlySignupPlan({ slug: "selenium-containing-foods-easy-ways", body: "| a | b |\n" }),
    null,
  );
  assert.equal(
    earlySignupPlan({ slug: "tools/recipe-finder", body: "no table" }),
    null,
  );
  const oils = earlySignupPlan({
    slug: "cooking-oils-smoke-points-best-uses",
    body: "intro\n\n| Oil | Point |\n| --- | --- |\n| Palm | 489 |\n",
    hasQuickAnswer: true,
  });
  assert.deepEqual(oils, { variant: "oils", where: "after-table" });
  const sandwich = earlySignupPlan({
    slug: "how-to-keep-sandwiches-from-getting-soggy",
    body: "A long lunch story with no table at all.",
    hasQuickAnswer: true,
  });
  assert.deepEqual(sandwich, { variant: "storage", where: "after-quick-answer" });
  const soak = earlySignupPlan({
    slug: "how-to-quick-soak-dried-beans-same-day",
    body: "Sort the beans, then boil them.",
    hasQuickAnswer: false,
  });
  assert.deepEqual(soak, { variant: "beans", where: "after-first-paragraph" });
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
  assert.match(thanks, /\/downloads\/smoke-point-chart\.pdf/);
  assert.match(thanks, /\/downloads\/fridge-life-card\.pdf/);
  assert.match(thanks, /\/downloads\/60-dollar-week-meal-plan\.pdf/);
  assert.match(thanks, /\/printables\/smoke-point-chart\//);
  assert.match(thanks, /\/printables\/fridge-life-card\//);
  assert.match(thanks, /signup="none"/);

  for (const file of [
    "src/pages/printables/smoke-point-chart/index.astro",
    "src/pages/printables/fridge-life-card/index.astro",
  ]) {
    const page = read(file);
    assert.match(page, /robots="noindex, follow"/, file);
    assert.match(page, /signup="none"/, file);
    assert.doesNotMatch(page, /FAQPage|aggregateRating/, file);
  }
});

test("signup forms still post to /api/subscribe and send placement", () => {
  const newsletter = read("src/components/Newsletter.astro");
  assert.match(newsletter, /fetch\("\/api\/subscribe"/);
  assert.match(newsletter, /placement,/);
  assert.match(newsletter, /data-signup-placement="early"/);
  assert.match(newsletter, /data-signup-placement=\{placement\}/);
  assert.equal(SIGNUP_OFFERS.sourdough.heading, "Get the Sourdough Discard Grams Cheat Sheet");
  assert.equal(SIGNUP_OFFERS.beans.heading, "Get the Bean Conversion Card");
  assert.equal(SIGNUP_OFFERS.fiber.heading, "Get the Free 7-Day High-Fiber Meal Plan");
  assert.equal(SIGNUP_OFFERS.oils.heading, "Get the Smoke Point Chart");
  assert.equal(SIGNUP_OFFERS.storage.heading, "Get the Fridge Life Card");
  assert.equal(SIGNUP_OFFERS.budget.heading, "Get the $60 Week Meal Plan");
  assert.equal(SIGNUP_OFFERS.oils.downloadHref, "/downloads/smoke-point-chart.pdf");
  assert.equal(SIGNUP_OFFERS.storage.downloadHref, "/downloads/fridge-life-card.pdf");
  assert.equal(SIGNUP_OFFERS.budget.downloadHref, "/downloads/60-dollar-week-meal-plan.pdf");
  assert.doesNotMatch(newsletter, /\u2014/);
  assert.doesNotMatch(read("src/content/signup-offers.mjs"), /\u2014/);
});
