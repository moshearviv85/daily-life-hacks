import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = new URL("..", import.meta.url).pathname;
const DAY = "2026-11-26";
const PANTRY = "cheapest-shelf-stable-pantry-foods-for-protein";
const NUTS = "cheapest-nuts-and-seeds-for-protein-and-fiber";

const LINK_SOURCES = [
  ["src/pages/tools/shopping-list-builder/index.astro", `/${PANTRY}/`],
  ["src/pages/api-docs.astro", `/${PANTRY}/`],
  ["src/pages/tools/grocery-trip-savings-calculator/index.astro", `/${NUTS}/`],
  ["src/pages/methodology.astro", `/${NUTS}/`],
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
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
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

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

function halfUp(value, places) {
  const factor = 10 ** places;
  const shifted = value * factor;
  const rounded = Math.sign(shifted) * Math.floor(Math.abs(shifted) + 0.5 + Number.EPSILON);
  return rounded / factor;
}

test("both chart pages cite the CSVs in text and skip FAQPage", () => {
  const redirects = read("public/_redirects");
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const orphans = new Set(orphanSlugs());
  const pages = [
    {
      slug: PANTRY,
      title: "Cheapest Shelf-Stable Pantry Foods for Protein",
      excerpt:
        "Whole wheat flour buys 96 grams of protein per dollar and needs no fridge. Twenty-seven pantry prices, from an $0.88 can to a $17.47 frozen bag.",
      csvNames: ["shelf-stable-pantry-per-dollar-2026.csv"],
    },
    {
      slug: NUTS,
      title: "Cheapest Nuts and Seeds for Protein and Fiber",
      excerpt:
        "Peanut butter buys 50.7 grams of protein per dollar. Chia seeds buy 33.1 grams of fiber. Six nuts and seeds, with sodium set next to the price.",
      csvNames: [
        "protein-per-dollar-2026.csv",
        "fiber-per-dollar-2026.csv",
        "sodium-per-dollar-2026.csv",
      ],
    },
  ];

  for (const page of pages) {
    const markdown = article(page.slug);
    const excerpt = field(markdown, "excerpt");
    assert.equal(field(markdown, "title"), page.title, page.slug);
    assert.equal(excerpt, page.excerpt, page.slug);
    assert.ok(excerpt.length >= 130 && excerpt.length <= 160, `${page.slug} excerpt ${excerpt.length}`);
    assert.equal(field(markdown, "author"), "David Miller", page.slug);
    assert.equal(field(markdown, "category"), "nutrition", page.slug);
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
    }
  }
});

test("the pantry table is the 27-row shelf-stable file, freezer row included", () => {
  const rows = parseCsv(read("public/data/shelf-stable-pantry-per-dollar-2026.csv"));
  assert.equal(rows.length, 27);
  const markdown = article(PANTRY);
  const actual = markdownTable(
    markdown,
    "| Food | Protein per dollar | Package | Price | Record |",
  );
  assert.equal(actual.length, 27);
  rows.forEach((row, index) => {
    const cells = actual[index];
    assert.equal(cells[0], row.food, row.food);
    assert.equal(cells[1], `${row.value} g`, row.food);
    assert.equal(cells[2], row.package, row.food);
    assert.equal(cells[3], money(row.package_price_usd), row.food);
    assert.equal(cells[4], `[FDC ${row.fdc_id}](${row.source_url})`, row.food);
  });
  assert.equal(rows[0].food, "Whole wheat flour");
  assert.equal(rows[0].value, "96.0");
  assert.equal(money(rows[0].package_price_usd), "$3.12");
  assert.equal(rows.at(-1).food, "Almonds");
  assert.equal(rows.at(-1).value, "14.8");
  const prices = rows.map((row) => Number(row.package_price_usd));
  assert.equal(Math.min(...prices), 0.88);
  assert.equal(Math.max(...prices), 17.47);
  const tilapia = rows.find((row) => row.fdc_id === "175176");
  assert.equal(tilapia.food, "Frozen tilapia fillets");
  assert.equal(tilapia.value, "20.9");
  assert.match(markdown, /2 to 5 years/);
  assert.match(markdown, /below 85°F/);
  assert.match(markdown, /Keep Refrigerated/);
  assert.match(
    markdown,
    /https:\/\/www\.fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/shelf-stable-food/,
  );
  assert.match(markdown, /\]\(\/no-cook-emergency-protein-and-fiber-grocery-list\/\)/);
  assert.match(markdown, /\]\(\/cheapest-nuts-and-seeds-for-protein-and-fiber\/\)/);
});

