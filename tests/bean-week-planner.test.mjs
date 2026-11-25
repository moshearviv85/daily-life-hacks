import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import {
  BEAN_INSTITUTE_YIELD_URL,
  DEFAULT_PLAN_INPUT,
  UNL_YIELD_URL,
  describeWeek,
  formatMoney,
  householdWeeks,
  priceWeek,
  weekPlan,
} from "../src/lib/bean-week-math.js";
import { loadBeanWeekPrices } from "../src/lib/bean-week-prices.js";
import { parseCsv } from "../src/content/price-basis.mjs";

const slug = "how-many-pounds-of-dried-beans-for-a-week";
const articlePath = join("src/data/articles", `${slug}.md`);
const source = readFileSync(articlePath, "utf8");
const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
const prices = loadBeanWeekPrices();
const family = priceWeek(weekPlan(DEFAULT_PLAN_INPUT), prices);
const described = describeWeek(family, prices);
const households = householdWeeks(prices);

const EXCERPT =
  "A family of 4 eating a 1/2-cup cooked serving a day for a week needs about 2⅓ lb of dry beans, about 14 cups cooked, at about $3.94 from our July 2026 prices.";

function field(markdown, name) {
  const match = markdown.match(new RegExp(`^${name}:\\s*(.*)$`, "m"));
  if (!match) return undefined;
  const rest = match[1].trim();
  if (
    (rest.startsWith('"') && rest.endsWith('"')) ||
    (rest.startsWith("'") && rest.endsWith("'"))
  ) {
    return rest.slice(1, -1);
  }
  return rest;
}

test("a family of 4 for 7 days at 1/2 cup is 14 cups, 2⅓ lb, and the study prices", () => {
  assert.equal(family.cookedCups, 14);
  assert.equal(family.dryLb, 14 / 6);
  assert.equal(family.dryCups, (14 / 6) * 2);
  assert.equal(family.shopCansKitchen, 10);
  assert.equal(family.shopCansInstitute, 8);
  assert.equal(family.exactCansInstitute, 8);
  assert.equal(described.pounds, "2⅓ lb");
  assert.equal(described.dryCups, "4⅔ cups");
  assert.equal(formatMoney(family.dry.pinto), "$3.94");
  assert.equal(formatMoney(family.dry.black), "$3.94");
  assert.equal(formatMoney(family.dry.brownLentils), "$3.36");
  assert.equal(formatMoney(family.dry.redLentils), "$4.52");
  assert.equal(formatMoney(family.cannedKitchen), "$8.80");
  assert.equal(formatMoney(family.cannedInstitute), "$7.04");
  assert.deepEqual(
    households.map((row) => row.poundsLabel),
    ["1.17 lb", "2⅓ lb", "3½ lb"],
  );
  assert.equal(formatMoney(households[2].dry.pinto), "$5.91");
  assert.equal(formatMoney(households[2].dry.black), "$5.92");
});

test("planner prices are the study package rows, not a handwritten rate", () => {
  const protein = parseCsv(readFileSync("public/data/protein-per-dollar-2026.csv", "utf8"));
  const canned = parseCsv(readFileSync("public/data/canned-vs-dry-beans-cost-2026.csv", "utf8"));
  const proteinPrice = new Map(
    protein.rows.map((row) => [row[protein.header.indexOf("food")], row[protein.header.indexOf("package_price_usd")]]),
  );
  const cannedPrice = new Map(
    canned.rows.map((row) => [row[canned.header.indexOf("food")], row[canned.header.indexOf("package_price_usd")]]),
  );
  for (const food of Object.values(prices)) {
    assert.equal(proteinPrice.get(food.food), food.packagePrice.toFixed(2), food.food);
    assert.equal(cannedPrice.get(food.food), food.packagePrice.toFixed(2), food.food);
    if (food.key === "pinto" || food.key === "black") {
      assert.equal(food.pricedMonth, "2026-07", food.food);
      assert.equal(food.retailer, "BLS", food.food);
    } else {
      assert.equal(food.pricedMonth, "", food.food);
    }
  }
});

