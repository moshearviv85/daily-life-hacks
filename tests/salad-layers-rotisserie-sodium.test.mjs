import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const SALAD_EXCERPT =
  "Pack a work salad so it stays crisp: dressing first, then hard vegetables, protein or grains, greens on top. Keep it at 40°F; eat within 2 hours if it warms.";
const COSTCO_EXCERPT =
  "One study rotisserie bird: $5.97, about 160 grams of protein, $1.49 and 40 grams split four ways. Label 460 mg sodium per 3 oz vs 263 mg USDA meat-only.";
const FSIS_DANGER_ZONE =
  "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f";
const SALAD_HEADING = "## How do you pack a salad so it stays crisp until lunch?";
const SKIN_HEADING = "## Does removing the skin cut sodium on rotisserie chicken?";

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
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith(`${name}:`)) continue;
    const rest = lines[i].slice(name.length + 1).trim();
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

function assertCanonicalInternalLinks(markdown, slug) {
  const links = [...markdown.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
  for (const link of links) {
    if (!link.startsWith("/")) continue;
    assert.equal(link.includes("#"), false, `${slug} internal link has an anchor: ${link}`);
    assert.ok(link.endsWith("/"), `${slug} internal link is not canonical: ${link}`);
  }
}

test("work salad page has the layer table, FSIS times, and exact description", () => {
  const markdown = readArticle("how-to-pack-salad-for-work-not-soggy");
  assert.equal(field(markdown, "excerpt"), SALAD_EXCERPT);
  assert.equal(SALAD_EXCERPT.length, 157);
  assert.equal(field(markdown, "title"), "How to Pack Salad for Work Without Soggy Lettuce");
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), "2026-11-25");
  assert.equal(field(markdown, "substantiveUpdate"), "2026-11-25");
  assert.equal(field(markdown, "image"), "/images/how-to-pack-salad-for-work-not-soggy-main.jpg");
  assert.doesNotMatch(markdown, /FAQPage|photograph|real photo|\bphoto of\b/i);
  assert.doesNotMatch(markdown, /\u2014/);

  const answer = answerUnder(markdown, SALAD_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `salad answer is ${count} words`);
  assert.match(answer, /40°F or below/);
  assert.match(answer, /fridge or a cold bag/);
  assert.match(answer, /2 hours/);
  assert.match(answer, /1 hour above 90°F/);
  assert.match(answer, new RegExp(FSIS_DANGER_ZONE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const tableAt = markdown.indexOf("| Layer, bottom to top | Tall jar | Wide box |");
  assert.ok(tableAt > markdown.indexOf(SALAD_HEADING), "layer table should follow the question");
  const table = markdown.slice(tableAt).split(/\n\s*\n/)[0];
  for (const layer of [
    "Dressing",
    "Hard vegetables",
    "Protein or grains",
    "Soft extras",
    "Greens",
    "Crunchy toppings",
  ]) {
    assert.match(table, new RegExp(layer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(table, /Packed separately/);
  assertCanonicalInternalLinks(markdown, "how-to-pack-salad-for-work-not-soggy");
});

test("rotisserie page answers skin-on versus skin-off sodium without the production draft", () => {
  const markdown = readArticle("costco-rotisserie-chicken-meal-ideas-dinner");
  const draft = readFileSync(
    join(ROOT, "src/data/articles/production/costco-rotisserie-chicken-meal-ideas-dinner.md"),
    "utf8",
  );
  assert.equal(field(markdown, "excerpt"), COSTCO_EXCERPT);
  assert.ok(COSTCO_EXCERPT.length <= 160, `costco excerpt is ${COSTCO_EXCERPT.length}`);
  assert.match(COSTCO_EXCERPT, /\$5\.97/);
  assert.match(COSTCO_EXCERPT, /160 grams/);
  assert.match(COSTCO_EXCERPT, /460 mg/);
  assert.match(COSTCO_EXCERPT, /263 mg/);
  assert.equal(field(markdown, "title"), "Costco Rotisserie Chicken: $5.97 and ~160g Protein");
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), "2026-11-25");
  assert.equal(field(markdown, "substantiveUpdate"), "2026-11-25");
  assert.doesNotMatch(markdown, /FAQPage|photograph|real photo|\bphoto of\b/i);
  assert.doesNotMatch(markdown, /\u2014/);
  assert.match(draft, /5 Quick Costco Rotisserie Chicken Meal Ideas/);
  assert.doesNotMatch(markdown, /five fast, family-friendly dinners/);
  assert.doesNotMatch(markdown, /title:\s*5 Quick Costco/);

  const answer = answerUnder(markdown, SKIN_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `skin answer is ${count} words`);
  assert.match(answer, /460 mg/);
  assert.match(answer, /263 mg/);
  assert.match(answer, /291 mg/);
  assert.match(answer, /https:\/\/fdc\.nal\.usda\.gov\/food-details\/171518\/nutrients/);
  assert.match(answer, /https:\/\/fdc\.nal\.usda\.gov\/food-details\/171123\/nutrients/);

  const tableAt = markdown.indexOf("| Piece | Sodium per 3 oz (84 g) | Source |");
  assert.ok(tableAt > markdown.indexOf(SKIN_HEADING), "sodium table should follow the question");
  const table = markdown.slice(tableAt).split(/\n\s*\n/)[0];
  assert.match(table, /Kirkland Signature label \| 460 mg/);
  assert.match(table, /USDA breast, meat only \| 263 mg/);
  assert.match(table, /USDA breast, meat and skin \| 291 mg/);
  assert.match(table, /171518/);
  assert.match(table, /171123/);
  assert.match(markdown, /about 160 grams of edible protein after bone and skin/);
  assertCanonicalInternalLinks(markdown, "costco-rotisserie-chicken-meal-ideas-dinner");

  const redirects = readFileSync(join(ROOT, "functions/[[path]].js"), "utf8");
  assert.match(
    redirects,
    /\["rotisserie-chicken-nutrition-facts-sodium-content", "\/costco-rotisserie-chicken-meal-ideas-dinner\/"\]/,
  );
});

test("built salad and rotisserie pages publish the answers and no FAQPage", () => {
  const saladPath = join(ROOT, "dist/how-to-pack-salad-for-work-not-soggy/index.html");
  const costcoPath = join(ROOT, "dist/costco-rotisserie-chicken-meal-ideas-dinner/index.html");
  if (!existsSync(saladPath) || !existsSync(costcoPath)) return;

  const salad = readFileSync(saladPath, "utf8");
  const costco = readFileSync(costcoPath, "utf8");
  const saladDescription = SALAD_EXCERPT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const costcoDescription = COSTCO_EXCERPT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(salad, new RegExp(`<meta name="description" content="${saladDescription}">`));
  assert.match(costco, new RegExp(`<meta name="description" content="${costcoDescription}">`));
  assert.match(salad, /How do you pack a salad so it stays crisp until lunch\?/);
  assert.match(salad, /<caption class="sr-only">Bottom-to-top salad layers for a tall jar and a wide box, with crunch packed separately<\/caption>/);
  assert.match(salad, /Tall jar/);
  assert.match(salad, /Wide box/);
  assert.match(salad, /Crunchy toppings/);
  assert.match(salad, new RegExp(FSIS_DANGER_ZONE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(costco, /Does removing the skin cut sodium on rotisserie chicken\?/);
  assert.match(costco, /<caption class="sr-only">Sodium in 3 ounces of rotisserie chicken, label versus USDA skin-off and skin-on breast<\/caption>/);
  assert.match(costco, /263 mg/);
  assert.match(costco, /291 mg/);
  assert.match(costco, /fdc\.nal\.usda\.gov\/food-details\/171123\/nutrients/);
  assert.doesNotMatch(salad, /FAQPage/);
  assert.doesNotMatch(costco, /FAQPage/);
  assert.match(salad, /Illustration generated with AI/);
  assert.match(costco, /Illustration generated with AI/);
  assert.match(salad, /"dateModified":"2026-11-25T00:00:00.000Z"/);
  assert.match(costco, /"dateModified":"2026-11-25T00:00:00.000Z"/);
  assert.match(salad, /"name":"David Miller"/);
  assert.match(costco, /"name":"David Miller"/);
});
