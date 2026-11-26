import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function field(markdown, name) {
  const match = markdown.match(new RegExp(`^${name}:\\s*["']?([^"'\\n#]+?)["']?\\s*$`, "m"));
  return match ? match[1].trim() : undefined;
}

function words(paragraph) {
  return paragraph
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split(/\s+/)
    .filter(Boolean);
}

const sandwich = read("src/data/articles/how-to-keep-sandwiches-from-getting-soggy.md");
const fiber = read("src/data/articles/30-day-high-fiber-challenge-meal-plan.md");

test("soggy sandwich page keeps its title and adds the FSIS barrier table", () => {
  assert.equal(field(sandwich, "title"), "How to Keep Sandwiches From Getting Soggy (Fat Barrier First)");
  assert.equal(
    field(sandwich, "excerpt"),
    "How to keep sandwiches from getting soggy: fat barrier edge to edge, dry-to-wet stacking, blot tomatoes, and pack it cold so lunch stays firm.",
  );
  assert.equal(field(sandwich, "author"), "David Miller");
  assert.equal(field(sandwich, "dateModified"), "2026-11-26");
  assert.equal(field(sandwich, "substantiveUpdate"), "2026-11-26");
  assert.doesNotMatch(sandwich, /FAQPage/);
  assert.doesNotMatch(sandwich, /\]\([^)]+\.csv\)/);
  assert.doesNotMatch(sandwich, /\u2014/);

  const heading = "## Does mayo make bread soggy, and how do you pack chicken salad or toasted sandwiches?";
  const start = sandwich.indexOf(heading);
  assert.ok(start > 0, "missing mayo question H2");
  const section = sandwich.slice(start, sandwich.indexOf("\n## ", start + heading.length));
  const answer = section.split("\n\n")[1];
  const count = words(answer).length;
  assert.ok(count >= 40 && count <= 60, `mayo answer is ${count} words`);
  assert.match(answer, /USDA FSIS Leftovers and Food Safety/);
  assert.match(answer, /40 degrees F/);
  assert.match(answer, /2 hours out, or 1 hour above 90 degrees F/);
  assert.match(section, /https:\/\/www\.fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/leftovers-and-food-safety/);
  for (const row of [
    "Full-fat mayo or butter, spread edge to edge",
    "Crisp lettuce or a sliced cheese shield",
    "Salted, drained tomatoes packed separately",
    "Cooled toasted sourdough or ciabatta",
    "Chilled chicken or tuna salad with an ice pack",
  ]) {
    assert.match(section, new RegExp(row.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(section, /\]\(\/[^)]*#/);
});

test("30-day fiber plan keeps its title and adds the DGA ramp table", () => {
  assert.equal(field(fiber, "title"), "30 Day High Fiber Challenge Meal Plan");
  assert.equal(
    field(fiber, "excerpt"),
    "A 4-week fiber plan: swap breakfast in week 1, add a lunch add-in in week 2, beans or grains at dinner in week 3, then lock it in. Go slow, drink water.",
  );
  assert.equal(field(fiber, "author"), "David Miller");
  assert.equal(field(fiber, "dateModified"), "2026-11-26");
  assert.equal(field(fiber, "substantiveUpdate"), "2026-11-26");
  assert.doesNotMatch(fiber, /FAQPage/);
  assert.doesNotMatch(fiber, /\]\([^)]+\.csv\)/);
  assert.doesNotMatch(fiber, /\u2014/);

  const heading = "## How much fiber should you add each week on a 30-day challenge without bloating?";
  const start = fiber.indexOf(heading);
  assert.ok(start > 0, "missing fiber ramp H2");
  const section = fiber.slice(start, fiber.indexOf("\n## ", start + heading.length));
  const answer = section.split("\n\n")[1];
  const count = words(answer).length;
  assert.ok(count >= 40 && count <= 60, `fiber answer is ${count} words`);
  assert.match(answer, /14 grams per 1,000 calories/);
  assert.match(answer, /roughly 25 grams for women and 38 for men/);
  assert.match(answer, /FDA Daily Value/);
  assert.match(answer, /28 grams/);
  assert.match(section, /Dietary Guidelines for Americans 2020-2025/);
  for (const id of ["173904", "173735", "170554", "167755", "170284"]) {
    assert.match(section, new RegExp(`FDC ${id}`));
  }
  for (const week of ["Week 1", "Week 2", "Week 3", "Week 4"]) {
    assert.match(section, new RegExp(`\\| ${week} \\|`));
  }
  assert.match(section, /\+5 g/);
  assert.match(section, /\+10 g/);
  assert.match(section, /\+15 g/);
  assert.match(section, /28 to 35 g/);
  assert.doesNotMatch(section, /\]\(\/[^)]*#/);
  assert.doesNotMatch(section, /\]\(\/[^)]+\)/);
});

test("contextual links land on canonical paths and do not move source dates", () => {
  const sources = [
    ["src/data/articles/how-much-protein-in-bagel-sandwich.md", "2026-11-23", "/how-to-keep-sandwiches-from-getting-soggy/"],
    ["src/data/articles/easy-cold-summer-pasta-salad-potlucks.md", "2026-11-23", "/how-to-keep-sandwiches-from-getting-soggy/"],
    ["src/data/articles/how-to-increase-fiber-intake-without-gas.md", "2026-07-16", "/30-day-high-fiber-challenge-meal-plan/"],
    ["src/data/articles/quick-20-minute-high-fiber-meals-for-busy-days.md", "2026-11-23", "/30-day-high-fiber-challenge-meal-plan/"],
  ];
  for (const [path, day, href] of sources) {
    const markdown = read(path);
    assert.equal(field(markdown, "dateModified"), day, path);
    assert.equal(field(markdown, "author"), "David Miller", path);
    assert.match(markdown, new RegExp(`\\]\\(${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`), path);
    assert.doesNotMatch(markdown, new RegExp(`\\]\\(${href}#`), path);
  }
});