test("the nuts table joins protein, fiber, and sodium without inventing flax protein", () => {
  const protein = new Map(
    parseCsv(read("public/data/protein-per-dollar-2026.csv")).map((row) => [row.fdc_id, row]),
  );
  const fiber = new Map(
    parseCsv(read("public/data/fiber-per-dollar-2026.csv")).map((row) => [row.fdc_id, row]),
  );
  const sodium = new Map(
    parseCsv(read("public/data/sodium-per-dollar-2026.csv"))
      .filter((row) => row.fdc_id)
      .map((row) => [row.fdc_id, row]),
  );
  const markdown = article(NUTS);
  const actual = markdownTable(
    markdown,
    "| Food | Protein per dollar | Fiber per dollar | Sodium per 100 g | Package | Record |",
  );
  const expected = [
    ["174266", "426 mg", "40 oz jar, $4.97"],
    ["174262", "410 mg", "16 oz jar, $2.78"],
    ["170554", "16 mg", "32 oz bag, $9.44"],
    ["170562", "9 mg", "16 oz bag, $2.98"],
    ["169414", "30 mg", "22 oz bag, $5.98"],
    ["170567", "1 mg", "16 oz bag, $6.47"],
  ];
  assert.equal(actual.length, 6);
  assert.equal(sodium.get("170567").rank_lowest_sodium_first, "1");
  assert.equal(protein.has("170554"), false);
  assert.equal(protein.has("169414"), false);
  expected.forEach(([fdcId, sodiumCell, packageCell], index) => {
    const proteinRow = protein.get(fdcId);
    const fiberRow = fiber.get(fdcId);
    const sodiumRow = sodium.get(fdcId);
    const cells = actual[index];
    assert.equal(cells[0], fiberRow.food, fdcId);
    assert.equal(
      cells[1],
      proteinRow ? `${proteinRow.protein_g_per_dollar} g` : "not on the protein sheet",
      fdcId,
    );
    assert.equal(cells[2], `${fiberRow.fiber_g_per_dollar} g`, fdcId);
    assert.equal(cells[3], sodiumCell, fdcId);
    if (sodiumRow) assert.equal(`${sodiumRow.sodium_mg_per_100g} mg`, sodiumCell, fdcId);
    else assert.equal(sodium.has(fdcId), false, fdcId);
    assert.equal(cells[4], packageCell, fdcId);
    assert.equal(cells[5], `[FDC ${fdcId}](${fiberRow.source_url})`, fdcId);
    const proteinRate = proteinRow ? Number(proteinRow.protein_g_per_dollar) : null;
    const fiberRate = Number(fiberRow.fiber_g_per_dollar);
    if (proteinRate) {
      assert.match(markdown, new RegExp(`\\$${halfUp(10 / proteinRate, 2).toFixed(2)}`), fdcId);
    }
    assert.match(markdown, new RegExp(`\\$${halfUp(5 / fiberRate, 2).toFixed(2)}`), fdcId);
  });
  const chia = fiber.get("170554");
  const chiaProtein = halfUp((16.54 / 100) * Number(chia.package_weight_g) / Number(chia.package_price_usd), 1);
  assert.equal(chiaProtein, 15.9);
  assert.match(markdown, /16\.54 grams of protein per 100 grams/);
  assert.match(markdown, /15\.9 grams of protein per dollar/);
  assert.match(markdown, /21 CFR 101\.61/);
  assert.match(
    markdown,
    /https:\/\/www\.ecfr\.gov\/current\/title-21\/chapter-I\/subchapter-B\/part-101\/subpart-D\/section-101\.61/,
  );
  assert.match(markdown, /\]\(\/cheapest-shelf-stable-pantry-foods-for-protein\/\)/);
  assert.match(markdown, /426 mg/);
  assert.match(markdown, /410 mg/);
});

test("chart heroes are data JPEGs from the CSVs, not photo filenames", async () => {
  const script = read("scripts/generate-shelf-stable-and-nuts-charts.py");
  assert.match(script, /shelf-stable-pantry-per-dollar-2026\.csv/);
  assert.match(script, /protein-per-dollar-2026\.csv/);
  assert.match(script, /fiber-per-dollar-2026\.csv/);
  assert.doesNotMatch(script, /-main\.jpg/);
  const expected = [
    [`${PANTRY}-chart.jpg`, 1200, 1150],
    [`${NUTS}-chart.jpg`, 1200, 675],
  ];
  for (const [name, width, height] of expected) {
    const bytes = readFileSync(join(ROOT, "public/images", name));
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, width, name);
    assert.equal(meta.height, height, name);
  }
});

test("contextual links are one canonical path and methodology keeps its date", () => {
  for (const [path, href] of LINK_SOURCES) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, `${path} -> ${href}`);
    assert.equal(source.includes(`${href}#`), false, path);
    assert.equal(href.includes(".csv"), false, href);
  }
  const methodology = read("src/pages/methodology.astro");
  assert.match(methodology, /dateModified: "2026-07-30"/);
  assert.equal(methodology.includes("\u2014"), false);
});

test("built sitemap lists both pages and the HTML omits FAQPage", () => {
  if (!existsSync(join(ROOT, "dist", "index.html"))) return;
  const sitemap = readdirSync(join(ROOT, "dist"))
    .filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"))
    .map((name) => readFileSync(join(ROOT, "dist", name), "utf8"))
    .join("\n");
  for (const slug of [PANTRY, NUTS]) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
    const html = readFileSync(join(ROOT, "dist", slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, slug);
    assert.match(html, new RegExp(`"dateModified":"${DAY}T00:00:00.000Z"`));
    assert.match(html, /David Miller/);
    assert.match(html, /<meta name="robots" content="index, follow/);
    assert.doesNotMatch(html, /href="[^"]*\.csv"/);
    assert.doesNotMatch(html, /href="\/[^"]*#/);
  }
});
