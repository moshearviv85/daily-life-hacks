import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
const DAY = "2026-11-26";
const THRIFTY = "usda-thrifty-food-plan-weekly-cost";
const GROCERY = "how-to-make-grocery-shopping-cheaper";
const THRIFTY_TITLE = "USDA Thrifty Plan: Family of 4 ≈ $235/week";
const THRIFTY_EXCERPT =
  "USDA says its reference family of four can eat at home for $235 a week. Here's what that grocery budget buys, assumes, and quietly leaves out.";
const GROCERY_TITLE = "Ways to Make Grocery Shopping Cheaper";
const GROCERY_EXCERPT =
  "Checkout totals climbing again? Here's how to make grocery shopping cheaper without coupon books, four-store scavenger hunts, or a personality transplant.";
const THRIFTY_HEADING =
  "## How do USDA FNS Thrifty Food Plan staples compare to 2026 BLS average grocery prices?";
const GROCERY_HEADING =
  "## Which grocery-aisle swaps save the most money per gram of protein and fiber?";

const THRIFTY_ROWS = [
  ["Dry pinto beans", "$6.75 / 4 lb, July 2026", "21.42 g", "57.6", "15.5 g", "41.7", "175199"],
  ["Rolled oats", "$3.36 / 42 oz, July 2026", "13.15 g", "46.6", "10.1 g", "35.8", "173904"],
  ["Large Grade A eggs", "$2.32 / doz, Oct 2026", "12.56 g", "32.48", "0 g", "0", "171287"],
  ["Whole milk", "$4.10 / gal, Oct 2026", "3.15 g", "29.99", "0 g", "0", "171265"],
  ["Boneless chicken breast", "$4.10 / lb, Oct 2026", "22.5 g", "24.90", "0 g", "0", "171077"],
  ["Ground beef, 80/20", "$6.76 / lb, Oct 2026", "17.17 g", "11.53", "0 g", "0", "174036"],
];

const GROCERY_ROWS = [
  ["Brown lentils, dry", "77.7", "172420", "Ground beef, 80/20", "11.3", "174036", "Protein"],
  ["Bone-in drumsticks", "50.3", "172373", "Boneless chicken breast", "24.6", "171077", "Protein"],
  ["Pearled barley, dry", "57.1", "170284", "Quinoa, dry", "10.6", "168874", "Fiber"],
  ["Frozen green peas", "17.6", "170016", "Fresh blueberries", "2.5", "171711", "Fiber"],
  ["Pinto beans, dry", "57.6", "175199", "Bacon", "9.4", "168277", "Protein"],
  ["Rolled oats", "35.8", "173904", "Strawberries", "2.7", "167762", "Fiber"],
];

