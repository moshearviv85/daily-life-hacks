import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { extractFrontmatterField } from "../src/content/modified-date.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAY = "2026-11-25";
const SELENIUM = "src/data/articles/selenium-containing-foods-easy-ways.md";
const PRUNE = "src/data/articles/prune-juice-alternatives-for-constipation.md";
const SELENIUM_HREF = "/selenium-containing-foods-easy-ways/";
const PRUNE_HREF = "/prune-juice-alternatives-for-constipation/";
const SELENIUM_HEADING =
  "How much selenium is in Brazil nuts, tuna, eggs, and whole-wheat bread per serving?";
const PRUNE_HEADING =
  "How much fiber and sugar are in prune juice vs. whole prunes, kiwifruit, pear nectar, and apple juice?";

const LINK_SOURCES = [
  [
    "src/data/articles/natto-japanese-fermented-soybeans-gut-health.md",
    SELENIUM_HREF,
    "selenium foods and the 400 mcg ceiling",
  ],
  [
    "src/data/articles/which-dried-beans-have-the-most-protein.md",
    SELENIUM_HREF,
    "selenium in Brazil nuts, tuna, eggs, and bread",
  ],
  [
    "src/data/articles/water-and-fiber-the-golden-rule.md",
    PRUNE_HREF,
    "fiber and sugar in prune juice versus prunes and kiwi",
  ],
  [
    "src/data/articles/split-pea-soup-recipe-high-fiber.md",
    PRUNE_HREF,
    "prune juice versus whole prunes and kiwifruit on fiber",
  ],
];

// Per-100 g selenium from FoodData Central, times the household gram weight.
// Percents use the rounded mcg shown in the table, divided by the 55 mcg RDA.
const SELENIUM_ROWS = [
  { food: "Dried Brazil nuts, unblanched", per100: 1917, grams: 28.35, shown: "543", fdc: "170569", portion: "1 oz (28.35 g)" },
  { food: "Yellowfin tuna, cooked, dry heat", per100: 108.2, grams: 85, shown: "92.0", fdc: "172006", portion: "3 oz (85 g)" },
  { food: "Cottage cheese, type not specified", per100: 14.6, grams: 210, shown: "30.7", fdc: "2705747", portion: "1 cup (210 g)" },
  { food: "Whole-wheat bread", per100: 25.7, grams: 32, shown: "8.22", fdc: "172688", portion: "1 slice (32 g)" },
  { food: "Egg, whole, raw", per100: 30.7, grams: 50, shown: "15.4", fdc: "171287", portion: "1 large (50 g)" },
  { food: "Chicken breast, raw, skinless, boneless", per100: 22.8, grams: 85, shown: "19.4", fdc: "171077", portion: "3 oz (85 g)" },
];

const PRUNE_ROWS = [
  { food: "Prune juice, canned", fdc: "167753", portion: "1 cup (256 g)", fiber: "2.56 g", sugar: "42.1 g", calories: "182 kcal" },
  { food: "Dried prunes, uncooked", fdc: "2758978", portion: "100 g", fiber: "6.25 g", sugar: "31.4 g", calories: "240 kcal" },
  { food: "Green kiwifruit, raw", fdc: "168153", portion: "1 NLEA serving (148 g)", fiber: "4 g", sugar: "13 g", calories: "90 kcal" },
  { food: "Pear nectar, canned", fdc: "168186", portion: "1 cup (250 g)", fiber: "1.50 g", sugar: "37.9 g", calories: "150 kcal" },
  { food: "Apple juice, unsweetened", fdc: "173933", portion: "1 cup (248 g)", fiber: "0.50 g", sugar: "24 g", calories: "114 kcal" },
];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function gitShow(relativePath) {
  return execFileSync("git", ["show", `origin/main:${relativePath}`], {
    cwd: root,
    encoding: "utf8",
  });
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing frontmatter");
  return match[1];
}

function answerParagraph(markdown, heading) {
  const marker = `## ${heading}\n\n`;
  const start = markdown.indexOf(marker);
  assert.notEqual(start, -1, `missing heading: ${heading}`);
  const paragraph = markdown.slice(start + marker.length).split(/\n\s*\n/)[0];
  assert.ok(paragraph, `missing the direct answer under ${heading}`);
  return paragraph;
}

