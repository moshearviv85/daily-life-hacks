import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { discardSplit } from "../src/lib/sourdough-discard-math.js";

const ROOT = new URL("..", import.meta.url).pathname;
const DAY = "2026-11-26";
const BASKET = "cheapest-family-grocery-basket-for-protein-and-fiber";
const DISCARD = "sourdough-discard-vs-baking-powder-and-yeast-cost-per-bake";

const LINK_SOURCES = [
  ["src/components/BeanWeekPlanner.astro", `/${BASKET}/`],
  ["src/pages/404.astro", `/${BASKET}/`],
  ["src/pages/tools/sourdough-discard-calculator/index.astro", `/${DISCARD}/`],
  ["src/pages/printables/sourdough-discard-grams-cheat-sheet/index.astro", `/${DISCARD}/`],
];

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function article(slug) {
  return read(`src/data/articles/${slug}.md`);
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing frontmatter");
  return match[1];
}

function field(markdown, name) {
  const match = frontmatter(markdown).match(new RegExp(`^${name}:\\s*"?([^"\\n]+?)"?\\s*$`, "m"));
  return match ? match[1] : null;
}

function body(markdown) {
  return markdown.split(/\n---\n/).slice(1).join("\n---\n");
}

function markdownTable(markdown, header) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.indexOf(header);
  assert.notEqual(start, -1, header);
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith("|")) break;
    rows.push(line.slice(1, -1).split("|").map((cell) => cell.trim()));
  }
  return rows;
}

function internalHrefs(markdown) {
  return [...body(markdown).matchAll(/\]\((\/[^)\s]+)\)/g)].map((match) => match[1]);
}

function orphanSlugs() {
  const source = read("tests/orphan-contextual-inlinks.test.mjs");
  const block = source.match(/const ORPHANS = \[([\s\S]*?)\];/);
  assert.ok(block, "ORPHANS list");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function targetExists(href) {
  const slug = href.slice(1, -1);
  return (
    existsSync(join(ROOT, "src/data/articles", `${slug}.md`))
    || existsSync(join(ROOT, "src/pages", slug, "index.astro"))
    || existsSync(join(ROOT, "src/pages", `${slug}.astro`))
  );
}

function tenth(value) {
  return (Math.round((value + Number.EPSILON) * 10) / 10).toFixed(1);
}

function figures() {
  const stdout = execFileSync(
    "python3",
    ["scripts/generate-family-basket-and-discard-bake-charts.py", "--print"],
    { cwd: ROOT, encoding: "utf8" },
  );
  return JSON.parse(stdout);
}

const data = figures();

test("both chart pages are tips, cite the CSVs in text, and skip FAQPage", () => {
  const redirects = read("public/_redirects");
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const orphans = new Set(orphanSlugs());
  const pages = [
    {
      slug: BASKET,
      title: "Cheapest Family Grocery Basket for Protein and Fiber",
      excerpt:
        "A family of 4 can clear 200 g of protein and 112 g of fiber for $5.38. The convenience cart that hits the same grams costs $14.41.",
      cluster: "weekly-budget-shopping",
      parent: "eat-healthy-on-a-budget-complete-playbook",
      csvNames: [
        "protein-day-cost-2026.csv",
        "fiber-day-cost-2026.csv",
        "protein-per-dollar-2026.csv",
        "fiber-per-dollar-2026.csv",
      ],
    },
    {
      slug: DISCARD,
      title: "Sourdough Discard vs Yeast: Cost per Bake",
      excerpt:
        "113 g of 100% sourdough discard holds $0.08 of whole wheat flour. A 227 g cup at 80% hydration is $0.17. Yeast isn't in this price.",
      cluster: "meal-prep-food-storage",
      parent: "meal-prep-for-beginners-complete-system",
      csvNames: ["fiber-per-dollar-2026.csv"],
    },
  ];

  for (const page of pages) {
    const markdown = article(page.slug);
    const excerpt = field(markdown, "excerpt");
    assert.equal(field(markdown, "title"), page.title, page.slug);
    assert.equal(excerpt, page.excerpt, page.slug);
    assert.ok(excerpt.length >= 130 && excerpt.length <= 160, `${page.slug} excerpt ${excerpt.length}`);
    assert.equal(field(markdown, "author"), "David Miller", page.slug);
    assert.equal(field(markdown, "category"), "tips", page.slug);
    assert.equal(field(markdown, "cluster"), page.cluster, page.slug);
    assert.equal(field(markdown, "parentPillar"), page.parent, page.slug);
    assert.equal(field(markdown, "date"), DAY, page.slug);
    assert.equal(field(markdown, "dateModified"), DAY, page.slug);
    assert.equal(field(markdown, "substantiveUpdate"), DAY, page.slug);
    assert.equal(field(markdown, "image"), `/images/${page.slug}-chart.jpg`, page.slug);
    assert.match(field(markdown, "imageAlt"), /chart/i, page.slug);
    assert.doesNotMatch(field(markdown, "imageAlt"), /photo/i, page.slug);
    assert.equal(markdown.includes("FAQPage"), false, page.slug);
    assert.equal(markdown.includes("\u2014"), false, page.slug);
    assert.match(markdown, /Not a photograph, and not an AI illustration/);
    assert.doesNotMatch(markdown, /Illustration generated with AI/);
    assert.match(registry, new RegExp(`"${page.slug}": "${DAY}"`));
    assert.equal(INDEX_PRUNE_SLUGS.has(page.slug), false, page.slug);
    assert.doesNotMatch(redirects, new RegExp(`^/${page.slug}(?:/)?\\s`, "m"), page.slug);
    assert.equal(existsSync(join(ROOT, "public/images", `${page.slug}-main.jpg`)), false);
    assert.equal(existsSync(join(ROOT, "public/images", `${page.slug}-chart.jpg`)), true);
    for (const name of page.csvNames) {
      assert.match(markdown, new RegExp(name.replaceAll(".", "\\.")), page.slug);
    }
    assert.doesNotMatch(markdown, /\[[^\]]*\]\([^)]*\.csv[^)]*\)/, page.slug);
    assert.doesNotMatch(markdown, /href=["'][^"']*\.csv/i, page.slug);
    assert.equal(body(markdown).includes(`](/images/${page.slug}-chart.jpg)`), true, page.slug);
    for (const href of internalHrefs(markdown)) {
      assert.equal(href.includes("#"), false, `${page.slug} ${href}`);
      if (href.startsWith("/images/")) continue;
      assert.equal(href.endsWith("/"), true, href);
      const slug = href.slice(1, -1);
      assert.equal(orphans.has(slug), false, `${page.slug} links orphan ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${page.slug} links pruned ${slug}`);
      assert.equal(targetExists(href), true, `${page.slug} missing ${href}`);
    }
  }
});