const LINK_SOURCES = [
  ["prebiotic-foods-beyond-the-buzzwords", THRIFTY, "2026-11-23", "2026-11-23"],
  ["creamy-mushroom-barley-risotto-hands-off", THRIFTY, "2026-07-20", undefined],
  ["balanced-breakfast-that-keeps-you-full", GROCERY, undefined, undefined],
  ["sourdough-discard-crackers", GROCERY, undefined, undefined],
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
    if (!link.startsWith("/") || link.startsWith("/images/")) continue;
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

test("thrifty plan page keeps its title and adds the October staple table", () => {
  const markdown = readArticle(THRIFTY);
  assert.equal(field(markdown, "title"), THRIFTY_TITLE);
  assert.equal(field(markdown, "excerpt"), THRIFTY_EXCERPT);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), DAY);
  assert.equal(field(markdown, "substantiveUpdate"), DAY);
  assert.doesNotMatch(markdown, /FAQPage/);
  assert.doesNotMatch(markdown, /\u2014/);

  const answer = answerUnder(markdown, THRIFTY_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `thrifty answer is ${count} words`);
  assert.match(answer, /USDA FNS Thrifty Food Plan/);
  assert.match(answer, /USDA FoodData Central/);
  assert.match(answer, /\$2\.32/);
  assert.match(answer, /\$4\.10/);
  assert.match(answer, /\$6\.76/);

  const table = tableAfter(
    markdown,
    THRIFTY_HEADING,
    "| Staple | Price | Protein / 100 g | Protein g/$ | Fiber / 100 g | Fiber g/$ | USDA record |",
  );
  const rows = table.split("\n").filter((line) => line.startsWith("|") && !line.includes("---"));
  assert.equal(rows.length, THRIFTY_ROWS.length + 1);
  for (const [name, price, protein, perDollar, fiber, fiberDollar, id] of THRIFTY_ROWS) {
    const line = rows.find((row) => row.includes(name));
    assert.ok(line, `missing thrifty row ${name}`);
    assert.match(line, new RegExp(price.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(line, new RegExp(`\\| ${protein} \\| ${perDollar} \\| ${fiber} \\| ${fiberDollar} \\|`));
    assert.match(line, new RegExp(fdc(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(markdown, /bls-nutrition-per-dollar-latest/);
  assert.match(markdown, /protein-per-dollar-2026/);
  assert.match(markdown, /fiber-per-dollar-2026/);
  assert.match(markdown, /protein-day-cost-2026/);
  assert.match(markdown, /fiber-day-cost-2026/);
  assert.match(markdown, /\$2\.320/);
  assert.match(markdown, /29\.99/);
  assert.match(markdown, /24\.90/);
  assertCanonicalInternalLinks(markdown, THRIFTY);
});

test("grocery shopping page keeps its title and adds the six aisle swaps", () => {
  const markdown = readArticle(GROCERY);
  assert.equal(field(markdown, "title"), GROCERY_TITLE);
  assert.equal(field(markdown, "excerpt"), GROCERY_EXCERPT);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), DAY);
  assert.equal(field(markdown, "substantiveUpdate"), DAY);
  assert.doesNotMatch(markdown, /FAQPage/);
  assert.doesNotMatch(markdown, /\u2014/);

  const answer = answerUnder(markdown, GROCERY_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `grocery answer is ${count} words`);
  assert.match(answer, /USDA FoodData Central/);
  assert.match(answer, /77\.7/);
  assert.match(answer, /11\.3/);
  assert.match(answer, /50\.3/);
  assert.match(answer, /24\.6/);
  assert.match(answer, /57\.1/);
  assert.match(answer, /10\.6/);
  assert.match(answer, /17\.6/);
  assert.match(answer, /2\.5/);

  const table = tableAfter(
    markdown,
    GROCERY_HEADING,
    "| Aisle swap | Cheaper pick | g/$ | Record | Spendier pick | g/$ | Record | Nutrient |",
  );
  const rows = table.split("\n").filter((line) => line.startsWith("|") && !line.includes("---"));
  assert.equal(rows.length, GROCERY_ROWS.length + 1);
  for (const [cheap, cheapGrams, cheapId, pricey, priceyGrams, priceyId, nutrient] of GROCERY_ROWS) {
    const line = rows.find((row) => row.includes(cheap) && row.includes(pricey));
    assert.ok(line, `missing grocery row ${cheap}`);
    assert.match(line, new RegExp(`\\| ${cheapGrams} \\|`));
    assert.match(line, new RegExp(`\\| ${priceyGrams} \\|`));
    assert.match(line, new RegExp(`\\| ${nutrient} \\|`));
    assert.match(line, new RegExp(fdc(cheapId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(line, new RegExp(fdc(priceyId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(markdown, /protein-per-dollar-2026/);
  assert.match(markdown, /fiber-per-dollar-2026/);
  assert.match(markdown, /0\.67 edible fraction/);
  assert.match(markdown, /\]\(\/protein-per-dollar-adjusted-for-quality\/\)/);
  assertCanonicalInternalLinks(markdown, GROCERY);
});

test("the new tables publish hidden captions and no FAQPage", async () => {
  const thrifty = await renderMarkdown(readArticle(THRIFTY), join(ROOT, "src/data/articles", `${THRIFTY}.md`));
  const grocery = await renderMarkdown(readArticle(GROCERY), join(ROOT, "src/data/articles", `${GROCERY}.md`));
  assert.match(
    thrifty,
    /<caption class="sr-only">October 2026 BLS staple prices next to USDA FoodData Central protein and fiber<\/caption>/,
  );
  assert.match(
    grocery,
    /<caption class="sr-only">July 2026 aisle swaps for protein and fiber grams per dollar<\/caption>/,
  );
  assert.doesNotMatch(thrifty, /FAQPage/);
  assert.doesNotMatch(grocery, /FAQPage/);
  assert.doesNotMatch(thrifty, /Table: /);
  assert.doesNotMatch(grocery, /Table: /);
});

test("contextual inlinks do not move the source dateModified", () => {
  for (const [slug, target, dateModified, substantiveUpdate] of LINK_SOURCES) {
    const markdown = readArticle(slug);
    const before = execFileSync("git", ["show", `origin/main:src/data/articles/${slug}.md`], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.match(markdown, new RegExp(`\\]\\(/${target}/\\)`), `${slug} missing /${target}/`);
    assert.equal(field(markdown, "dateModified"), dateModified, `${slug} dateModified`);
    assert.equal(field(markdown, "substantiveUpdate"), substantiveUpdate, `${slug} substantiveUpdate`);
    assert.equal(field(markdown, "dateModified"), field(before, "dateModified"), `${slug} moved dateModified`);
    assert.equal(
      field(markdown, "substantiveUpdate"),
      field(before, "substantiveUpdate"),
      `${slug} moved substantiveUpdate`,
    );
    assert.equal(field(markdown, "author") ?? "David Miller", "David Miller", slug);
    assert.doesNotMatch(markdown, /FAQPage/);
  }
});

test("built thrifty and grocery pages publish the tables without FAQPage", () => {
  const thriftyPath = join(ROOT, "dist", THRIFTY, "index.html");
  const groceryPath = join(ROOT, "dist", GROCERY, "index.html");
  if (!existsSync(thriftyPath) || !existsSync(groceryPath)) return;

  const thrifty = readFileSync(thriftyPath, "utf8");
  const grocery = readFileSync(groceryPath, "utf8");
  assert.match(thrifty, /How do USDA FNS Thrifty Food Plan staples compare to 2026 BLS average grocery prices\?/);
  assert.match(thrifty, /fdc\.nal\.usda\.gov\/food-details\/174036\/nutrients/);
  assert.match(thrifty, /\$6\.76/);
  assert.match(grocery, /Which grocery-aisle swaps save the most money per gram of protein and fiber\?/);
  assert.match(grocery, /fdc\.nal\.usda\.gov\/food-details\/172420\/nutrients/);
  assert.match(grocery, /77\.7/);
  assert.doesNotMatch(thrifty, /FAQPage/);
  assert.doesNotMatch(grocery, /FAQPage/);
  assert.match(thrifty, /"name":"David Miller"/);
  assert.match(grocery, /"name":"David Miller"/);
  assert.match(thrifty, new RegExp(`"dateModified":"${DAY}T00:00:00.000Z"`));
  assert.match(grocery, new RegExp(`"dateModified":"${DAY}T00:00:00.000Z"`));
  assert.doesNotMatch(thrifty, /href="[^"]*\.csv/);
  assert.doesNotMatch(grocery, /href="[^"]*\.csv/);
});
