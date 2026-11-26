import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";

const PAGES = [
  {
    slug: "low-sodium-high-protein-foods-per-dollar",
    chart: "low-sodium-high-protein-foods-per-dollar-chart.jpg",
    csvNames: ["protein-per-dollar-2026.csv", "sodium-per-dollar-2026.csv"],
  },
  {
    slug: "cheapest-high-fiber-fruits-and-vegetables",
    chart: "cheapest-high-fiber-fruits-and-vegetables-chart.jpg",
    csvNames: ["produce-fiber-per-dollar-ranked-2026.csv", "fiber-per-dollar-2026.csv"],
  },
];

const LINK_SOURCES = [
  ["plant-based-protein-sources-complete-guide", "/low-sodium-high-protein-foods-per-dollar/"],
  ["cheapest-complete-protein-pairs", "/low-sodium-high-protein-foods-per-dollar/"],
  ["best-high-fiber-foods-ranked-by-fiber-content", "/cheapest-high-fiber-fruits-and-vegetables/"],
  ["can-you-refreeze-frozen-vegetables-after-thawing", "/cheapest-high-fiber-fruits-and-vegetables/"],
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

test("both chart-hero pages cite the CSVs in plain text and skip FAQPage", () => {
  const redirects = read("public/_redirects");
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const orphans = new Set(orphanSlugs());

  for (const page of PAGES) {
    const markdown = article(page.slug);
    assert.equal(field(markdown, "author"), "David Miller", page.slug);
    assert.equal(field(markdown, "date"), DAY, page.slug);
    assert.equal(field(markdown, "dateModified"), DAY, page.slug);
    assert.equal(field(markdown, "substantiveUpdate"), DAY, page.slug);
    assert.equal(field(markdown, "image"), `/images/${page.chart}`, page.slug);
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
      assert.equal(orphans.has(slug), false, `${page.slug} links orphan ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${page.slug} links pruned ${slug}`);
    }
  }
});

test("the protein table is the 25-food join of the two price sheets", () => {
  const sodium = new Map(
    parseCsv(read("public/data/sodium-per-dollar-2026.csv"))
      .filter((row) => row.fdc_id)
      .map((row) => [row.fdc_id, row]),
  );
  const expected = parseCsv(read("public/data/protein-per-dollar-2026.csv"))
    .filter((row) => {
      const sodiumRow = sodium.get(row.fdc_id);
      return (
        sodiumRow &&
        Number(sodiumRow.sodium_mg_per_100g) <= 140 &&
        Number(row.protein_g_per_100g) >= 9.9
      );
    })
    .sort(
      (left, right) =>
        Number(right.protein_g_per_dollar) - Number(left.protein_g_per_dollar) ||
        left.food.localeCompare(right.food),
    );
  assert.equal(expected.length, 25);

  const actual = markdownTable(
    article("low-sodium-high-protein-foods-per-dollar"),
    "| # | Food | Protein per dollar | Protein per 100 g | Sodium per 100 g | Record |",
  );
  assert.equal(actual.length, expected.length);
  expected.forEach((row, index) => {
    const sodiumRow = sodium.get(row.fdc_id);
    const cells = actual[index];
    assert.equal(cells[0], String(index + 1));
    assert.equal(cells[1], row.food);
    assert.equal(cells[2], `${row.protein_g_per_dollar} g`);
    assert.equal(cells[3], `${row.protein_g_per_100g} g`);
    assert.equal(cells[4], `${sodiumRow.sodium_mg_per_100g} mg`);
    assert.equal(cells[5], `[FDC ${row.fdc_id}](${sodiumRow.source_url})`);
  });

  const featured = [
    ["172420", "77.7", "6"],
    ["172428", "73.9", "5"],
    ["173745", "59.9", "5"],
    ["173734", "58.0", "5"],
    ["175199", "57.6", "12"],
    ["172373", "50.3", "106"],
    ["170562", "31.7", "9"],
    ["173627", "27.7", "95"],
    ["170894", "27.5", "36"],
    ["171077", "24.6", "45"],
    ["168410", "18.0", "6"],
    ["174290", "13.6", "4"],
  ];
  for (const [fdcId, proteinPerDollar, sodiumMg] of featured) {
    const row = expected.find((item) => item.fdc_id === fdcId);
    assert.ok(row, fdcId);
    assert.equal(row.protein_g_per_dollar, proteinPerDollar, fdcId);
    assert.equal(sodium.get(fdcId).sodium_mg_per_100g, sodiumMg, fdcId);
  }
});

