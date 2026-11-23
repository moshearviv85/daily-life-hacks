import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  CANS_PER_DRY_POUND,
  CROWD_HEADCOUNTS,
  CUPS_COOKED_PER_CAN,
  DISH_DEFAULTS,
  MILK_STREET_YIELDS,
  crowdPlan,
  formatCups,
  testedYield,
} from "../src/lib/bean-crowd-math.js";

const page = readFileSync(
  join(process.cwd(), "src/pages/tools/dried-beans-to-canned-converter/index.astro"),
  "utf8",
);

test("per-dish defaults are documented: chili 1/2 cup, side 1/3 cup, soup 1/4 cup", () => {
  assert.equal(DISH_DEFAULTS.chili, 0.5);
  assert.equal(DISH_DEFAULTS.side, 1 / 3);
  assert.equal(DISH_DEFAULTS.soup, 0.25);
  assert.equal(CUPS_COOKED_PER_CAN, 1.5);
});

test("50 people times 1/2 cup divided by 1.5 cups per can is about 17 cans", () => {
  const plan = crowdPlan({ people: 50, cupsPerPerson: DISH_DEFAULTS.chili });
  assert.equal(plan.cookedCups, 25);
  assert.equal(plan.exactCans, 50 * 0.5 / 1.5);
  assert.ok(Math.abs(plan.exactCans - 16.666666666666668) < 1e-9);
  assert.equal(plan.cans, 17);
  assert.equal(plan.gramsLow, 17 * 90);
  assert.equal(plan.gramsHigh, 17 * 100);
});

test("the tested yield for one can is 1/2 cup dry, 90 to 100 g, and 1 1/2 cups cooked", () => {
  const one = testedYield(1);
  assert.equal(one.cupsDry, 0.5);
  assert.equal(one.gramsLow, 90);
  assert.equal(one.gramsHigh, 100);
  assert.equal(one.cupsCooked, 1.5);
  assert.equal(formatCups(one.cupsDry), "½");
  assert.equal(formatCups(one.cupsCooked), "1½");
  assert.equal(CANS_PER_DRY_POUND, "4 to 5");
  assert.equal(MILK_STREET_YIELDS.find((row) => row.variety === "Black beans").cookedCupsPerCupDry, "2½");
  assert.equal(MILK_STREET_YIELDS.find((row) => row.variety === "Cannellini").cookedCupsPerCupDry, "3¼");
});

test("the crowd headcount table covers 10 through 100", () => {
  assert.deepEqual(CROWD_HEADCOUNTS, [10, 15, 20, 25, 30, 50, 75, 100]);
  const cans = CROWD_HEADCOUNTS.map(
    (people) => crowdPlan({ people, cupsPerPerson: DISH_DEFAULTS.chili }).cans,
  );
  assert.deepEqual(cans, [4, 5, 7, 9, 10, 17, 25, 34]);
});

test("the beans page keeps its title and answers with 1/2 cup, both tables, and the old converter", () => {
  assert.match(page, /const title = "How Many Dried Beans Equal a 15\.5 oz Can\?"/);
  assert.match(page, /how many grams or cups of dry beans replace a 15\.5 oz can/);
  assert.match(page, /½ cup dry/);
  assert.match(page, /1½ cups cooked, drained/);
  assert.match(page, /id="crowd-table"/);
  assert.match(page, /id="cans-per-pound"/);
  assert.match(page, /id="bean-grams-out"/);
  assert.match(page, /id="bean-cups-out"/);
  assert.match(page, /Nutrition-matched/);
  assert.match(page, /Beans for a crowd/);
  assert.match(page, /One 15\.5 oz can replaced by each dry legume/);
  assert.match(page, /https:\/\/www\.177milkstreet\.com\/stories\/bean-counting-dried-vs-canned/);
  assert.doesNotMatch(page, /FAQPage/);
  assert.equal((page.match(/href="\/protein-per-dollar-cheapest-protein-sources\/"/g) ?? []).length, 1);
  assert.equal((page.match(/href="\/fiber-per-dollar-cheapest-high-fiber-foods\/"/g) ?? []).length, 1);
});