function visibleWords(paragraph) {
  const visible = paragraph.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return visible.match(/[\p{L}\p{N}]+(?:[.'’][\p{L}\p{N}]+)*/gu) ?? [];
}

function roundTo(value, digits) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

test("selenium page keeps the title and adds the six-food USDA serving table", () => {
  const markdown = read(SELENIUM);
  const before = gitShow(SELENIUM);
  assert.equal(
    extractFrontmatterField(markdown, "title"),
    "Selenium Foods: How Much You Need (Brazil Nut Limits)",
  );
  assert.equal(extractFrontmatterField(markdown, "title"), extractFrontmatterField(before, "title"));
  assert.equal(extractFrontmatterField(markdown, "excerpt"), extractFrontmatterField(before, "excerpt"));
  assert.equal(extractFrontmatterField(markdown, "author"), "David Miller");
  assert.equal(extractFrontmatterField(markdown, "dateModified"), DAY);
  assert.equal(extractFrontmatterField(markdown, "substantiveUpdate"), DAY);
  assert.equal(markdown.includes("FAQPage"), false);
  assert.equal(/\]\([^)]+\.csv\)/.test(markdown), false);
  assert.equal(/\]\(\/[^)]*#/.test(markdown), false);

  const answer = answerParagraph(markdown, SELENIUM_HEADING);
  const words = visibleWords(answer);
  assert.ok(
    words.length >= 40 && words.length <= 60,
    `selenium direct answer should be 40-60 visible words, got ${words.length}: ${words.join(" ")}`,
  );
  assert.match(answer, /543 mcg/);
  assert.match(answer, /1,917 mcg per 100 g/);
  assert.match(answer, /about 95 mcg/);
  assert.match(answer, /55 mcg\/day/);
  assert.match(answer, /Tolerable Upper Intake Level at 400 mcg\/day/);
  assert.match(answer, /FDC 170569/);
  assert.match(answer, /https:\/\/fdc\.nal\.usda\.gov\//);
  assert.match(answer, /ods\.od\.nih\.gov\/factsheets\/Selenium-HealthProfessional/);

  assert.equal(SELENIUM_ROWS.length, 6);
  for (const row of SELENIUM_ROWS) {
    const shown = Number(row.shown);
    const raw = (row.per100 * row.grams) / 100;
    assert.ok(Math.abs(raw - shown) < 0.6, `${row.food} raw ${raw} drifted from ${row.shown}`);
    const percent = roundTo((shown / 55) * 100, 1).toFixed(1);
    const line = `| ${row.food} | ${row.portion} | ${row.shown} mcg | ${percent}% | [FDC ${row.fdc}](https://fdc.nal.usda.gov/food-details/${row.fdc}/nutrients) |`;
    assert.ok(markdown.includes(line), `missing selenium row: ${line}`);
  }
  assert.match(markdown, /5 g kernel = 95\.85 mcg/);
});

test("prune juice page keeps the title and adds the five-food fiber and sugar table", () => {
  const markdown = read(PRUNE);
  const before = gitShow(PRUNE);
  assert.equal(extractFrontmatterField(markdown, "title"), "Prune Juice Alternatives for Constipation");
  assert.equal(extractFrontmatterField(markdown, "title"), extractFrontmatterField(before, "title"));
  assert.equal(extractFrontmatterField(markdown, "excerpt"), extractFrontmatterField(before, "excerpt"));
  assert.equal(extractFrontmatterField(markdown, "author"), "David Miller");
  assert.equal(extractFrontmatterField(markdown, "dateModified"), DAY);
  assert.equal(extractFrontmatterField(markdown, "substantiveUpdate"), DAY);
  assert.equal(markdown.includes("FAQPage"), false);
  assert.equal(/\]\([^)]+\.csv\)/.test(markdown), false);
  assert.equal(/\]\(\/[^)]*#/.test(markdown), false);

  const answer = answerParagraph(markdown, PRUNE_HEADING);
  const words = visibleWords(answer);
  assert.ok(
    words.length >= 40 && words.length <= 60,
    `prune direct answer should be 40-60 visible words, got ${words.length}: ${words.join(" ")}`,
  );
  assert.match(answer, /2\.56 g fiber/);
  assert.match(answer, /42\.1 g sugar/);
  assert.match(answer, /6\.25 g fiber/);
  assert.match(answer, /4 g fiber and 13 g sugar/);
  assert.match(answer, /FDC 167753/);
  assert.match(answer, /FDC 2758978/);
  assert.match(answer, /FDC 168153/);
  assert.match(answer, /37905980/);
  assert.match(answer, /34074830/);

  assert.equal(Math.round(71 * 2.56), 182);
  assert.equal(Math.round(61 * 1.48), 90);
  assert.equal(60 * 2.5, 150);
  assert.equal(Math.round(46 * 2.48), 114);
  assert.equal(roundTo(16.45 * 2.56, 1), 42.1);
  assert.equal(roundTo(0.2 * 2.48, 2), 0.5);
  assert.equal(roundTo(3 * 1.48, 2), 4.44);

  assert.equal(PRUNE_ROWS.length, 5);
  for (const row of PRUNE_ROWS) {
    const line = `| ${row.food} | ${row.portion} | ${row.fiber} | ${row.sugar} | ${row.calories} |`;
    assert.ok(markdown.includes(line), `missing prune row: ${line}`);
    assert.match(
      markdown,
      new RegExp(`\\[FDC ${row.fdc}\\]\\(https://fdc\\.nal\\.usda\\.gov/food-details/${row.fdc}/nutrients\\)`),
    );
  }
  assert.match(markdown, /FDC 168162/);
  assert.match(markdown, /240 kcal per 100 g/);
  assert.match(markdown, /36537785/);
});

test("contextual links stay canonical and do not move dateModified", () => {
  for (const [path, href, anchor] of LINK_SOURCES) {
    const markdown = read(path);
    const before = gitShow(path);
    assert.equal(frontmatter(markdown), frontmatter(before), `${path} changed frontmatter`);
    assert.equal(
      extractFrontmatterField(markdown, "dateModified"),
      extractFrontmatterField(before, "dateModified"),
      `${path} moved dateModified`,
    );
    assert.equal(extractFrontmatterField(markdown, "author"), "David Miller");
    const links = [...markdown.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].filter((match) => match[2] === href);
    assert.ok(links.some((match) => match[1] === anchor), `${path} missing "${anchor}" -> ${href}`);
    assert.equal(href.includes("#"), false, href);
    assert.equal(href.includes(".csv"), false, href);
    assert.match(href, /^\/[a-z0-9-]+\/$/);
  }
});