test("the produce table is the 22-row fiber-per-dollar sheet", () => {
  const fiber = new Map(
    parseCsv(read("public/data/fiber-per-dollar-2026.csv"))
      .filter((row) => row.fdc_id)
      .map((row) => [row.fdc_id, row]),
  );
  const expected = parseCsv(read("public/data/produce-fiber-per-dollar-ranked-2026.csv"));
  assert.equal(expected.length, 22);
  const values = expected.map((row) => Number(row.value));
  assert.equal(Math.max(...values) / Math.min(...values) > 7, true);

  const actual = markdownTable(
    article("cheapest-high-fiber-fruits-and-vegetables"),
    "| Food | Fiber per dollar | Fiber per 100 g | Package | Record |",
  );
  assert.equal(actual.length, expected.length);
  expected.forEach((row, index) => {
    const matched = fiber.get(row.fdc_id);
    const verified = matched && matched.fiber_g_per_dollar === row.value;
    const cells = actual[index];
    assert.equal(cells[0], row.food);
    assert.equal(cells[1], `${row.value} g`);
    assert.equal(cells[2], verified ? `${matched.fiber_g_per_100g} g` : "unresolved");
    assert.equal(cells[3], `${row.package} for $${row.package_price_usd}`);
    assert.equal(
      cells[4],
      verified ? `[FDC ${row.fdc_id}](${row.source_url})` : "no record on this sheet",
    );
  });
  assert.equal(actual[0][0], "Frozen green peas");
  assert.equal(actual[0][1], "17.6 g");
  assert.equal(actual.at(-1)[0], "Blueberries");
  assert.equal(actual.at(-1)[1], "2.5 g");
  assert.equal(actual.find((row) => row[0] === "Frozen shelled edamame")[2], "unresolved");
});

test("chart heroes are data JPEGs at the article aspect, not photo filenames", async () => {
  const script = read("scripts/generate_dual_constraint_charts.py");
  assert.match(script, /protein-per-dollar-2026\.csv/);
  assert.match(script, /sodium-per-dollar-2026\.csv/);
  assert.match(script, /produce-fiber-per-dollar-ranked-2026\.csv/);
  assert.doesNotMatch(script, /-main\.jpg/);

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

test("contextual links do not move the source page dates", () => {
  for (const [slug, href] of LINK_SOURCES) {
    const path = `src/data/articles/${slug}.md`;
    const after = read(path);
    const before = execFileSync("git", ["show", `origin/main:${path}`], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(frontmatter(after), frontmatter(before), slug);
    const hrefs = [...body(after).matchAll(/\]\(([^)\s]+)\)/g)]
      .map((match) => match[1])
      .filter((value) => value === href);
    const beforeHrefs = [...body(before).matchAll(/\]\(([^)\s]+)\)/g)]
      .map((match) => match[1])
      .filter((value) => value === href);
    assert.equal(hrefs.length, beforeHrefs.length + 1, slug);
    assert.equal(href.includes("#"), false, href);
  }
});

test("built sitemap lists both pages and the HTML does not link a CSV", () => {
  const sitemapFiles = readdirSync(join(ROOT, "dist")).filter(
    (name) => name.startsWith("sitemap") && name.endsWith(".xml"),
  );
  const sitemap = sitemapFiles.map((name) => readFileSync(join(ROOT, "dist", name), "utf8")).join("\n");
  for (const page of PAGES) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${page.slug}/`));
    const html = readFileSync(join(ROOT, "dist", page.slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, page.slug);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i, page.slug);
    assert.match(html, new RegExp(`/images/${page.chart.replaceAll(".", "\\.")}`));
    for (const name of page.csvNames) {
      assert.match(html, new RegExp(name.replaceAll(".", "\\.")));
    }
  }
});
