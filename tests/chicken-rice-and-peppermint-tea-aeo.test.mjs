import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chicken = readFileSync(
  join(root, "src/data/articles/easy-one-pot-chicken-and-rice-dinner.md"),
  "utf8",
);
const tea = readFileSync(
  join(root, "src/data/articles/gut-health-tea-peppermint-ginger.md"),
  "utf8",
);
const cache = JSON.parse(readFileSync(join(root, "src/data/fdc-cache.json"), "utf8")).foods;
const UPDATED = "2026-11-26";

const CHICKEN_QUESTION =
  "What rice-to-liquid ratio and safe temperature keep one-pot chicken and rice tender?";
const TEA_QUESTION =
  "How do fresh and bagged peppermint-ginger teas compare to clinical IBS and nausea doses?";

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing frontmatter");
  return match[1];
}

function field(markdown, name) {
  const match = frontmatter(markdown).match(
    new RegExp(`^${name}:\\s*"?([^"\\n]+?)"?\\s*$`, "m"),
  );
  return match ? match[1] : null;
}

function body(markdown) {
  return markdown.split(/\n---\n/).slice(1).join("\n---\n");
}

function answerParagraph(markdown, heading) {
  const marker = `## ${heading}\n\n`;
  const start = markdown.indexOf(marker);
  assert.notEqual(start, -1, `missing heading: ${heading}`);
  const paragraph = markdown.slice(start + marker.length).split(/\n\s*\n/)[0];
  assert.ok(paragraph, `missing direct answer under ${heading}`);
  return paragraph;
}

