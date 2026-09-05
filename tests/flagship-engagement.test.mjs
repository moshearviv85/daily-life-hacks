import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  FLAGSHIP_ENGAGEMENT,
  FLAGSHIP_RANKING_ANCHOR,
  flagshipHighlightNumbers,
} from "../src/content/flagship-engagement.mjs";
import { applyRankingTables } from "../scripts/rehype-ranking-tables.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function parseCsv(source) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }

  const [headers, ...rows] = records;
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]])),
    );
}

function el(tagName, properties = {}, children = []) {
  return { type: "element", tagName, properties, children };
}

function text(value) {
  return { type: "text", value };
}

function heading(textValue) {
  return el("h2", { id: "generated-slug" }, [text(textValue)]);
}

function rankingFixture(foods) {
  return {
    type: "root",
    children: [
      heading("What is the cheapest source of protein per dollar?"),
      el("p", {}, [text("Answer paragraph.")]),
      heading("The full ranking: 49 protein sources by protein per dollar"),
      el("p", {}, [text("Table intro.")]),
      el("table", {}, [
        el("thead", {}, [
          el("tr", {}, [el("th", {}, [text("Rank")]), el("th", {}, [text("Food")])]),
        ]),
        el(
          "tbody",
          {},
          foods.map((food, index) =>
            el("tr", {}, [
              el("td", {}, [text(String(index + 1))]),
              el("td", {}, [text(food)]),
            ]),
          ),
        ),
      ]),
      el("p", {}, [text("Footnote about edible portion.")]),
      heading("How we ran the numbers"),
    ],
  };
}

function findById(node, id) {
  if (node?.properties?.id === id) return node;
  for (const child of node.children || []) {
    const match = findById(child, id);
    if (match) return match;
  }
  return null;
}

function findByClass(node, className, found = []) {
  if ((node.properties?.className || []).includes(className)) found.push(node);
  for (const child of node.children || []) findByClass(child, className, found);
  return found;
}

test("flagship highlight and shortlist numbers match the published CSVs", () => {
  for (const [slug, config] of Object.entries(FLAGSHIP_ENGAGEMENT)) {
    const rows = parseCsv(read(config.csv));
    const byFood = new Map(rows.map((row) => [row.food, row]));

    for (const { food, grams } of flagshipHighlightNumbers(config)) {
      const row = byFood.get(food);
      assert.ok(row, `${slug} highlight food missing from CSV: ${food}`);
      assert.equal(
        row[config.csvColumn],
        grams,
        `${slug} highlight ${food} should be ${row[config.csvColumn]}, not ${grams}`,
      );
    }

    for (const item of config.shortlist.items) {
      const row = byFood.get(item.food);
      assert.ok(row, `${slug} shortlist food missing from CSV: ${item.food}`);
      assert.equal(row[config.csvColumn], item.grams);
      assert.equal(Number(row.rank), item.rank);
    }

    assert.match(config.disclosure, /July 2026/);
    assert.match(config.disclosure, /USDA FoodData Central/);
    assert.match(config.disclosure, /not a food endorsement/i);
    assert.equal(config.rankingJump.href, `#${FLAGSHIP_RANKING_ANCHOR}`);
    assert.equal(config.rankingJump.label, "See the full ranking");
    assert.match(config.nextStep.primary.href, /^\/(?:fiber|protein)-per-dollar-/);
    assert.equal(config.nextStep.secondary.href, "/food-value-database/");
  }

  const protein = FLAGSHIP_ENGAGEMENT["protein-per-dollar-cheapest-protein-sources"];
  const fiber = FLAGSHIP_ENGAGEMENT["fiber-per-dollar-cheapest-high-fiber-foods"];
  const proteinRows = parseCsv(read(protein.csv));
  const fiberRows = parseCsv(read(fiber.csv));
  const proteinByFood = new Map(proteinRows.map((row) => [row.food, row]));
  const fiberByFood = new Map(fiberRows.map((row) => [row.food, row]));
  const splitPeas = fiberByFood.get("Green split peas (dry)");
  const blueberries = fiberByFood.get("Blueberries");
  const flour = proteinByFood.get("Whole wheat flour");
  const bacon = proteinByFood.get("Bacon");
  assert.match(protein.nextStep.text, new RegExp(`${splitPeas.fiber_g_per_dollar} grams of fiber`));
  assert.match(protein.nextStep.text, new RegExp(blueberries.fiber_g_per_dollar.replace(".", "\\.")));
  assert.match(fiber.nextStep.text, new RegExp(`${flour.protein_g_per_dollar} grams`));
  assert.match(fiber.nextStep.text, new RegExp(bacon.protein_g_per_dollar.replace(".", "\\.")));
});

