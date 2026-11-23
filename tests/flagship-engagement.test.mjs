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
    assert.match(
      config.nextStep.primary.href,
      /^\/(?:what-30-grams-of-fiber-costs-per-day|protein-per-dollar-adjusted-for-quality)\/$/,
    );
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
  const redirects = read("public/_redirects");
  for (const [slug, target] of [
    ["protein-per-dollar-cheapest-protein-sources", "/protein-per-dollar-adjusted-for-quality/"],
    ["fiber-per-dollar-cheapest-high-fiber-foods", "/what-30-grams-of-fiber-costs-per-day/"],
  ]) {
    assert.equal(existsSync(join(root, "src/data/articles", `${slug}.md`)), false, slug);
    assert.match(redirects, new RegExp(`^/${slug} ${target} 301$`, "m"));
    assert.match(redirects, new RegExp(`^/${slug}/ ${target} 301$`, "m"));
  }

  const proteinRows = parseCsv(read("public/data/protein-per-dollar-2026.csv"));
  const proteinByFood = new Map(proteinRows.map((row) => [row.food, row]));
  const protein = read("src/data/articles/protein-per-dollar-adjusted-for-quality.md");
  assert.equal(
    protein.includes("| Rank | Food | Protein (g per 100g) | Price per 100g | Protein per $1 |"),
    false,
    "the 49-row protein ranking was not moved onto the quality article",
  );
  const proteinHeader = "| Category | Best value | Protein per $1 |";
  const proteinStart = protein.indexOf(proteinHeader);
  assert.notEqual(proteinStart, -1, "quality article is missing the raw-ranking short table");
  const proteinLines = [];
  for (const line of protein.slice(proteinStart).split(/\r?\n/).slice(2)) {
    if (!line.startsWith("|")) break;
    proteinLines.push(line);
  }
  assert.equal(proteinLines.length, 4);
  for (const line of proteinLines) {
    const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
    const row = proteinByFood.get(cells[1]);
    assert.ok(row, `raw-ranking food missing from CSV: ${cells[1]}`);
    assert.equal(cells[2], `${row.protein_g_per_dollar} g`, cells[1]);
  }

  const fiberRows = parseCsv(read("public/data/fiber-per-dollar-2026.csv"));
  const fiberByFood = new Map(fiberRows.map((row) => [row.food, row]));
  const fiberAliases = new Map([["Rolled oats", "Old-fashioned rolled oats"]]);
  const fiber = read("src/data/articles/what-30-grams-of-fiber-costs-per-day.md");
  assert.equal(
    fiber.includes("| Rank | Food | Fiber (g per 100g) | Price per 100g | Fiber per $1 |"),
    false,
    "the 53-row fiber ranking was not moved onto the fiber-day article",
  );
  const fiberHeader = "| Food | Fiber per $1 |";
  const fiberStart = fiber.indexOf(fiberHeader);
  assert.notEqual(fiberStart, -1, "fiber-day article is missing the cheapest-fiber short table");
  const fiberLines = [];
  for (const line of fiber.slice(fiberStart).split(/\r?\n/).slice(2)) {
    if (!line.startsWith("|")) break;
    fiberLines.push(line);
  }
  assert.equal(fiberLines.length, 8);
  for (const line of fiberLines) {
    const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
    const food = fiberAliases.get(cells[0]) ?? cells[0];
    const row = fiberByFood.get(food);
    assert.ok(row, `cheapest-fiber food missing from CSV: ${cells[0]}`);
    assert.equal(cells[1], `${row.fiber_g_per_dollar} g`, cells[0]);
  }
});