test("the week page is an indexable David Miller article with the required excerpt", () => {
  assert.equal(field(source, "author"), "David Miller");
  assert.equal(field(source, "date"), "2026-11-25");
  assert.equal(field(source, "dateModified"), undefined);
  assert.equal(field(source, "substantiveUpdate"), undefined);
  assert.equal(field(source, "excerpt"), EXCERPT);
  assert.ok(EXCERPT.length <= 160, EXCERPT.length);
  assert.equal(field(source, "image"), `/images/${slug}-main.jpg`);
  assert.match(field(source, "imageAlt"), /^Illustration of /);
  assert.doesNotMatch(source, /photograph|photo of|real photo/i);
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(source, /\u2014/);
  assert.equal(INDEX_PRUNE_SLUGS.has(slug), false);
  assert.equal(existsSync(`public/images/${slug}-main.jpg`), true);
  assert.equal(existsSync(`public/images/${slug}-chart.jpg`), true);
  assert.equal(readFileSync(`public/images/${slug}-chart.jpg`).subarray(0, 3).toString("hex"), "ffd8ff");
  assert.match(body, /2⅓ lb/);
  assert.match(body, /\$3\.94/);
  assert.match(body, /14 cups cooked/);
  assert.match(body, /\$8\.80/);
  assert.match(body, /\$7\.04/);
  assert.match(body, new RegExp(BEAN_INSTITUTE_YIELD_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(body, new RegExp(UNL_YIELD_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const links = [...body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]);
  for (const href of links) {
    if (!href.startsWith("/")) continue;
    assert.equal(href.includes("#"), false, href);
    assert.match(href, /^\/[a-z0-9-]+\/$/, href);
  }
});

test("the planner, yield citation, and chart are on the article template", () => {
  const component = readFileSync("src/components/BeanWeekPlanner.astro", "utf8");
  const page = readFileSync("src/pages/[slug].astro", "utf8");
  assert.match(component, /data-bean-week-planner/);
  assert.match(component, /data-input="people"/);
  assert.match(component, /data-input="days"/);
  assert.match(component, /data-input="cups"/);
  assert.match(component, /how-many-pounds-of-dried-beans-for-a-week-chart\.jpg/);
  assert.match(component, /householdWeeks/);
  assert.match(component, /href="\/tools\/dried-beans-to-canned-converter\/"/);
  assert.match(component, /href="\/how-to-cook-dried-beans-from-scratch\/"/);
  assert.match(page, /BeanWeekPlanner/);
  assert.match(page, /article\.id === "how-many-pounds-of-dried-beans-for-a-week"/);
  assert.doesNotMatch(page, /"@type":\s*"FAQPage"/);
  assert.doesNotMatch(component, /FAQPage/);
  assert.doesNotMatch(component, /\u2014/);
});

test("bean cluster pages link the week planner with the dates those edits set", () => {
  const links = [
    ["src/data/articles/how-to-cook-dried-beans-from-scratch.md", "2026-11-25", "2026-11-25"],
    ["src/data/articles/canned-beans-vs-dried-beans-nutrition.md", "2026-11-25", "2026-11-25"],
    ["src/data/articles/can-you-eat-rice-and-beans-everyday.md", "2026-11-25", "2026-11-25"],
    ["src/pages/tools/dried-beans-to-canned-converter/index.astro", undefined, undefined],
  ];
  for (const [path, dateModified, substantiveUpdate] of links) {
    const markdown = readFileSync(path, "utf8");
    assert.match(markdown, /\/how-many-pounds-of-dried-beans-for-a-week\//, path);
    assert.doesNotMatch(markdown, /\/how-many-pounds-of-dried-beans-for-a-week\/#/, path);
    if (path.endsWith(".md")) {
      assert.equal(field(markdown, "dateModified"), dateModified, path);
      assert.equal(field(markdown, "substantiveUpdate"), substantiveUpdate, path);
      assert.equal(field(markdown, "author"), "David Miller", path);
    }
  }

  const canned = readFileSync("src/data/articles/canned-beans-vs-dried-beans-nutrition.md", "utf8");
  assert.equal(
    field(canned, "excerpt"),
    "Dried beans vs canned beans: same bean, different water. Dry black beans hold 21.6 g of protein per 100 g vs 6.0 g canned, and 58.0 g per dollar vs 30.1 g.",
  );
  assert.match(canned, /\$3\.94/);
  assert.match(canned, /\$8\.80/);
  assert.match(canned, /\$7\.04/);
  assert.match(canned, /2⅓ lb/);
  assert.doesNotMatch(canned, /FAQPage/);
  assert.equal(field(canned, "title"), "Dried vs Canned Beans: Which Has More Protein?");
});