test("flagship ranking tables lock food, rank, and grams-per-dollar to the live CSVs", () => {
  const tables = [
    {
      slug: "protein-per-dollar-cheapest-protein-sources",
      article: "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
      csv: "public/data/protein-per-dollar-2026.csv",
      header: "| Rank | Food | Protein (g per 100g) | Price per 100g | Protein per $1 |",
      column: "protein_g_per_dollar",
    },
    {
      slug: "fiber-per-dollar-cheapest-high-fiber-foods",
      article: "src/data/articles/fiber-per-dollar-cheapest-high-fiber-foods.md",
      csv: "public/data/fiber-per-dollar-2026.csv",
      header: "| Rank | Food | Fiber (g per 100g) | Price per 100g | Fiber per $1 |",
      column: "fiber_g_per_dollar",
    },
  ];

  for (const table of tables) {
    const rows = parseCsv(read(table.csv));
    const markdown = read(table.article);
    const start = markdown.indexOf(table.header);
    assert.notEqual(start, -1, `${table.slug} missing ranking table`);
    const lines = [];
    for (const line of markdown.slice(start).split(/\r?\n/).slice(2)) {
      if (!line.startsWith("|")) break;
      lines.push(line);
    }
    assert.equal(lines.length, rows.length, `${table.slug} table length drifted from CSV`);
    for (const [index, row] of rows.entries()) {
      const cells = lines[index]
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());
      assert.equal(cells[0], row.rank, `${table.slug} rank ${row.rank}`);
      assert.equal(cells[1], row.food, `${table.slug} food ${row.food}`);
      assert.equal(
        cells[4],
        `${row[table.column]} g`,
        `${table.slug} ${row.food} should show ${row[table.column]} g from the CSV`,
      );
    }
  }
});

test("reusable pull-quote and jump components stay honest buttons and anchors", () => {
  const pullQuote = read("src/components/StudyPullQuote.astro");
  const lead = read("src/components/StudyLead.astro");
  const nextStep = read("src/components/StudyNextStep.astro");
  const slugPage = read("src/pages/[slug].astro");

  assert.match(pullQuote, /class="study-pull-quote"/);
  assert.match(pullQuote, /<blockquote>/);
  assert.match(pullQuote, /study-pull-quote-value/);
  assert.match(pullQuote, /study-pull-quote-note/);

  assert.match(lead, /class="study-ranking-jump"/);
  assert.match(lead, /href=\{jumpHref\}/);
  assert.match(lead, /StudyPullQuote/);

  assert.match(nextStep, /class="study-next-step"/);
  assert.match(nextStep, /href=\{primary\.href\}/);
  assert.match(nextStep, /href=\{secondary\.href\}/);

  assert.match(slugPage, /getFlagshipEngagement/);
  assert.match(slugPage, /<StudyLead/);
  assert.match(slugPage, /<StudyNextStep/);
  assert.match(slugPage, /href=\{`\/\$\{article\.data\.category\}\/`\}/);
  assert.match(slugPage, /disabled\s*\n\s*aria-disabled="true"/);
});

