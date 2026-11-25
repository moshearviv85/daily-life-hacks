import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { VFile } from "vfile";

import rehypeArticleSemantics from "../scripts/rehype-article-semantics.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DAY = "2026-11-25";
const SALT_SLUG = "big-flavor-less-salt-citrus-herbs-umami-swaps";
const BREAD_SLUG = "best-high-protein-breads-healthy-sandwiches";
const SALT_TITLE = "Big Flavor With Less Salt: Citrus, Herbs, and Umami";
const SALT_EXCERPT =
  "Use citrus, vinegar, herbs, spices, browning, and measured umami ingredients to build flavor before automatically reaching for more salt.";
const BREAD_TITLE = "High-Protein Bread for Sandwiches: 5-7g a Slice";
const BREAD_EXCERPT =
  "5 to 7 grams of protein per slice, sometimes. Most sprouted loaves are about 5 grams, so a sandwich is about 10 grams before you open the fridge.";
const SALT_HEADING =
  "## How much sodium is in everyday flavor swaps like lemon juice, vinegar, soy sauce, and Parmesan?";
const BREAD_HEADING =
  "## How much protein is in white, whole wheat, multigrain, and sprouted bread per slice?";

const SALT_ROWS = [
  ["Lemon juice, raw", "1 tbsp", "15.25 g", "0 mg", "167747"],
  ["Vinegar, cider", "1 tbsp", "14.9 g", "1 mg", "173469"],
  ["Garlic, raw", "1 clove", "3 g", "1 mg", "169230"],
  ["Oregano, dried, ground", "1 tsp", "1.8 g", "0 mg", "171328"],
  ["Parmesan, grated", "1 tbsp", "5 g", "90 mg", "171247"],
  ["Soy sauce, shoyu", "1 tbsp", "16 g", "879 mg", "174277"],
  ["Soy sauce, shoyu, low sodium", "1 tbsp", "14.2 g", "511 mg", "172473"],
];

const BREAD_ROWS = [
  ["White, commercially prepared", "29 g", "2.6 g", "8.85 g", "0.8 g", "2.7 g", "142 mg", "490 mg", "174924"],
  ["Whole-wheat, commercially prepared", "32 g", "4.0 g", "12.45 g", "1.9 g", "6.0 g", "146 mg", "455 mg", "172688"],
  ["Multi-grain, includes whole-grain", "26 g", "3.5 g", "13.36 g", "1.9 g", "7.4 g", "99 mg", "381 mg", "168013"],
  ["Oatmeal", "27 g", "2.3 g", "8.4 g", "1.1 g", "4.0 g", "121 mg", "447 mg", "172678"],
  ["Rye, regular slice", "32 g", "2.7 g", "8.5 g", "1.9 g", "5.8 g", "193 mg", "603 mg", "172684"],
  ["Wheat, sprouted", "38 g", "5.0 g", "13.16 g", "2.0 g", "5.3 g", "180 mg", "474 mg", "171850"],
];

function readArticle(slug) {
  return readFileSync(join(ROOT, "src/data/articles", `${slug}.md`), "utf8");
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "article is missing frontmatter");
  return match[1];
}

function field(markdown, name) {
  const lines = frontmatter(markdown).split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith(`${name}:`)) continue;
    const rest = line.slice(name.length + 1).trim();
    if (
      (rest.startsWith('"') && rest.endsWith('"')) ||
      (rest.startsWith("'") && rest.endsWith("'"))
    ) {
      return rest.slice(1, -1);
    }
    return rest;
  }
  return undefined;
}

function visibleWords(markdown) {
  const visible = markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return visible.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) ?? [];
}

function answerUnder(markdown, heading) {
  const at = markdown.indexOf(heading);
  assert.ok(at !== -1, `missing heading: ${heading}`);
  return markdown.slice(at + heading.length).trimStart().split(/\n\s*\n/)[0];
}

function tableAfter(markdown, heading, header) {
  const at = markdown.indexOf(heading);
  assert.ok(at !== -1, `missing heading: ${heading}`);
  const tableAt = markdown.indexOf(header, at);
  assert.ok(tableAt !== -1, `missing table under ${heading}`);
  return markdown.slice(tableAt).split(/\n\s*\n/)[0];
}

function assertCanonicalInternalLinks(markdown, slug) {
  const links = [...markdown.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
  for (const link of links) {
    assert.equal(link.includes("#"), false, `${slug} link has an anchor: ${link}`);
    assert.equal(/\.csv(?:$|\?)/i.test(link), false, `${slug} links a CSV: ${link}`);
    if (!link.startsWith("/")) continue;
    assert.ok(link.endsWith("/"), `${slug} internal link is not canonical: ${link}`);
    assert.equal(link.includes("."), false, `${slug} internal link points at a file: ${link}`);
  }
}

function fdc(id) {
  return `https://fdc.nal.usda.gov/food-details/${id}/nutrients`;
}

async function renderMarkdown(markdown, path) {
  const file = new VFile({ value: markdown, path });
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeArticleSemantics)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(file);
  return String(result);
}

