import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { isAiHeroFilename } from "../scripts/lib/ai-image-iptc.mjs";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";
const PIZZA = "gluten-free-sourdough-discard-pizza-dough";
const GRAINS = "cheapest-whole-grains-for-fiber-per-dollar";
const H2 = "Is sourdough discard pizza dough safe for celiac diets, and which gluten-free flour and binder ratio crisps best?";
const GRAIN_H2 = "Which cookable whole grains give you the most fiber per dollar?";

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

function words(text) {
  const plain = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#*_]/g, "");
  return plain.split(/\s+/).filter(Boolean);
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

function orphanSlugs() {
  const source = read("tests/orphan-contextual-inlinks.test.mjs");
  const block = source.match(/const ORPHANS = \[([\s\S]*?)\];/);
  assert.ok(block, "ORPHANS list");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

test("the gluten-free pizza upgrade keeps the locked card and answers the FDA question", () => {
  const markdown = article(PIZZA);
  const before = execFileSync("git", ["show", `origin/main:src/data/articles/${PIZZA}.md`], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(field(markdown, "title"), field(before, "title"));
  assert.equal(field(markdown, "excerpt"), field(before, "excerpt"));
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(before, "author"), "David Miller");
  assert.equal(frontmatter(markdown).includes("ingredientsGrams"), false);
  assert.equal(field(markdown, "dateModified"), DAY);
  assert.equal(field(markdown, "substantiveUpdate"), DAY);
  assert.match(read("tests/substantive-update-datemodified.test.mjs"), new RegExp(`"${PIZZA}": "${DAY}"`));
  assert.equal(markdown.includes("FAQPage"), false);
  assert.equal(markdown.includes("\u2014"), before.includes("\u2014"));
  assert.ok(body(markdown).includes(`## ${H2}\n`), "missing pizza H2");

  const answer = body(markdown).split(`## ${H2}`)[1].trim().split(/\n\s*\n/)[0];
  const count = words(answer).length;
  assert.ok(count >= 40 && count <= 60, `direct answer is ${count} words`);
  assert.match(answer, /FDA 21 CFR 101\.91/);
  assert.match(answer, /20 ppm/);
  assert.match(answer, /169640/);
  assert.match(answer, /169655/);
  assert.match(answer, /169714/);
  assert.match(answer, /175043/);
  assert.match(answer, /psyllium/i);
  assert.match(answer, /xanthan/i);

  const rows = markdownTable(
    markdown,
    "| Blend | Binder | Water | Hydration | Par-bake | Crispness |",
  );
  assert.equal(rows.length, 4);
  assert.equal(rows.filter((row) => /psyllium/i.test(row[1])).length, 2);
  assert.equal(rows.filter((row) => /xanthan/i.test(row[1])).length, 2);
  for (const row of rows) {
    assert.match(row[3], /%$/);
    assert.match(row[4], /minutes/);
  }

  assert.doesNotMatch(body(markdown), /\]\([^)]*\.csv/);
  assert.doesNotMatch(body(markdown), /\]\(\/[^)\s]*#/);
  const orphans = new Set(orphanSlugs());
  for (const match of body(markdown).matchAll(/\]\((\/[^)\s]+)\)/g)) {
    const href = match[1];
    assert.equal(href.endsWith("/"), true, href);
    const slug = href.slice(1, -1);
    assert.equal(orphans.has(slug), false, href);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, href);
  }
});

