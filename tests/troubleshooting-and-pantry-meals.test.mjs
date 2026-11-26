import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";
const TROUBLE = "sourdough-discard-pizza-and-bread-troubleshooting";
const MEALS = "20-minute-high-fiber-meals-from-pantry-staples";

const DISCARD_BATCHES = [
  [200, 100],
  [200, 50],
  [227, 100],
  [227, 50],
];

const PLATES = [
  ["Chickpea peanut toast", [["Canned chickpeas", 150], ["Peanut butter", 48], ["100% whole wheat bread", 56]]],
  ["Peanut toast with peanuts", [["Peanut butter", 48], ["100% whole wheat bread", 84], ["Dry roasted peanuts", 28]]],
  ["Kidney beans and peanuts", [["Canned kidney beans", 130], ["Dry roasted peanuts", 42], ["100% whole wheat bread", 56]]],
  ["Oats, peanut butter, almonds", [["Old-fashioned rolled oats", 80], ["Peanut butter", 64], ["Almonds", 28]]],
  ["Peanut spaghetti", [["Whole wheat spaghetti", 85], ["Peanut butter", 64], ["Almonds", 28]]],
  ["Chickpea sunflower toast", [["Canned chickpeas", 150], ["Sunflower seed kernels", 28], ["100% whole wheat bread", 84]]],
  ["Black beans and almonds", [["Canned black beans", 90], ["100% whole wheat bread", 56], ["Almonds", 42]]],
  ["Quinoa, almonds, and toast", [["Quinoa (dry)", 60], ["Almonds", 42], ["100% whole wheat bread", 84]]],
];

const TROUBLE_LINKS = [
  "/easy-sourdough-discard-pizza-dough-no-yeast/",
  "/sourdough-discard-sandwich-bread-no-yeast/",
  "/sourdough-discard-recipes-no-yeast/",
  "/gluten-free-sourdough-discard-pizza-dough/",
  "/sourdough-discard-hydration-conversion-chart/",
];

const MEAL_LINKS = [
  "/quick-20-minute-high-fiber-meals-for-busy-days/",
  "/cheapest-ways-to-add-10-grams-of-fiber-to-any-meal/",
  "/how-much-protein-and-fiber-in-canned-vs-frozen-vs-dry-staples/",
  "/healthy-blue-collar-lunch-ideas-men/",
];

const LINK_SOURCES = [
  ["src/pages/printables/smoke-point-chart/index.astro", `/${TROUBLE}/`],
  ["src/pages/tools/recipe-finder/index.astro", `/${TROUBLE}/`],
  ["src/pages/tools/protein-per-dollar-calculator/index.astro", `/${MEALS}/`],
  ["src/pages/printables/fridge-life-card/index.astro", `/${MEALS}/`],
];

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((line) => line.some((value) => value !== ""));
  return body.map((line) => Object.fromEntries(header.map((key, index) => [key, line[index] ?? ""])));
}

