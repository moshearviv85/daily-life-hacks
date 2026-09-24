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
import { isIndexPruned } from "../src/content/index-prune.js";
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
    assert.ok(config.emailCapture, `${slug} is missing study-specific email capture copy`);
    assert.match(config.emailCapture.title, /ranking updates/i);
    assert.match(config.emailCapture.text, /October 2026/);
    assert.match(config.emailCapture.text, /BLS/);
    assert.match(config.emailCapture.text, /Same newsletter as the footer form/);
    assert.doesNotMatch(config.emailCapture.title, /subscribe/i);
    assert.doesNotMatch(config.emailCapture.text, /limited time|only \d+ spots|act now|last chance/i);
    assert.equal(config.emailCapture.buttonLabel, "Email me ranking updates");
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
  assert.match(protein.emailCapture.text, /whole wheat flour/i);
  assert.match(protein.emailCapture.text, /drumsticks/i);
  assert.equal(protein.emailCapture.emailSegment, "pillar-protein");
  assert.match(fiber.emailCapture.text, /split peas/i);
  assert.match(fiber.emailCapture.text, /whole wheat flour/i);
  assert.equal(fiber.emailCapture.emailSegment, "pillar-fiber");
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

test("protein flagship FAQ quotes the ranking table grams per dollar", () => {
  const markdown = read(
    "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
  );
  const faq = markdown.match(/^faq:\n([\s\S]*?)\n---\n/m)?.[1] ?? "";
  assert.ok(faq.includes("question:"), "protein flagship is missing FAQ frontmatter");
  const rows = parseCsv(read("public/data/protein-per-dollar-2026.csv"));
  const grams = new Map(rows.map((row) => [row.food, row.protein_g_per_dollar]));
  const quoted = [
    "Whole wheat flour",
    "Brown lentils (dry)",
    "Red lentils (dry)",
    "Peanut butter",
    "Chicken drumsticks (bone-in)",
    "Eggs (large)",
    "Mozzarella (low-moisture part-skim)",
    "Whole milk",
    "Chicken thighs (boneless, skinless)",
    "Rotisserie chicken (whole, cooked)",
    "Chicken breast (boneless, skinless)",
    "Tofu (extra firm)",
    "Ground beef (80/20)",
    "Bacon",
  ];

  for (const food of quoted) {
    const value = grams.get(food);
    assert.ok(value, `missing CSV row for ${food}`);
    assert.match(
      faq,
      new RegExp(value.replace(".", "\\.")),
      `FAQ should quote ${food} at ${value} g per dollar`,
    );
  }

  assert.match(faq, /10\.0 grams of protein per 100 grams/);
  assert.match(faq, /22\.5 grams raw/);
  assert.doesNotMatch(faq, /lands at 51(?!\.)/);
  assert.doesNotMatch(faq, /whole milk at 29(?!\.)/);
  assert.doesNotMatch(faq, /mozzarella at 30(?!\.)/);
  assert.doesNotMatch(faq, /thighs at 28(?!\.)/);
  assert.match(read("src/pages/[slug].astro"), /"@type": "FAQPage"/);
  assert.match(
    read("src/pages/[slug].astro"),
    /acceptedAnswer:\s*\{\s*"@type": "Answer",\s*text: item\.answer/,
  );
});

test("beans double-win FAQ quotes the combined CSV and stays indexable", () => {
  const markdown = read("src/data/articles/beans-double-win-fiber-protein.md");
  const faq = markdown.match(/^faq:\n([\s\S]*?)\n---\n/m)?.[1] ?? "";
  assert.ok(faq.includes("question:"), "beans double-win is missing FAQ frontmatter");
  assert.equal(isIndexPruned("beans-double-win-fiber-protein"), false);

  const rows = parseCsv(read("public/data/beans-double-win-fiber-protein-2026.csv"));
  const leader = rows[0];
  const pinto = rows.find((row) => row.food === "Pinto beans (dry)");
  assert.equal(leader.food, "Green split peas (dry)");
  assert.equal(leader.value, "144.9");
  assert.equal(pinto.protein_g_per_dollar, "57.6");
  assert.equal(pinto.fiber_g_per_dollar, "41.7");
  assert.equal(pinto.value, "99.3");

  for (const value of [
    leader.value,
    leader.protein_g_per_dollar,
    leader.fiber_g_per_dollar,
    pinto.protein_g_per_dollar,
    pinto.fiber_g_per_dollar,
    pinto.value,
  ]) {
    assert.match(
      faq,
      new RegExp(value.replace(".", "\\.")),
      `FAQ should quote ${value} from the double-win CSV`,
    );
  }

  assert.doesNotMatch(faq, /97\.9/);
  assert.doesNotMatch(faq, /70\.8/);
  assert.doesNotMatch(faq, /168\.7/);
  assert.doesNotMatch(markdown, /97\.9|70\.8|168\.7|\$3\.97/);
  assert.match(read("src/pages/[slug].astro"), /"@type": "FAQPage"/);
  assert.match(
    read("src/pages/[slug].astro"),
    /publishedSchemas = released && !isVariant && !indexPruned \? allSchemas/,
  );
});

test("fiber flagship FAQ quotes the ranking table grams per dollar", () => {
  const markdown = read(
    "src/data/articles/fiber-per-dollar-cheapest-high-fiber-foods.md",
  );
  const faq = markdown.match(/^faq:\n([\s\S]*?)\n---\n/m)?.[1] ?? "";
  assert.ok(faq.includes("question:"), "fiber flagship is missing FAQ frontmatter");
  const header = "| Rank | Food | Fiber (g per 100g) | Price per 100g | Fiber per $1 |";
  const start = markdown.indexOf(header);
  assert.notEqual(start, -1, "fiber flagship is missing its ranking table");
  const tableGrams = new Map();
  for (const line of markdown.slice(start).split(/\r?\n/).slice(2)) {
    if (!line.startsWith("|")) break;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    tableGrams.set(cells[1], cells[4].replace(/ g$/, ""));
  }

  const quoted = [
    "Whole wheat flour",
    "Green split peas (dry)",
    "Pearled barley (dry)",
    "Popcorn kernels",
    "Pinto beans (dry)",
    "Canned black beans",
    "Bananas",
    "Blueberries",
  ];
  for (const food of quoted) {
    const grams = tableGrams.get(food);
    assert.ok(grams, `missing table row for ${food}`);
    assert.match(
      faq,
      new RegExp(grams.replace(".", "\\.")),
      `FAQ should quote ${food} at ${grams} g per dollar`,
    );
  }

  const rows = parseCsv(read("public/data/fiber-per-dollar-2026.csv"));
  const csvGrams = new Map(rows.map((row) => [row.food, row.fiber_g_per_dollar]));
  for (const food of quoted) {
    assert.equal(
      tableGrams.get(food),
      csvGrams.get(food),
      `${food} table grams drifted from fiber-per-dollar-2026.csv`,
    );
  }

  assert.doesNotMatch(faq, /roughly 78/);
  assert.doesNotMatch(faq, /about 71 grams/);
  assert.doesNotMatch(faq, /just under 12/);
  assert.doesNotMatch(faq, /97\.9/);
  assert.doesNotMatch(faq, /70\.8/);
});

test("high-protein budget guide FAQ quotes its on-page protein table grams", () => {
  const markdown = read("src/data/articles/high-protein-on-a-budget-complete-guide.md");
  const faq = markdown.match(/^faq:\n([\s\S]*?)\n---\n/m)?.[1] ?? "";
  assert.ok(faq.includes("question:"), "high-protein guide is missing FAQ frontmatter");
  const header = "| Food | Protein per $1 |";
  const start = markdown.indexOf(header);
  assert.notEqual(start, -1, "high-protein guide is missing its protein table");
  const tableGrams = new Map();
  for (const line of markdown.slice(start).split(/\r?\n/).slice(2)) {
    if (!line.startsWith("|")) break;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    const grams = cells[1].replace(/ g$/, "");
    tableGrams.set(cells[0], grams);
  }

  const quoted = [
    "Pinto beans (dry)",
    "Chicken drumsticks (bone-in)",
    "Eggs (large)",
    "Chicken breast (boneless, skinless)",
    "Canned tuna (chunk light)",
    "Ground beef (80/20)",
  ];
  for (const food of quoted) {
    const grams = tableGrams.get(food);
    assert.ok(grams, `missing table row for ${food}`);
    assert.match(
      faq,
      new RegExp(grams.replace(".", "\\.")),
      `FAQ should quote ${food} at ${grams} g per dollar`,
    );
  }

  const rows = parseCsv(read("public/data/protein-per-dollar-2026.csv"));
  const csvGrams = new Map(rows.map((row) => [row.food, row.protein_g_per_dollar]));
  const legumes = rows.filter((row) => row.category === "Dried beans & lentils");
  const legumeValues = legumes.map((row) => Number(row.protein_g_per_dollar));
  const legumeMin = Math.min(...legumeValues).toFixed(1);
  const legumeMax = Math.max(...legumeValues).toFixed(1);
  const legumeRange = `between ${legumeMin} and ${legumeMax} grams of protein per dollar`;
  assert.match(markdown, new RegExp(legumeRange.replaceAll(".", "\\.")));
  assert.match(faq, new RegExp(legumeRange.replaceAll(".", "\\.")));
  assert.doesNotMatch(faq, /between 56 and 98/);
  assert.doesNotMatch(faq, /97\.9/);
  assert.doesNotMatch(faq, /about 98/);
  assert.doesNotMatch(faq, /about 34 grams/);
  assert.doesNotMatch(faq, /about 50 grams/);
  assert.doesNotMatch(faq, /about 22\.4/);

  const csvName = {
    "Rotisserie chicken": "Rotisserie chicken (whole, cooked)",
    "Canned tuna (chunk light)": "Canned tuna (chunk light, in water)",
  };
  const tableValues = [];
  for (const [tableFood, grams] of tableGrams) {
    const sourceFood = csvName[tableFood] ?? tableFood;
    const csvValue = csvGrams.get(sourceFood);
    assert.ok(csvValue, `no CSV row for table food ${tableFood}`);
    assert.equal(
      grams,
      csvValue,
      `${tableFood} table grams drifted from protein-per-dollar-2026.csv`,
    );
    tableValues.push(Number(csvValue));
  }
  for (let index = 1; index < tableValues.length; index += 1) {
    assert.ok(
      tableValues[index] <= tableValues[index - 1],
      "high-protein guide table should stay in descending CSV order",
    );
  }

  const pinto = csvGrams.get("Pinto beans (dry)");
  const bacon = csvGrams.get("Bacon");
  const breast = csvGrams.get("Chicken breast (boneless, skinless)");
  const beef = csvGrams.get("Ground beef (80/20)");
  assert.match(markdown, new RegExp(`Pinto ${pinto}g vs Bacon ${bacon}g`));
  assert.match(faq, new RegExp(`dried pinto beans landed at ${pinto}`));
  assert.match(faq, new RegExp(`chicken breast delivered ${breast}`));
  assert.match(faq, new RegExp(`ground beef ${beef}`));
  assert.match(
    markdown,
    new RegExp(
      `\\| Pinto beans \\(dry\\), 4 lb bag \\| \\$${Number(
        rows.find((row) => row.food === "Pinto beans (dry)").package_price_usd,
      ).toFixed(2)} \\|`,
    ),
  );
});

test("reusable pull-quote and jump components stay honest buttons and anchors", () => {
  const pullQuote = read("src/components/StudyPullQuote.astro");
  const lead = read("src/components/StudyLead.astro");
  const nextStep = read("src/components/StudyNextStep.astro");
  const emailCapture = read("src/components/StudyEmailCapture.astro");
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

  assert.match(emailCapture, /class="study-email-capture"/);
  assert.match(emailCapture, /fetch\("\/api\/subscribe"/);
  assert.match(emailCapture, /source: "inline"/);
  assert.match(emailCapture, /href="\/privacy\/"/);
  assert.doesNotMatch(emailCapture, /kit\.com|convertkit|beehiiv/i);

  assert.match(slugPage, /getFlagshipEngagement/);
  assert.match(slugPage, /<StudyLead/);
  assert.match(slugPage, /<StudyEmailCapture/);
  assert.match(slugPage, /flagship\?\.emailCapture/);
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
    ".study-email-capture",
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
    assert.match(html, /class="[^"]*study-email-capture[^"]*"/);
    assert.match(html, /id="study-email-form"/);
    assert.match(html, /href="\/food-value-database\/"/);
    assert.doesNotMatch(html, /protein-per-dollar-cheapest-high-protein-foods/);
  }
});

test("inline study signup is limited to the two flagship slugs", () => {
  const slugPage = read("src/pages/[slug].astro");
  const sourdough = read(
    "src/data/articles/easy-sourdough-discard-recipes-beginners.md",
  );
  const protein = read(
    "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
  );
  const fiber = read(
    "src/data/articles/fiber-per-dollar-cheapest-high-fiber-foods.md",
  );

  assert.match(slugPage, /flagship\?\.emailCapture/);
  assert.doesNotMatch(sourdough, /study-email-capture|Email me ranking updates/);
  assert.doesNotMatch(protein, /study-email-capture/);
  assert.doesNotMatch(fiber, /study-email-capture/);
  assert.match(protein, /Protein per \$: Whole Wheat Flour 96\.0g vs Lentils 77\.7g/);
  assert.match(fiber, /Fiber per Dollar: Whole Wheat Flour 77\.8g, Split Peas 71\.0g/);
});