test("protein flagship FAQ quotes the ranking table grams per dollar", () => {
  const redirects = read("public/_redirects");
  assert.equal(
    existsSync(join(root, "src/data/articles/protein-per-dollar-cheapest-protein-sources.md")),
    false,
  );
  assert.match(
    redirects,
    /^\/protein-per-dollar-cheapest-protein-sources \/protein-per-dollar-adjusted-for-quality\/ 301$/m,
  );
  assert.match(
    redirects,
    /^\/protein-per-dollar-cheapest-protein-sources\/ \/protein-per-dollar-adjusted-for-quality\/ 301$/m,
  );
  const markdown = read("src/data/articles/protein-per-dollar-adjusted-for-quality.md");
  const faq = markdown.match(/^faq:\n([\s\S]*?)\n---\n/m)?.[1] ?? "";
  assert.ok(faq.includes("question:"), "quality article is missing FAQ frontmatter");
  assert.match(faq, /50\.3/);
  assert.match(faq, /49\.0/);
  assert.match(faq, /57\.6/);
  assert.match(faq, /34\.0/);
  assert.doesNotMatch(markdown, /id="full-ranking"/);
  assert.doesNotMatch(read("src/pages/[slug].astro"), /"@type": "FAQPage"/);
  assert.match(read("src/pages/[slug].astro"), /Frequently Asked Questions/);
  assert.match(read("src/pages/[slug].astro"), /article\.data\.faq\.map/);
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
  assert.doesNotMatch(read("src/pages/[slug].astro"), /"@type": "FAQPage"/);
  assert.match(read("src/pages/[slug].astro"), /Frequently Asked Questions/);
  assert.match(
    read("src/pages/[slug].astro"),
    /publishedSchemas = released && !isVariant && !indexPruned \? allSchemas/,
  );
});

test("fiber flagship FAQ quotes the ranking table grams per dollar", () => {
  const redirects = read("public/_redirects");
  assert.equal(
    existsSync(join(root, "src/data/articles/fiber-per-dollar-cheapest-high-fiber-foods.md")),
    false,
  );
  assert.match(
    redirects,
    /^\/fiber-per-dollar-cheapest-high-fiber-foods \/what-30-grams-of-fiber-costs-per-day\/ 301$/m,
  );
  const markdown = read("src/data/articles/what-30-grams-of-fiber-costs-per-day.md");
  const faq = markdown.match(/^faq:\n([\s\S]*?)\n---\n/m)?.[1] ?? "";
  assert.ok(faq.includes("question:"), "fiber-day article is missing FAQ frontmatter");
  assert.match(markdown, /Popcorn stays unresolved/);
  assert.match(markdown, /51\.3 grams per dollar/);
  assert.doesNotMatch(faq, /77\.8/);
  assert.doesNotMatch(faq, /roughly 78/);
  assert.doesNotMatch(faq, /about 71 grams/);
  assert.doesNotMatch(faq, /97\.9/);
  assert.doesNotMatch(faq, /70\.8/);
  assert.doesNotMatch(markdown, /id="full-ranking"/);
});