function byFood(name) {
  return new Map(parseCsv(read(`public/data/${name}`)).map((row) => [row.food, row]));
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

function dec(text) {
  const [whole, frac = ""] = String(text).split(".");
  return { digits: BigInt(whole + (frac || "")), scale: 10n ** BigInt((frac || "").length || 0) };
}

function roundHalfUp(numer, denom, places) {
  const scale = 10n ** BigInt(places);
  const negative = numer < 0n;
  let n = negative ? -numer : numer;
  n *= scale;
  const q = n / denom;
  const r = n % denom;
  const rounded = q + (r * 2n >= denom ? 1n : 0n);
  const raw = rounded.toString().padStart(places + 1, "0");
  const head = raw.slice(0, raw.length - places);
  const tail = raw.slice(raw.length - places);
  const text = places === 0 ? head : `${head}.${tail}`;
  return negative ? `-${text}` : text;
}

function discardRows() {
  const fiber = byFood("fiber-per-dollar-2026.csv").get("Whole wheat flour");
  const protein = byFood("protein-per-dollar-2026.csv").get("Whole wheat flour");
  assert.equal(fiber.fdc_id, protein.fdc_id);
  assert.equal(fiber.package_price_usd, protein.package_price_usd);
  assert.equal(fiber.package_weight_g, protein.package_weight_g);
  const price = dec(fiber.package_price_usd);
  const weight = BigInt(fiber.package_weight_g);
  const fiberRate = dec(fiber.fiber_g_per_100g);
  const proteinRate = dec(protein.protein_g_per_100g);
  return DISCARD_BATCHES.map(([grams, hydration]) => {
    const base = BigInt(100 + hydration);
    const costNumer = BigInt(grams) * 100n * price.digits;
    const costDenom = base * price.scale * weight;
    const fiberNumer = BigInt(grams) * fiberRate.digits;
    const fiberDenom = base * fiberRate.scale;
    const proteinNumer = BigInt(grams) * proteinRate.digits;
    const proteinDenom = base * proteinRate.scale;
    const flourNumer = BigInt(grams) * 100n;
    const waterNumer = BigInt(grams) * BigInt(hydration);
    return {
      grams,
      hydration,
      flour: roundHalfUp(flourNumer, base, 1),
      water: roundHalfUp(waterNumer, base, 1),
      cost: roundHalfUp(costNumer, costDenom, 2),
      fiber: roundHalfUp(fiberNumer, fiberDenom, 1),
      protein: roundHalfUp(proteinNumer, proteinDenom, 1),
      fdc: fiber.fdc_id,
    };
  });
}

function plateRows() {
  const fiber = byFood("fiber-per-dollar-2026.csv");
  const protein = byFood("protein-per-dollar-2026.csv");
  const shelf = byFood("shelf-stable-pantry-per-dollar-2026.csv");
  return PLATES.map(([name, parts]) => {
    let fiberN = 0n;
    let fiberD = 1n;
    let proteinN = 0n;
    let proteinD = 1n;
    let costN = 0n;
    let costD = 1n;
    for (const [food, grams] of parts) {
      const frow = fiber.get(food);
      const prow = protein.get(food);
      const srow = shelf.get(food);
      assert.ok(frow && prow && srow, food);
      assert.equal(frow.fdc_id, prow.fdc_id, food);
      assert.equal(frow.fdc_id, srow.fdc_id, food);
      assert.equal(frow.price_per_100g_usd, prow.price_per_100g_usd, food);
      assert.equal(srow.value, prow.protein_g_per_dollar, food);
      const fiberRate = dec(frow.fiber_g_per_100g);
      const proteinRate = dec(prow.protein_g_per_100g);
      const price = dec(frow.price_per_100g_usd);
      const g = BigInt(grams);
      const nextFiberD = fiberRate.scale * 100n;
      fiberN = fiberN * nextFiberD + fiberRate.digits * g * fiberD;
      fiberD *= nextFiberD;
      const nextProteinD = proteinRate.scale * 100n;
      proteinN = proteinN * nextProteinD + proteinRate.digits * g * proteinD;
      proteinD *= nextProteinD;
      const nextCostD = price.scale * 100n;
      costN = costN * nextCostD + price.digits * g * costD;
      costD *= nextCostD;
    }
    return {
      name,
      parts,
      fiber: roundHalfUp(fiberN, fiberD, 1),
      protein: roundHalfUp(proteinN, proteinD, 1),
      cost: roundHalfUp(costN, costD, 2),
    };
  });
}

test("both tips pages cite CSVs in plain text and skip FAQPage", () => {
  const redirects = read("public/_redirects");
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const orphans = new Set(orphanSlugs());
  const pages = [
    {
      slug: TROUBLE,
      csvNames: ["fiber-per-dollar-2026.csv"],
      links: TROUBLE_LINKS,
    },
    {
      slug: MEALS,
      csvNames: [
        "fiber-per-dollar-2026.csv",
        "protein-per-dollar-2026.csv",
        "shelf-stable-pantry-per-dollar-2026.csv",
      ],
      links: MEAL_LINKS,
    },
  ];

  for (const page of pages) {
    const markdown = article(page.slug);
    const excerpt = field(markdown, "excerpt");
    assert.equal(field(markdown, "author"), "David Miller", page.slug);
    assert.equal(field(markdown, "category"), "tips", page.slug);
    assert.equal(field(markdown, "date"), DAY, page.slug);
    assert.equal(field(markdown, "dateModified"), DAY, page.slug);
    assert.equal(field(markdown, "substantiveUpdate"), DAY, page.slug);
    assert.equal(field(markdown, "image"), `/images/${page.slug}-chart.jpg`, page.slug);
    assert.match(field(markdown, "imageAlt"), /chart/i, page.slug);
    assert.doesNotMatch(field(markdown, "imageAlt"), /photo/i, page.slug);
    assert.ok(excerpt.length >= 130 && excerpt.length <= 160, `${page.slug} excerpt ${excerpt.length}`);
    assert.equal(markdown.includes("FAQPage"), false, page.slug);
    assert.equal(markdown.includes("\u2014"), false, page.slug);
    assert.doesNotMatch(markdown, /photograph|real photo|\bphoto of\b/i, page.slug);
    assert.match(registry, new RegExp(`"${page.slug}": "${DAY}"`));
    assert.equal(INDEX_PRUNE_SLUGS.has(page.slug), false, page.slug);
    assert.equal(existsSync(join(ROOT, "public/images", `${page.slug}-main.jpg`)), false, page.slug);
    assert.doesNotMatch(redirects, new RegExp(`^/${page.slug}(?:/)?\\s`, "m"), page.slug);
    assert.equal(body(markdown).includes(`](/images/${page.slug}-chart.jpg)`), true, page.slug);
    for (const name of page.csvNames) {
      assert.match(markdown, new RegExp(name.replaceAll(".", "\\.")), page.slug);
    }
    assert.doesNotMatch(markdown, /\[[^\]]*\]\([^)]*\.csv[^)]*\)/, page.slug);
    assert.doesNotMatch(markdown, /href=["'][^"']*\.csv/i, page.slug);

    const hrefs = internalHrefs(markdown);
    for (const expected of page.links) {
      assert.equal(hrefs.includes(expected), true, `${page.slug} missing ${expected}`);
    }
    for (const href of hrefs) {
      assert.equal(href.includes("#"), false, `${page.slug} ${href}`);
      if (href.startsWith("/images/")) continue;
      assert.equal(href.endsWith("/"), true, href);
      const slug = href.slice(1, -1);
      assert.equal(slug.includes("/"), false, href);
      assert.equal(orphans.has(slug), false, `${page.slug} links orphan ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${page.slug} links pruned ${slug}`);
      assert.equal(INDEX_NOINDEX_TOOL_PATHS.has(slug), false, `${page.slug} links noindex ${slug}`);
      assert.equal(existsSync(join(ROOT, "src/data/articles", `${slug}.md`)), true, href);
    }
  }
});

