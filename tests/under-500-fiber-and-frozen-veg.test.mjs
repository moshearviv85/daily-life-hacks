import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";

const PAGES = [
  {
    slug: "high-fiber-fast-food-under-500-calories",
    chart: "high-fiber-fast-food-under-500-calories-chart.jpg",
    csvNames: ["high-fiber-fast-food-2026.csv"],
  },
  {
    slug: "cheapest-frozen-vegetables-for-fiber-and-protein",
    chart: "cheapest-frozen-vegetables-for-fiber-and-protein-chart.jpg",
    csvNames: [
      "fiber-per-dollar-2026.csv",
      "protein-per-dollar-2026.csv",
      "produce-fiber-per-dollar-ranked-2026.csv",
      "sodium-per-dollar-2026.csv",
    ],
  },
];

const LINK_SOURCES = [
  ["src/pages/contact.astro", "/high-fiber-fast-food-under-500-calories/"],
  ["src/pages/privacy.astro", "/high-fiber-fast-food-under-500-calories/"],
  ["src/pages/data/[stem]/index.astro", "/cheapest-frozen-vegetables-for-fiber-and-protein/"],
  ["src/pages/disclaimer.astro", "/cheapest-frozen-vegetables-for-fiber-and-protein/"],
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
    rows.push(
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
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

function orderLabel(row) {
  const item = row.item;
  if (item.includes("Tortilla Soup")) return "Chick-fil-A Chicken Tortilla Soup";
  if (item.includes("Green Goddess")) return "Panera Green Goddess Chicken Wrap";
  if (item.includes("Chicken Caesar")) return "Panera Chicken Caesar Wrap";
  if (item.includes("Frontega")) return "Panera Frontega Chicken Wrap";
  if (item.startsWith("Guacamole")) return "Chipotle Large Guacamole";
  if (item.includes("6-inch Veggie Patty")) return "Subway 6-inch Veggie Patty";
  if (item.includes("Avocado Toast")) return "Dunkin' Avocado Toast";
  if (item.includes("Rolled & Steel-Cut")) return "Starbucks Plain Oatmeal";
  if (item.includes("Red Beans") && item.includes("regular")) return "Popeyes Regular Red Beans and Rice";
  if (item.includes("Bean Burrito")) return "Taco Bell Bean Burrito";
  if (item.includes("Multigrain Bagel")) return "Dunkin' Multigrain Bagel";
  if (item.includes("Steel Cut Oatmeal")) return "Panera Steel Cut Oatmeal";
  if (item.includes("Chili Cheese")) return "Wendy's Chili Cheese Potato";
  throw new Error(`unlabeled order: ${item}`);
}

function commas(value) {
  return Number(value).toLocaleString("en-US");
}

test("both chart-hero pages cite the CSVs in plain text and skip FAQPage", () => {
  const redirects = read("public/_redirects");
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const orphans = new Set(orphanSlugs());

  for (const page of PAGES) {
    const markdown = article(page.slug);
    const excerpt = field(markdown, "excerpt");
    assert.equal(field(markdown, "author"), "David Miller", page.slug);
    assert.equal(field(markdown, "category"), "nutrition", page.slug);
    assert.equal(field(markdown, "date"), DAY, page.slug);
    assert.equal(field(markdown, "dateModified"), DAY, page.slug);
    assert.equal(field(markdown, "substantiveUpdate"), DAY, page.slug);
    assert.equal(field(markdown, "image"), `/images/${page.chart}`, page.slug);
    assert.match(field(markdown, "imageAlt"), /chart/i, page.slug);
    assert.doesNotMatch(field(markdown, "imageAlt"), /photo/i, page.slug);
    assert.ok(excerpt.length >= 130 && excerpt.length <= 160, `${page.slug} excerpt ${excerpt.length}`);
    assert.equal(markdown.includes("FAQPage"), false, page.slug);
    assert.equal(markdown.includes("\u2014"), false, page.slug);
    assert.match(registry, new RegExp(`"${page.slug}": "${DAY}"`));
    assert.equal(INDEX_PRUNE_SLUGS.has(page.slug), false, page.slug);
    assert.doesNotMatch(redirects, new RegExp(`^/${page.slug}(?:/)?\\s`, "m"), page.slug);
    assert.equal(existsSync(join(ROOT, "public/images", `${page.slug}-main.jpg`)), false);

    for (const name of page.csvNames) {
      assert.match(markdown, new RegExp(name.replaceAll(".", "\\.")), page.slug);
    }
    assert.doesNotMatch(markdown, /\[[^\]]*\]\([^)]*\.csv[^)]*\)/, page.slug);
    assert.doesNotMatch(markdown, /href=["'][^"']*\.csv/i, page.slug);
    assert.equal(body(markdown).includes(`](/images/${page.chart})`), true, page.slug);

    for (const href of internalHrefs(markdown)) {
      assert.equal(href.includes("#"), false, `${page.slug} ${href}`);
      if (href.startsWith("/images/")) continue;
      assert.equal(href.endsWith("/"), true, href);
      const slug = href.slice(1, -1);
      assert.equal(slug.includes("/"), false, href);
      assert.equal(orphans.has(slug), false, `${page.slug} links orphan ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${page.slug} links pruned ${slug}`);
      assert.equal(existsSync(join(ROOT, "src/data/articles", `${slug}.md`)), true, href);
    }
  }
});

test("the under-500 table is every chain order at or under 500 calories", () => {
  const expected = parseCsv(read("public/data/high-fiber-fast-food-2026.csv"))
    .filter((row) => Number(row.calories) <= 500)
    .sort(
      (left, right) =>
        Number(right.fiber_per_100_kcal) - Number(left.fiber_per_100_kcal) ||
        Number(right.fiber_g) - Number(left.fiber_g) ||
        Number(left.calories) - Number(right.calories) ||
        left.chain.localeCompare(right.chain) ||
        left.item.localeCompare(right.item),
    );
  assert.ok(expected.length >= 12);
  const actual = markdownTable(
    article("high-fiber-fast-food-under-500-calories"),
    "| Order | Fiber per 100 kcal | Fiber | Calories | Protein | Sodium | Official source |",
  );
  assert.equal(actual.length, expected.length);
  expected.forEach((row, index) => {
    const cells = actual[index];
    assert.equal(cells[0], orderLabel(row));
    assert.equal(cells[1], `${row.fiber_per_100_kcal} g`);
    assert.equal(cells[2], `${row.fiber_g} g`);
    assert.equal(cells[3], row.calories);
    assert.equal(cells[4], `${row.protein_g} g`);
    assert.equal(cells[5], `${commas(row.sodium_mg)} mg`);
    assert.equal(cells[6], `[Source](${row.official_url})`);
  });
  assert.equal(actual[0][0], "Chick-fil-A Chicken Tortilla Soup");
  assert.equal(actual[0][1], "5.1 g");
  assert.equal(actual.some((row) => row[0] === "Taco Bell Bean Burrito"), true);
});

test("the frozen table is the five bags plus the fresh broccoli benchmark", () => {
  const fiber = parseCsv(read("public/data/fiber-per-dollar-2026.csv"));
  const protein = new Map(
    parseCsv(read("public/data/protein-per-dollar-2026.csv")).map((row) => [row.food, row]),
  );
  const sodium = new Map(
    parseCsv(read("public/data/sodium-per-dollar-2026.csv")).map((row) => [row.food, row]),
  );
  const frozen = fiber
    .filter((row) => row.category === "Frozen vegetables")
    .sort((left, right) => Number(right.fiber_g_per_dollar) - Number(left.fiber_g_per_dollar));
  const fresh = fiber.find((row) => row.food === "Fresh broccoli crowns");
  assert.equal(frozen.length, 5);
  assert.ok(fresh);
  const expected = [...frozen, fresh];
  const ratio = (Number(frozen.find((row) => row.food === "Frozen broccoli florets").fiber_g_per_dollar) /
    Number(fresh.fiber_g_per_dollar) -
    1) *
    100;
  assert.equal(ratio.toFixed(1), "55.7");

  const actual = markdownTable(
    article("cheapest-frozen-vegetables-for-fiber-and-protein"),
    "| Food | Fiber per dollar | Fiber per 100 g | Protein per dollar | Protein per 100 g | Sodium per 100 g | Package | Record |",
  );
  assert.equal(actual.length, expected.length);
  expected.forEach((row, index) => {
    const proteinRow = protein.get(row.food);
    const sodiumRow = sodium.get(row.food);
    const resolved = row.fdc_id && row.nutrition_source_status !== "unresolved";
    const cells = actual[index];
    assert.equal(cells[0], row.food);
    assert.equal(cells[1], `${row.fiber_g_per_dollar} g`);
    assert.equal(cells[2], resolved ? `${row.fiber_g_per_100g} g` : "unresolved");
    assert.equal(cells[3], proteinRow ? `${proteinRow.protein_g_per_dollar} g` : "not listed");
    assert.equal(cells[4], proteinRow ? `${proteinRow.protein_g_per_100g} g` : "not listed");
    assert.equal(cells[5], sodiumRow ? `${sodiumRow.sodium_mg_per_100g} mg` : "not listed");
    assert.equal(cells[6], `${row.package} for $${row.package_price_usd}`);
    assert.equal(
      cells[7],
      resolved
        ? `[FDC ${row.fdc_id}](${row.source_url})`
        : `protein [FDC ${proteinRow.fdc_id}](${proteinRow.source_url}); fiber unresolved`,
    );
  });
  assert.match(article("cheapest-frozen-vegetables-for-fiber-and-protein"), /7\.7 g of fiber per dollar/);
  assert.match(article("cheapest-frozen-vegetables-for-fiber-and-protein"), /4\.8 g of fiber per 100 g/);
  assert.match(article("cheapest-frozen-vegetables-for-fiber-and-protein"), /\$0\.624 per 100 g/);
});

test("chart heroes are data JPEGs at the article aspect, not photo filenames", async () => {
  const script = read("scripts/generate-under-500-fiber-and-frozen-veg-charts.py");
  assert.match(script, /high-fiber-fast-food-2026\.csv/);
  assert.match(script, /fiber-per-dollar-2026\.csv/);
  assert.match(script, /protein-per-dollar-2026\.csv/);
  assert.doesNotMatch(script, /-main\.jpg/);
  assert.doesNotMatch(script, /photograph|real photo/i);

  for (const page of PAGES) {
    const path = join(ROOT, "public/images", page.chart);
    const bytes = readFileSync(path);
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 675);
  }
});