test("article CSS covers pull quotes, ranking jump, and table stay-power", () => {
  const css = read("src/styles/global.css");
  for (const needle of [
    ".study-pull-quote",
    ".study-pull-quote-value",
    ".study-ranking-jump",
    ".ranking-table-wrap",
    ".ranking-table thead th",
    "position: sticky",
    ".ranking-row-top",
    ".ranking-shortlist",
    ".study-next-step",
    "#full-ranking",
  ]) {
    assert.ok(css.includes(needle), `missing CSS for ${needle}`);
  }
});

test("flagship articles keep one in-body jump to the ranking anchor", () => {
  const protein = read(
    "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
  );
  const fiber = read(
    "src/data/articles/fiber-per-dollar-cheapest-high-fiber-foods.md",
  );
  const sourdough = read(
    "src/data/articles/easy-sourdough-discard-recipes-beginners.md",
  );

  for (const [name, source] of [
    ["protein", protein],
    ["fiber", fiber],
  ]) {
    const jumps = source.match(/\]\(#full-ranking\)/g) ?? [];
    assert.equal(jumps.length, 1, `${name} should have one in-body #full-ranking link`);
    assert.doesNotMatch(source, /protein-per-dollar-cheapest-high-protein-foods/);
  }

  assert.doesNotMatch(sourdough, /#full-ranking/);
  assert.doesNotMatch(sourdough, /study-pull-quote/);
});

test("rehype ranking plugin adds a live #full-ranking target and top-N rows", () => {
  const tree = rankingFixture([
    "Pinto beans (dry)",
    "Whole wheat flour",
    "Black beans (dry)",
    "Brown lentils (dry)",
    "Navy beans (dry)",
    "Green split peas (dry)",
  ]);

  applyRankingTables(tree, {
    path: "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
  });

  const section = findById(tree, FLAGSHIP_RANKING_ANCHOR);
  assert.ok(section, "missing #full-ranking section");
  assert.equal(section.tagName, "section");

  const heading = section.children.find((node) => node.tagName === "h2");
  assert.equal(heading.properties.id, "generated-slug");

  const wrap = findByClass(section, "ranking-table-wrap");
  assert.equal(wrap.length, 1);
  const table = wrap[0].children[0];
  assert.ok((table.properties.className || []).includes("ranking-table"));

  const rows = table.children
    .find((node) => node.tagName === "tbody")
    .children.filter((node) => node.tagName === "tr");
  assert.equal(rows[0].properties.id, "rank-1");
  assert.ok(rows[0].properties.className.includes("ranking-row-top-1"));
  assert.ok(rows[4].properties.className.includes("ranking-row-top5"));
  assert.equal(rows[5].properties.className, undefined);

  const quotes = findByClass(tree, "study-pull-quote");
  assert.equal(quotes.length, 1);
  const shortlists = findByClass(tree, "ranking-shortlist");
  assert.equal(shortlists.length, 1);
  const drumstickLink = nodeHasHref(tree, "#rank-11");
  assert.equal(drumstickLink, true);
});

function nodeHasHref(node, href) {
  if (node.properties?.href === href) return true;
  return (node.children || []).some((child) => nodeHasHref(child, href));
}

test("rendered flagship pages expose the jump target when dist exists", () => {
  const rendered = [
    "dist/protein-per-dollar-cheapest-protein-sources/index.html",
    "dist/fiber-per-dollar-cheapest-high-fiber-foods/index.html",
  ];
  if (!rendered.every((path) => existsSync(join(root, path)))) {
    return;
  }

  for (const path of rendered) {
    const html = read(path);
    assert.match(html, /id="full-ranking"/);
    assert.match(html, /class="[^"]*study-pull-quote[^"]*"/);
    assert.match(html, /class="[^"]*study-ranking-jump[^"]*"/);
    assert.match(html, /href="#full-ranking"/);
    assert.match(html, /class="[^"]*ranking-table[^"]*"/);
    assert.match(html, /id="rank-1"/);
    assert.match(html, /class="[^"]*study-next-step[^"]*"/);
    assert.match(html, /href="\/food-value-database\/"/);
    assert.doesNotMatch(html, /protein-per-dollar-cheapest-high-protein-foods/);
  }
});