function visibleWords(paragraph) {
  const visible = paragraph.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return visible.match(/[\p{L}\p{N}]+(?:[.'’][\p{L}\p{N}]+)*/gu) ?? [];
}

function tableRows(markdown, header) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.indexOf(header);
  assert.notEqual(headerIndex, -1, `missing table header: ${header}`);
  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
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

function articleLinks(markdown) {
  return [...body(markdown).matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map((match) => ({
    anchor: match[1],
    href: match[2],
  }));
}

test("one-pot chicken and rice keeps its card and adds the FSIS ratio table", () => {
  assert.equal(field(chicken, "title"), "Easy One-Pot Chicken and Rice Dinner");
  assert.equal(
    field(chicken, "excerpt"),
    "One-pot chicken and rice in 45 minutes: browned thighs, long-grain rice, and an 18-20 minute covered simmer. Four bowls at about 383 calories each.",
  );
  assert.equal(field(chicken, "author"), "David Miller");
  assert.equal(field(chicken, "dateModified"), UPDATED);
  assert.equal(field(chicken, "substantiveUpdate"), UPDATED);
  assert.match(chicken, /fdcId: 173627/);
  assert.match(chicken, /fdcId: 168877/);
  assert.equal(chicken.includes("FAQPage"), false);
  assert.equal(chicken.includes("\u2014"), false);
  assert.match(chicken, /\{#how-to-tell-when-the-chicken-and-rice-are-done\}/);
  assert.doesNotMatch(body(chicken), /\]\([^)]+\.csv/);
  assert.doesNotMatch(body(chicken), /\]\([^)]*#/);

  const answer = answerParagraph(chicken, CHICKEN_QUESTION);
  const words = visibleWords(answer);
  assert.ok(
    words.length >= 40 && words.length <= 60,
    `chicken answer should be 40-60 visible words, got ${words.length}: ${words.join(" ")}`,
  );
  assert.match(answer, /USDA FSIS/);
  assert.match(answer, /165°F/);
  assert.match(answer, /FDC 173627/);
  assert.match(answer, /FDC 168877/);
  assert.match(answer, /FDC 169703/);
  assert.match(answer, /FDC 170016/);
  assert.match(answer, /FDC 170393/);

  const rows = tableRows(chicken, "| Rice | Liquid per 1 cup | Covered simmer | 165°F probe |");
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((row) => row[0]), [
    "Long-grain white",
    "Jasmine or basmati",
    "Parboiled",
    "Brown, long grain",
  ]);
  assert.match(rows[0][1], /2 cups/);
  assert.match(rows[0][2], /18 to 20 minutes/);
  assert.match(rows[1][1], /2 cups/);
  assert.match(rows[1][2], /15 to 18 minutes/);
  assert.match(rows[2][1], /2 1\/4 cups/);
  assert.match(rows[2][2], /20 minutes/);
  assert.match(rows[3][1], /2 1\/4 cups/);
  assert.match(rows[3][2], /40 to 45 minutes/);
  for (const row of rows) assert.match(row[3], /probe|Thickest/i);
  assert.match(body(chicken), /https:\/\/www\.fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/safe-temperature-chart/);
  assert.match(body(chicken), /https:\/\/www\.usarice\.com\/thinkrice\/how-to\/how-to-cook-rice/);
  assert.equal(cache["173627"].description.includes("thigh"), true);
  assert.equal(cache["168877"].description.includes("long-grain"), true);
  assert.equal(cache["169703"].description.includes("brown"), true);
});

test("peppermint ginger tea compares home cups with NCCIH doses", () => {
  assert.equal(field(tea, "title"), "Peppermint and Ginger Tea in 10 Minutes");
  assert.equal(
    field(tea, "excerpt"),
    "Peppermint and ginger tea: 3 ginger coins, 1 tsp mint, 12 oz hot water, covered 5-10 minutes. Caffeine-free, about 10-20 cents a cup. Gut claims stay unproven.",
  );
  assert.equal(field(tea, "author"), "David Miller");
  assert.equal(field(tea, "dateModified"), UPDATED);
  assert.equal(field(tea, "substantiveUpdate"), UPDATED);
  assert.equal(tea.includes("FAQPage"), false);
  assert.equal(tea.includes("\u2014"), false);
  assert.doesNotMatch(body(tea), /\]\([^)]+\.csv/);
  assert.doesNotMatch(body(tea), /\]\([^)]*#/);

  const answer = answerParagraph(tea, TEA_QUESTION);
  const words = visibleWords(answer);
  assert.ok(
    words.length >= 40 && words.length <= 60,
    `tea answer should be 40-60 visible words, got ${words.length}: ${words.join(" ")}`,
  );
  assert.match(answer, /NIH NCCIH/);
  assert.match(answer, /https:\/\/www\.nccih\.nih\.gov\/health\/peppermint-oil/);
  assert.match(answer, /https:\/\/www\.nccih\.nih\.gov\/health\/ginger/);
  assert.match(answer, /70 kcal/);
  assert.match(answer, /8 g fiber/);
  assert.match(answer, /19 kcal/);
  assert.match(answer, /24 g/);
  assert.match(answer, /FDC 173474/);
  assert.match(answer, /FDC 169231/);

  const peppermint = cache["173474"];
  const ginger = cache["169231"];
  assert.equal(peppermint.nutrientsPer100g.kcal, 70);
  assert.equal(peppermint.nutrientsPer100g.fiber, 8);
  const quarterCup = ginger.portions.find((portion) => portion.grams === 24);
  assert.ok(quarterCup, "FDC 169231 should publish the 24 g quarter-cup");
  assert.equal(Math.round((ginger.nutrientsPer100g.kcal * 24) / 100), 19);

  const rows = tableRows(
    tea,
    "| Prep | Steep or simmer | Trial form vs this cup | Reflux caution |",
  );
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((row) => row[0]), [
    "Fresh peppermint leaves",
    "Bagged peppermint tea",
    "Fresh sliced ginger root",
    "Dried ground ginger",
  ]);
  for (const row of rows) {
    assert.ok(row[1].length > 0, row[0]);
    assert.ok(row[2].length > 0, row[0]);
    assert.match(row[3], /heartburn|mint/i);
  }
});

test("contextual sources link the two pages without moving their dates", () => {
  const sources = [
    [
      "src/data/articles/high-fiber-stir-fry-vegetables.md",
      "/easy-one-pot-chicken-and-rice-dinner/",
      "skillet chicken and rice dinner",
      "2026-09-23",
      null,
    ],
    [
      "src/data/articles/healthy-homemade-dumpling-wrapper-recipe.md",
      "/easy-one-pot-chicken-and-rice-dinner/",
      "one-pot chicken and rice",
      "2026-11-23",
      "2026-11-23",
    ],
    [
      "src/data/articles/high-fiber-smoothies-for-kids-picky-eaters.md",
      "/gut-health-tea-peppermint-ginger/",
      "plain peppermint ginger tea",
      "2026-11-25",
      "2026-11-25",
    ],
    [
      "src/data/articles/how-long-does-sourdough-discard-last.md",
      "/gut-health-tea-peppermint-ginger/",
      "10-minute peppermint ginger brew",
      "2026-11-23",
      null,
    ],
  ];
  for (const [path, href, anchor, modified, substantive] of sources) {
    const markdown = readFileSync(join(root, path), "utf8");
    assert.equal(field(markdown, "dateModified"), modified, path);
    assert.equal(field(markdown, "substantiveUpdate"), substantive, path);
    assert.equal(field(markdown, "author"), "David Miller", path);
    const links = articleLinks(markdown).filter((link) => link.href === href);
    assert.equal(links.length, 1, `${path} should link ${href} once`);
    assert.equal(links[0].anchor, anchor, path);
    assert.equal(links[0].href.includes("#"), false, path);
    assert.equal(links[0].href.endsWith(".csv"), false, path);
  }
});