test("the grain page is a 10-row chart hero and leaves popcorn unverified", () => {
  const markdown = article(GRAINS);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "date"), DAY);
  assert.equal(field(markdown, "dateModified"), DAY);
  assert.equal(field(markdown, "substantiveUpdate"), DAY);
  assert.equal(field(markdown, "image"), `/images/${GRAINS}-chart.jpg`);
  assert.equal(markdown.includes("FAQPage"), false);
  assert.equal(markdown.includes("\u2014"), false);
  assert.ok(body(markdown).includes(`## ${GRAIN_H2}\n`), "missing grain H2");
  assert.match(read("tests/substantive-update-datemodified.test.mjs"), new RegExp(`"${GRAINS}": "${DAY}"`));
  assert.equal(INDEX_PRUNE_SLUGS.has(GRAINS), false);
  assert.doesNotMatch(read("public/_redirects"), new RegExp(`^/${GRAINS}(?:/)?\\s`, "m"));
  assert.equal(existsSync(join(ROOT, "public/images", `${GRAINS}-main.jpg`)), false);
  assert.equal(isAiHeroFilename(`${GRAINS}-chart.jpg`), false);
  assert.match(markdown, /grains-fiber-per-dollar-ranked-2026\.csv/);
  assert.match(markdown, /fiber-per-dollar-2026\.csv/);
  assert.doesNotMatch(markdown, /\[[^\]]*\]\([^)]*\.csv[^)]*\)/);
  assert.match(markdown, /Dietary Guidelines for Americans 2020-2025/);
  assert.match(markdown, /make half your grains whole/i);
  assert.match(markdown, /about 5\.9/);
  assert.match(markdown, /close proxy/);
  assert.match(markdown, /FDC 173888/);

  const fiber = new Map(
    parseCsv(read("public/data/fiber-per-dollar-2026.csv"))
      .filter((row) => row.fdc_id)
      .map((row) => [row.fdc_id, row]),
  );
  const expected = parseCsv(read("public/data/grains-fiber-per-dollar-ranked-2026.csv"))
    .filter((row) => row.fdc_id)
    .sort((left, right) => Number(right.value) - Number(left.value));
  assert.equal(expected.length, 10);
  assert.equal(
    parseCsv(read("public/data/grains-fiber-per-dollar-ranked-2026.csv")).some(
      (row) => row.food === "Popcorn kernels" && !row.fdc_id,
    ),
    true,
  );

  const actual = markdownTable(
    markdown,
    "| Food | Fiber per dollar | Fiber per 100 g | Package | Record |",
  );
  assert.equal(actual.length, 10);
  assert.equal(actual.some((row) => row[0] === "Popcorn kernels"), false);
  expected.forEach((row, index) => {
    const matched = fiber.get(row.fdc_id);
    assert.equal(matched.fiber_g_per_dollar, row.value, row.food);
    const cells = actual[index];
    assert.equal(cells[0], row.food);
    assert.equal(cells[1], `${row.value} g`);
    assert.equal(cells[2], `${matched.fiber_g_per_100g} g`);
    assert.equal(cells[3], `${row.package} for $${row.package_price_usd}`);
    const record = `[FDC ${row.fdc_id}](${row.source_url})`;
    if (row.fdc_id === "173888") {
      assert.equal(cells[4], `${record}, close proxy`);
    } else {
      assert.equal(cells[4], record);
    }
  });
  assert.equal(actual[0][0], "Whole wheat flour");
  assert.equal(actual[1][0], "Pearled barley (dry)");
  assert.equal(actual.at(-1)[0], "100% whole wheat bread");
  assert.match(markdown, /May 2026/);

  const orphans = new Set(orphanSlugs());
  for (const match of body(markdown).matchAll(/\]\((\/[^)\s]+)\)/g)) {
    const href = match[1];
    if (href.startsWith("/images/")) continue;
    assert.equal(href.includes("#"), false, href);
    assert.equal(href.endsWith("/"), true, href);
    const slug = href.slice(1, -1);
    assert.equal(orphans.has(slug), false, href);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, href);
  }
});

test("the chart hero is a 1200 by 675 JPEG generated from the grain CSV", async () => {
  const script = read("scripts/generate-cheapest-whole-grains-fiber-chart.py");
  assert.match(script, /grains-fiber-per-dollar-ranked-2026\.csv/);
  assert.match(script, /Popcorn kernels/);
  assert.doesNotMatch(script, /-main\.jpg/);
  const path = join(ROOT, "public/images", `${GRAINS}-chart.jpg`);
  const bytes = readFileSync(path);
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);
});

test("the spec link sources point at canonical paths", () => {
  const sources = [
    ["src/pages/tools/sourdough-discard-calculator/index.astro", `/gluten-free-sourdough-discard-pizza-dough/`],
    ["src/pages/recipes/index.astro", `/gluten-free-sourdough-discard-pizza-dough/`],
    ["src/pages/tools/fiber-per-dollar-calculator.astro", `/cheapest-whole-grains-for-fiber-per-dollar/`],
    ["src/pages/printables/sourdough-discard-grams-cheat-sheet/index.astro", `/cheapest-whole-grains-for-fiber-per-dollar/`],
  ];
  for (const [path, href] of sources) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, path);
    assert.equal(source.includes(`${href}#`), false, path);
    assert.doesNotMatch(source, new RegExp(`${href.slice(1, -1)}[^\\s"'<]*\\.csv`));
  }
  assert.doesNotMatch(read("src/pages/tools/sourdough-discard-calculator/index.astro"), /\u2014/);
  assert.equal((read("src/pages/recipes/index.astro").match(/href="\/tools\/"/g) ?? []).length, 1);
});

test("built sitemap lists the grain page and neither page emits FAQPage", () => {
  const sitemapPath = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemapPath)) return;
  const sitemap = readFileSync(sitemapPath, "utf8");
  assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${GRAINS}/`));
  assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${PIZZA}/`));
  for (const slug of [GRAINS, PIZZA]) {
    const html = readFileSync(join(ROOT, "dist", slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, slug);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i, slug);
    assert.doesNotMatch(html, /href="\/[^"]*#[^"]*"/, slug);
  }
  assert.match(
    readFileSync(join(ROOT, "dist", GRAINS, "index.html"), "utf8"),
    new RegExp(`/images/${GRAINS}-chart\\.jpg`),
  );
});