test("contextual links stay on the named pages and do not add anchors or csv files", () => {
  for (const [path, href] of LINK_SOURCES) {
    const source = read(path);
    const hits = [...source.matchAll(new RegExp(href.replaceAll("/", "\\/"), "g"))];
    assert.equal(hits.length, 1, `${path} should link ${href} once`);
    assert.equal(href.includes("#"), false, href);
    assert.doesNotMatch(source, /FAQPage/);
    assert.equal(source.includes("\u2014"), false, path);
  }
  const data = read("src/pages/data/[stem]/index.astro");
  assert.match(data, /dateModified: DATA_RELEASE_DATE/);
  const contact = read("src/pages/contact.astro");
  assert.match(contact, /page URL, the exact sentence or number/);
  assert.match(contact, /href="\/editorial-policy\/"/);
  assert.match(contact, /robots="noindex, follow"/);
});

test("built pages are in the sitemap and omit FAQPage", () => {
  const sitemap = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemap)) return;
  const xml = readFileSync(sitemap, "utf8");
  for (const page of PAGES) {
    assert.match(xml, new RegExp(`https://www.daily-life-hacks.com/${page.slug}/`));
    const html = readFileSync(join(ROOT, "dist", page.slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, page.slug);
    assert.match(html, new RegExp(`"dateModified":"${DAY}T00:00:00.000Z"`));
    assert.doesNotMatch(html, /Illustration generated with AI/);
    assert.match(html, new RegExp(`/images/${page.chart}`));
  }
});