test("the family tables match the CSV baskets, including the week rounding", () => {
  const markdown = article(BASKET);
  const staple = markdownTable(
    markdown,
    "| Staple food | Amount | Protein | Fiber | Cost | Record |",
  );
  const convenience = markdownTable(
    markdown,
    "| Convenience food | Amount | Protein | Fiber | Cost | Record |",
  );
  assert.equal(staple.length, data.staple.rows.length + 1);
  assert.equal(convenience.length, data.convenience.rows.length + 1);

  function expectFoods(rows, actual, totalLabel, total) {
    rows.forEach((row, index) => {
      const cells = actual[index];
      assert.equal(cells[0], row.food, row.food);
      assert.equal(cells[1], `${row.grams} g`, row.food);
      assert.equal(cells[2], `${row.protein} g`, row.food);
      assert.equal(cells[3], `${row.fiber} g`, row.food);
      assert.equal(cells[4], `$${row.cost}`, row.food);
      assert.equal(cells[5], `[FDC ${row.fdcId}](${row.sourceUrl})`, row.food);
    });
    assert.equal(actual.at(-1)[0], totalLabel);
    assert.equal(actual.at(-1)[2], `${total.dayProtein} g`);
    assert.equal(actual.at(-1)[3], `${total.dayFiber} g`);
    assert.equal(actual.at(-1)[4], `$${total.dayCost}`);
  }

  expectFoods(data.staple.rows, staple, "Staple day", data.staple);
  expectFoods(data.convenience.rows, convenience, "Convenience day", data.convenience);
  assert.equal(data.staple.dayProtein, "200.0");
  assert.equal(data.staple.dayFiber, "112.0");
  assert.equal(data.staple.dayCost, "5.38");
  assert.equal(data.staple.weekCost, "37.63");
  assert.equal(data.convenience.dayCost, "14.41");
  assert.equal(data.convenience.weekCost, "100.84");
  assert.equal(data.staple.weekProtein, "1400.0");
  assert.equal(data.staple.weekFiber, "784.0");
  assert.match(markdown, /\$37\.66/);
  assert.match(markdown, /\$100\.87/);
  assert.match(markdown, /111\.9/);
  assert.match(markdown, /268\.7 g/);

  const drum = data.staple.rows.find((row) => row.edibleGrams);
  assert.equal(drum.purchasedGrams, "268.7");
  assert.equal(drum.proteinPerDollar, "50.3");
  assert.equal(data.proteinDay1.grams, "52.7");
  assert.equal(data.proteinDay1.cost, "0.82");
  assert.equal(data.fiberDay1.grams, "31.9");
  assert.equal(data.fiberDay1.cost, "0.62");
  assert.match(markdown, /210\.8 g/);
  assert.match(markdown, /\$3\.28/);
  assert.match(markdown, /127\.6 g/);
  assert.match(markdown, /\$2\.48/);
  assert.match(markdown, /\]\(\/what-50-grams-of-protein-costs-per-day\/\)/);
  assert.match(markdown, /\]\(\/how-much-100-grams-of-protein-costs-per-day\/\)/);
  assert.match(markdown, /\]\(\/cost-of-50g-protein-and-30g-fiber-per-day\/\)/);
  assert.match(markdown, /\]\(\/plan-week-of-dinners-fewer-grocery-runs\/\)/);
  assert.match(markdown, /\]\(\/cheapest-high-fiber-fruits-and-vegetables\/\)/);
});

