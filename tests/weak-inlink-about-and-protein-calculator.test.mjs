import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { isIndexPruned } from "../src/content/index-prune.js";

const ROOT = new URL("..", import.meta.url).pathname;

const PROTEIN_STUDIES = [
  "high-protein-vs-high-fiber-satiety",
  "best-low-cost-protein-sources-large-families",
  "which-dried-beans-have-the-most-protein",
  "cheapest-dairy-and-soy-protein-per-dollar",
  "how-much-fiber-and-protein-per-dollar-at-walmart-vs-bls",
  "how-long-do-cooked-meat-and-poultry-last-in-the-fridge",
];

const ABOUT_GUIDES = [
  "high-fiber-pizza-crust-cauliflower",
  "cheap-chicken-casserole-meals-large-families",
  "healthy-blue-collar-lunch-ideas-men",
  "healthy-homemade-indian-salad-dressing-recipes",
  "high-fiber-gluten-free-bread-recipe",
  "high-fiber-quinoa-salad-for-lunch-prep",
  "high-fiber-salad-dressings-homemade",
  "sheet-pan-salmon-and-vegetables-30-minutes",
];

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function field(frontmatter, name) {
  const match = frontmatter.match(
    new RegExp(`^${name}:\\s*["']?([^"'\\n#]+?)["']?\\s*$`, "m"),
  );
  return match ? match[1].trim() : "";
}

function articleMeta(slug) {
  const raw = read(`src/data/articles/${slug}.md`);
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  return {
    author: field(frontmatter, "author"),
    release: field(frontmatter, "publishAt") || field(frontmatter, "date"),
    category: field(frontmatter, "category"),
  };
}

test("protein calculator and about bridges stay off orphans, pruned slugs, and nutrition hub anchors", () => {
  const orphanTest = read("tests/orphan-contextual-inlinks.test.mjs");
  const orphanBlock = orphanTest.match(/const ORPHANS = \[([\s\S]*?)\];/)?.[1] ?? "";
  const slugs = [...PROTEIN_STUDIES, ...ABOUT_GUIDES];
  assert.equal(new Set(slugs).size, slugs.length, "bridge slugs should be unique");

  for (const slug of slugs) {
    assert.equal(existsSync(join(ROOT, "src/data/articles", `${slug}.md`)), true, slug);
    assert.equal(isIndexPruned(slug), false, `${slug} is pruned`);
    assert.equal(orphanBlock.includes(`"${slug}"`), false, `${slug} locks dateModified as an orphan`);
    const meta = articleMeta(slug);
    assert.equal(meta.author, "David Miller", slug);
    assert.ok(meta.release && Date.parse(meta.release) <= Date.now(), `${slug} is unreleased`);
    assert.equal(slug.includes("#"), false);
    assert.equal(slug.includes("."), false);
    assert.notEqual(meta.category, "", slug);
  }
});

test("protein calculator renders six guarded study links below the visible FAQ", () => {
  const source = read("src/pages/tools/protein-per-dollar-calculator/index.astro");
  const faq = source.indexOf("<h2>Frequently asked questions</h2>");
  const heading = source.indexOf("Related Protein Cost Studies & Family Prep Guides");
  const signoff = source.indexOf("</article>");
  assert.ok(faq > 0 && heading > faq && signoff > heading, "study grid should sit below the FAQ");
  const section = source.slice(heading, signoff);

  assert.match(source, /existsSync/);
  assert.match(source, /!isIndexPruned/);
  assert.match(source, /!isReleased/);
  assert.match(source, /author !== "David Miller"/);
  assert.match(section, /href=\{`\/\$\{item\.slug\}\/`\}/);
  assert.equal([...source.matchAll(/<details><summary>/g)].length, 5);
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(source, /\u2014/);
  assert.doesNotMatch(section, /\.csv/);
  assert.doesNotMatch(section, /href="[^"]*#/);
  assert.doesNotMatch(section, /href=\{`[^`]*#/);
  assert.doesNotMatch(section, /href="\/nutrition\//);
  assert.doesNotMatch(section, /\bphoto\b/i);

  for (const slug of PROTEIN_STUDIES) {
    assert.match(source, new RegExp(`"${slug}"`));
  }
});

test("about page renders eight guarded guides above the sign-off", () => {
  const source = read("src/pages/about.astro");
  const heading = source.indexOf("Featured Guides in Meal Prep, Family Meals & High-Fiber Cooking");
  const signoff = source.indexOf("If you made it this far");
  assert.ok(heading > 0 && signoff > heading, "guide section should sit above the sign-off");
  const section = source.slice(heading, signoff);

  assert.match(source, /existsSync/);
  assert.match(source, /!isIndexPruned/);
  assert.match(source, /!isReleased/);
  assert.match(source, /author !== "David Miller"/);
  assert.match(section, /href=\{`\/\$\{item\.slug\}\/`\}/);
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(section, /\u2014/);
  assert.doesNotMatch(section, /\.csv/);
  assert.doesNotMatch(section, /href="[^"]*#/);
  assert.doesNotMatch(section, /href=\{`[^`]*#/);
  assert.doesNotMatch(section, /href="\/nutrition\//);
  assert.doesNotMatch(section, /\bphoto\b/i);
  assert.match(source, /href="\/editorial-policy\/"/);
  assert.match(source, /href="\/one-dollar-of-protein-vs-one-dollar-of-fiber\/"/);

  for (const slug of ABOUT_GUIDES) {
    assert.match(source, new RegExp(`"${slug}"`));
  }
});

test("built about and protein calculator pages emit canonical study paths", () => {
  const calcPath = join(ROOT, "dist/tools/protein-per-dollar-calculator/index.html");
  const aboutPath = join(ROOT, "dist/about/index.html");
  const nutritionPath = join(ROOT, "dist/nutrition/index.html");
  if (!existsSync(calcPath) || !existsSync(aboutPath)) return;

  const calc = readFileSync(calcPath, "utf8");
  const about = readFileSync(aboutPath, "utf8");
  const calcSection = calc.slice(
    calc.indexOf("Related Protein Cost Studies"),
    calc.indexOf("</article>", calc.indexOf("Related Protein Cost Studies")),
  );
  const aboutSection = about.slice(
    about.indexOf("Featured Guides in Meal Prep"),
    about.indexOf("If you made it this far"),
  );

  assert.equal(calc.includes("FAQPage"), false);
  assert.equal(about.includes("FAQPage"), false);
  assert.match(calc, /77\.7/);
  assert.match(calc, /49\.0/);

  for (const slug of PROTEIN_STUDIES) {
    assert.match(calcSection, new RegExp(`href="/${slug}/"`));
    assert.equal(calcSection.includes(`href="/${slug}#`), false, slug);
    assert.equal(calcSection.includes(".csv"), false);
  }
  for (const slug of ABOUT_GUIDES) {
    assert.match(aboutSection, new RegExp(`href="/${slug}/"`));
    assert.equal(aboutSection.includes(`href="/${slug}#`), false, slug);
    assert.equal(aboutSection.includes(".csv"), false);
  }
  assert.equal(calcSection.includes('href="/nutrition/"'), false);
  assert.equal(aboutSection.includes('href="/nutrition/"'), false);

  if (existsSync(nutritionPath)) {
    const nutrition = readFileSync(nutritionPath, "utf8");
    const anchors = [...nutrition.matchAll(/<a\b/gi)].length;
    assert.ok(anchors <= 124, `/nutrition/ rendered ${anchors} anchors`);
  }
});