test("high-protein budget guide FAQ quotes its on-page protein table grams", () => {
  const redirects = read("public/_redirects");
  assert.equal(
    existsSync(join(root, "src/data/articles/high-protein-on-a-budget-complete-guide.md")),
    false,
  );
  assert.match(
    redirects,
    /^\/high-protein-on-a-budget-complete-guide \/protein-per-dollar-adjusted-for-quality\/ 301$/m,
  );
  assert.match(
    redirects,
    /^\/high-protein-on-a-budget-complete-guide\/ \/protein-per-dollar-adjusted-for-quality\/ 301$/m,
  );
  const markdown = read("src/data/articles/protein-per-dollar-adjusted-for-quality.md");
  const rows = parseCsv(read("public/data/protein-per-dollar-2026.csv"));
  const byFood = new Map(rows.map((row) => [row.food, row]));
  const cart = [
    ["Chicken drumsticks (bone-in)", 1],
    ["Pinto beans (dry)", 1],
    ["Eggs (large)", 2],
    ["Brown lentils (dry)", 1],
    ["Canned tuna (chunk light, in water)", 2],
    ["Cottage cheese (4%)", 1],
  ];
  let total = 0;
  for (const [food, count] of cart) {
    const price = Number(byFood.get(food).package_price_usd) * count;
    total += price;
    assert.match(markdown, new RegExp(`\\$${price.toFixed(2)}`), food);
  }
  assert.match(markdown, new RegExp(`\\*\\*\\$${total.toFixed(2)}\\*\\*`));
  assert.match(markdown, /id="weekly-protein-cart"/);
  assert.doesNotMatch(markdown, /\$20 backbone/);
  assert.equal(Object.hasOwn(FLAGSHIP_ENGAGEMENT, "high-protein-on-a-budget-complete-guide"), false);
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
  const protein = read("src/data/articles/protein-per-dollar-adjusted-for-quality.md");
  const fiber = read("src/data/articles/what-30-grams-of-fiber-costs-per-day.md");
  const sourdough = read("src/data/articles/easy-sourdough-discard-recipes-beginners.md");

  assert.equal((protein.match(/\]\(#weekly-protein-cart\)/g) ?? []).length, 1);
  assert.equal((fiber.match(/\]\(#dollar-fiber-day\)/g) ?? []).length, 1);
  assert.doesNotMatch(protein, /#full-ranking/);
  assert.doesNotMatch(fiber, /#full-ranking/);
  assert.doesNotMatch(protein, /protein-per-dollar-cheapest-high-protein-foods/);
  assert.doesNotMatch(fiber, /protein-per-dollar-cheapest-high-protein-foods/);
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
  assert.equal(
    existsSync(join(root, "dist/protein-per-dollar-cheapest-protein-sources/index.html")),
    false,
  );
  assert.equal(
    existsSync(join(root, "dist/fiber-per-dollar-cheapest-high-fiber-foods/index.html")),
    false,
  );
  const rendered = [
    ["dist/protein-per-dollar-adjusted-for-quality/index.html", /id="raw-ranking"/, /id="weekly-protein-cart"/],
    ["dist/what-30-grams-of-fiber-costs-per-day/index.html", /id="cheapest-fiber"/, /id="dollar-fiber-day"/],
  ];
  if (!rendered.every(([path]) => existsSync(join(root, path)))) {
    return;
  }
  for (const [path, ...needles] of rendered) {
    const html = read(path);
    for (const needle of needles) assert.match(html, needle, path);
    assert.doesNotMatch(html, /id="full-ranking"/);
    assert.doesNotMatch(html, /protein-per-dollar-cheapest-high-protein-foods/);
  }
});


test("inline study signup is limited to the two flagship slugs", () => {
  const slugPage = read("src/pages/[slug].astro");
  const sourdough = read("src/data/articles/easy-sourdough-discard-recipes-beginners.md");
  const redirects = read("public/_redirects");

  assert.match(slugPage, /flagship\?\.emailCapture/);
  assert.equal(
    FLAGSHIP_ENGAGEMENT["protein-per-dollar-cheapest-protein-sources"].emailCapture.emailSegment,
    "pillar-protein",
  );
  assert.equal(
    FLAGSHIP_ENGAGEMENT["fiber-per-dollar-cheapest-high-fiber-foods"].emailCapture.emailSegment,
    "pillar-fiber",
  );
  assert.equal(FLAGSHIP_ENGAGEMENT["protein-per-dollar-adjusted-for-quality"], undefined);
  assert.equal(FLAGSHIP_ENGAGEMENT["what-30-grams-of-fiber-costs-per-day"], undefined);
  assert.doesNotMatch(sourdough, /study-email-capture|Email me ranking updates/);
  assert.match(
    redirects,
    /^\/protein-per-dollar-cheapest-protein-sources\/ \/protein-per-dollar-adjusted-for-quality\/ 301$/m,
  );
  assert.match(
    redirects,
    /^\/fiber-per-dollar-cheapest-high-fiber-foods\/ \/what-30-grams-of-fiber-costs-per-day\/ 301$/m,
  );
});