test("discard flour costs use the calculator split and the $3.12 bag", () => {
  const markdown = article(DISCARD);
  const rows = markdownTable(
    markdown,
    "| Discard | Hydration | Flour | Water | Flour cost | Record |",
  );
  assert.equal(rows.length, data.discard.length);
  data.discard.forEach((row, index) => {
    const split = discardSplit(row.grams, row.hydration);
    assert.equal(tenth(split.flour), row.flour, `${row.grams} at ${row.hydration}`);
    assert.equal(tenth(split.water), row.water, `${row.grams} at ${row.hydration}`);
    const cells = rows[index];
    assert.equal(cells[0], `${row.grams} g`);
    assert.equal(cells[1], `${row.hydration}%`);
    assert.equal(cells[2], `${row.flour} g`);
    assert.equal(cells[3], `${row.water} g`);
    assert.equal(cells[4], `$${row.cost}`);
    assert.match(cells[5], /168893/);
  });
  assert.equal(data.flourPackage, "3.12");
  assert.equal(data.flourPackageWeight, "2268");
  assert.equal(data.flourProteinPerDollar, "96.0");
  assert.equal(data.flourFiberPerDollar, "77.8");
  assert.equal(data.discard[0].cost, "0.08");
  assert.equal(data.discard.at(-1).cost, "0.17");
  assert.match(markdown, /\]\(\/sourdough-discard-hydration-conversion-chart\/\)/);
  assert.match(markdown, /\]\(\/sourdough-discard-buttermilk-substitute\/\)/);
  assert.match(markdown, /\]\(\/tools\/sourdough-discard-calculator\/\)/);
  assert.match(markdown, /\]\(\/cheapest-whole-grains-for-fiber-per-dollar\/\)/);
  assert.match(markdown, /\]\(\/sourdough-discard-recipes-no-yeast\/\)/);
  assert.match(markdown, /\]\(\/how-long-does-sourdough-discard-last\/\)/);
  assert.match(markdown, /https:\/\/www\.foodsafety\.gov\/keep-food-safe\/foodkeeper-app/);
  assert.match(markdown, /https:\/\/www\.foodsafety\.gov\/food-safety-charts\/cold-food-storage-charts/);
  assert.match(markdown, /170874/);
});

test("chart heroes are 1200 by 675 JPEGs generated from the CSVs", async () => {
  const script = read("scripts/generate-family-basket-and-discard-bake-charts.py");
  assert.match(script, /protein-per-dollar-2026\.csv/);
  assert.match(script, /fiber-per-dollar-2026\.csv/);
  assert.match(script, /protein-day-cost-2026\.csv/);
  assert.match(script, /fiber-day-cost-2026\.csv/);
  assert.doesNotMatch(script, /-main\.jpg/);
  for (const slug of [BASKET, DISCARD]) {
    const bytes = readFileSync(join(ROOT, "public/images", `${slug}-chart.jpg`));
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200, slug);
    assert.equal(meta.height, 675, slug);
  }
});

test("contextual links are one canonical path on each source page", () => {
  for (const [path, href] of LINK_SOURCES) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, `${path} -> ${href}`);
    assert.equal(source.includes(`${href}#`), false, path);
    assert.equal(href.includes(".csv"), false, href);
    assert.equal(source.includes("\u2014"), false, path);
  }
});

test("built sitemap lists both pages and the HTML omits FAQPage and CSV links", () => {
  if (!existsSync(join(ROOT, "dist", "index.html"))) return;
  const sitemapFiles = readdirSync(join(ROOT, "dist")).filter(
    (name) => name.startsWith("sitemap") && name.endsWith(".xml"),
  );
  const sitemap = sitemapFiles.map((name) => readFileSync(join(ROOT, "dist", name), "utf8")).join("\n");
  for (const slug of [BASKET, DISCARD]) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
    const html = readFileSync(join(ROOT, "dist", slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, slug);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i, slug);
    assert.match(html, new RegExp(`/images/${slug}-chart\\.jpg`));
    assert.match(html, /Not a photograph, and not an AI illustration/);
  }
});