test("discard flour and water match the whole wheat flour row", () => {
  const markdown = article(TROUBLE);
  const actual = markdownTable(
    markdown,
    "| Discard | Hydration | Flour | Water | Flour cost | Fiber in the flour | Protein in the flour |",
  );
  const expected = discardRows();
  assert.equal(actual.length, expected.length);
  expected.forEach((row, index) => {
    assert.equal(actual[index][0], `${row.grams} g`);
    assert.equal(actual[index][1], `${row.hydration}%`);
    assert.equal(actual[index][2], `${row.flour} g`);
    assert.equal(actual[index][3], `${row.water} g`);
    assert.equal(actual[index][4], `$${row.cost}`);
    assert.equal(actual[index][5], `${row.fiber} g`);
    assert.equal(actual[index][6], `${row.protein} g`);
  });
  assert.match(markdown, /\$3\.12/);
  assert.match(markdown, /2268 g/);
  assert.match(markdown, /168893/);
});

test("pantry plates match the three CSVs and rank by cost", () => {
  const markdown = article(MEALS);
  const actual = markdownTable(markdown, "| Plate | Assembly | Fiber | Protein | Cost |");
  const expected = plateRows().sort((a, b) => {
    const cost = Number(a.cost) - Number(b.cost);
    if (cost !== 0) return cost;
    const fiber = Number(a.fiber) - Number(b.fiber);
    if (fiber !== 0) return fiber;
    return a.name.localeCompare(b.name);
  });
  assert.equal(actual.length, 8);
  assert.equal(expected[0].cost, "0.89");
  assert.equal(expected[0].fiber, "12.4");
  assert.equal(expected.at(-1).cost, "1.51");
  const fibers = expected.map((row) => Number(row.fiber));
  assert.equal(Math.min(...fibers), 9.8);
  assert.equal(Math.max(...fibers), 14.8);
  expected.forEach((row, index) => {
    assert.equal(actual[index][0], row.name, row.name);
    assert.equal(actual[index][2], `${row.fiber} g`, row.name);
    assert.equal(actual[index][3], `${row.protein} g`, row.name);
    assert.equal(actual[index][4], `$${row.cost}`, row.name);
    for (const [food, grams] of row.parts) {
      assert.match(actual[index][1], new RegExp(`${grams} g`), `${row.name} ${food}`);
    }
  });
});

test("chart heroes are 1200 by 675 JPEGs drawn from the CSVs", async () => {
  const script = read("scripts/generate-troubleshooting-and-pantry-meal-charts.py");
  assert.match(script, /fiber-per-dollar-2026\.csv/);
  assert.match(script, /protein-per-dollar-2026\.csv/);
  assert.match(script, /shelf-stable-pantry-per-dollar-2026\.csv/);
  assert.doesNotMatch(script, /-main\.jpg/);
  for (const [, parts] of PLATES) {
    for (const [food, grams] of parts) {
      assert.match(script, new RegExp(food.replaceAll("(", "\\(").replaceAll(")", "\\)")));
      assert.match(script, new RegExp(String(grams)));
    }
  }
  for (const [grams, hydration] of DISCARD_BATCHES) {
    assert.match(script, new RegExp(`\\(${grams}, ${hydration}\\)`));
  }
  for (const slug of [TROUBLE, MEALS]) {
    const path = join(ROOT, "public/images", `${slug}-chart.jpg`);
    const bytes = readFileSync(path);
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200, slug);
    assert.equal(meta.height, 675, slug);
  }
});

test("contextual links use one canonical path and no file link", () => {
  for (const [path, href] of LINK_SOURCES) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, path);
    assert.equal(source.includes(`${href}#`), false, path);
    assert.doesNotMatch(source, /\[[^\]]*\]\([^)]*\.csv/);
    assert.equal(source.includes("FAQPage"), false, path);
    assert.equal(source.includes("\u2014"), false, path);
  }
});

test("built sitemap lists both tips pages and neither emits FAQPage", () => {
  const sitemapPath = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemapPath)) return;
  const sitemap = readFileSync(sitemapPath, "utf8");
  for (const slug of [TROUBLE, MEALS]) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
    const html = readFileSync(join(ROOT, "dist", slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, slug);
    assert.match(html, /David Miller/);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i, slug);
    assert.doesNotMatch(html, /href="\/[^"]*#[^"]*"/, slug);
    assert.match(html, new RegExp(`/images/${slug}-chart\\.jpg`));
    assert.match(html, /content="index, follow/);
  }
});