test("low-sodium flavor page keeps its title and adds the 7-row USDA sodium table", () => {
  const markdown = readArticle(SALT_SLUG);
  assert.equal(field(markdown, "title"), SALT_TITLE);
  assert.equal(field(markdown, "excerpt"), SALT_EXCERPT);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), DAY);
  assert.equal(field(markdown, "substantiveUpdate"), DAY);
  assert.doesNotMatch(markdown, /FAQPage|photograph|real photo|\bphoto of\b/i);
  assert.doesNotMatch(markdown, /\u2014/);

  const answer = answerUnder(markdown, SALT_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `salt answer is ${count} words`);
  assert.match(answer, /0 milligrams/);
  assert.match(answer, /90 milligrams/);
  assert.match(answer, /879 milligrams/);
  assert.match(answer, /511/);

  const table = tableAfter(markdown, SALT_HEADING, "| Flavor swap | Measure | Weight | Sodium | USDA record |");
  const rows = table.split("\n").filter((line) => line.startsWith("|") && !line.includes("---"));
  assert.equal(rows.length, 8, "header plus 7 flavor rows");
  for (const [name, measure, weight, sodium, id] of SALT_ROWS) {
    assert.match(table, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(table, new RegExp(`\\| ${measure} \\| ${weight} \\| ${sodium} \\|`));
    assert.match(table, new RegExp(fdc(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(markdown, /15\.25 grams/);
  assert.match(markdown, /291 milligrams/);
  assertCanonicalInternalLinks(markdown, SALT_SLUG);
});

test("high-protein bread page keeps the 5 gram excerpt and shows USDA slices", () => {
  const markdown = readArticle(BREAD_SLUG);
  assert.equal(field(markdown, "title"), BREAD_TITLE);
  assert.equal(field(markdown, "excerpt"), BREAD_EXCERPT);
  assert.equal(BREAD_EXCERPT.length, 145);
  assert.match(BREAD_EXCERPT, /^5 to 7 grams of protein per slice/);
  assert.match(BREAD_EXCERPT, /about 5 grams/);
  assert.match(BREAD_EXCERPT, /about 10 grams/);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), DAY);
  assert.equal(field(markdown, "substantiveUpdate"), DAY);
  assert.doesNotMatch(markdown, /FAQPage|photograph|real photo|\bphoto of\b/i);
  assert.doesNotMatch(markdown, /\u2014/);

  const answer = answerUnder(markdown, BREAD_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `bread answer is ${count} words`);
  assert.match(answer, /2\.6 grams of protein/);
  assert.match(answer, /4\.0/);
  assert.match(answer, /3\.5/);
  assert.match(answer, /5\.0/);
  assert.match(answer, /about 10 grams/);
  assert.match(answer, /brand panel/);

  const table = tableAfter(
    markdown,
    BREAD_HEADING,
    "| Bread | Slice | Protein / slice | Protein / 100 g | Fiber / slice | Fiber / 100 g | Sodium / slice | Sodium / 100 g | USDA record |",
  );
  const rows = table.split("\n").filter((line) => line.startsWith("|") && !line.includes("---"));
  assert.equal(rows.length, BREAD_ROWS.length + 1);
  for (const [name, slice, protein, protein100, fiber, fiber100, sodium, sodium100, id] of BREAD_ROWS) {
    const line = rows.find((row) => row.includes(name));
    assert.ok(line, `missing bread row ${name}`);
    assert.match(line, new RegExp(`\\| ${slice} \\| ${protein} \\| ${protein100} \\| ${fiber} \\| ${fiber100} \\| ${sodium} \\| ${sodium100} \\|`));
    assert.match(line, new RegExp(fdc(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(markdown, /5\.0 grams/);
  assert.match(markdown, /brand panel/);
  assert.match(markdown, /172688/);
  assertCanonicalInternalLinks(markdown, BREAD_SLUG);
});

test("the new tables publish hidden captions and scoped headers", async () => {
  const salt = await renderMarkdown(readArticle(SALT_SLUG), join(ROOT, "src/data/articles", `${SALT_SLUG}.md`));
  const bread = await renderMarkdown(readArticle(BREAD_SLUG), join(ROOT, "src/data/articles", `${BREAD_SLUG}.md`));
  assert.match(
    salt,
    /<caption class="sr-only">Sodium per household measure for lemon juice, cider vinegar, garlic, oregano, Parmesan, and soy sauce<\/caption>/,
  );
  assert.match(
    bread,
    /<caption class="sr-only">Protein, fiber, and sodium in standard sandwich breads per slice and per 100 grams<\/caption>/,
  );
  assert.match(salt, /<th[^>]*>Sodium<\/th>/);
  assert.match(bread, /<th[^>]*>Protein \/ slice<\/th>/);
  assert.doesNotMatch(salt, /FAQPage/);
  assert.doesNotMatch(bread, /FAQPage/);
  assert.doesNotMatch(salt, /Table: /);
  assert.doesNotMatch(bread, /Table: /);
});

test("built flavor and bread pages publish the tables without FAQPage", () => {
  const saltPath = join(ROOT, "dist", SALT_SLUG, "index.html");
  const breadPath = join(ROOT, "dist", BREAD_SLUG, "index.html");
  if (!existsSync(saltPath) || !existsSync(breadPath)) return;

  const salt = readFileSync(saltPath, "utf8");
  const bread = readFileSync(breadPath, "utf8");
  assert.match(salt, /How much sodium is in everyday flavor swaps/);
  assert.match(salt, /879 mg/);
  assert.match(salt, /fdc\.nal\.usda\.gov\/food-details\/174277\/nutrients/);
  assert.match(bread, /How much protein is in white, whole wheat, multigrain, and sprouted bread per slice\?/);
  assert.match(bread, /fdc\.nal\.usda\.gov\/food-details\/172688\/nutrients/);
  assert.match(bread, /5\.0 g/);
  assert.doesNotMatch(salt, /FAQPage/);
  assert.doesNotMatch(bread, /FAQPage/);
  assert.match(salt, /"name":"David Miller"/);
  assert.match(bread, /"name":"David Miller"/);
  assert.match(salt, new RegExp(`"dateModified":"${DAY}T00:00:00.000Z"`));
  assert.match(bread, new RegExp(`"dateModified":"${DAY}T00:00:00.000Z"`));
});
