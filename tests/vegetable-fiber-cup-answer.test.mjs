import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rankedPath = join(
  root,
  "src/data/articles/best-high-fiber-foods-ranked-by-fiber-content.md",
);
const fastFoodPath = join(
  root,
  "src/data/articles/high-fiber-fast-food-options-guide.md",
);
const ranked = readFileSync(rankedPath, "utf8");
const fastFood = readFileSync(fastFoodPath, "utf8");

const QUESTION_HEADING = "Which vegetable has the most fiber per cup?";
const ANCHOR = "which-vegetable-has-the-most-fiber-per-cup";

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing frontmatter");
  return match[1];
}

function field(markdown, name) {
  const match = frontmatter(markdown).match(
    new RegExp(`^${name}:\\s*"?([^"\\n]+?)"?\\s*$`, "m"),
  );
  assert.ok(match, `missing ${name}`);
  return match[1];
}

function answerParagraph(markdown) {
  const marker = `## ${QUESTION_HEADING}\n\n`;
  const start = markdown.indexOf(marker);
  assert.notEqual(start, -1, "missing the vegetable question heading");
  const rest = markdown.slice(start + marker.length);
  const paragraph = rest.split(/\n\s*\n/)[0];
  assert.ok(paragraph, "missing the direct answer under the heading");
  return paragraph;
}

function visibleWords(paragraph) {
  const visible = paragraph.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return visible.match(/[\p{L}\p{N}]+(?:[.'’][\p{L}\p{N}]+)*/gu) ?? [];
}

function cookedCupRows(markdown) {
  const header = "| Vegetable | 1 cup cooked | Fiber | Record |";
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.indexOf(header);
  assert.notEqual(headerIndex, -1, "missing the cooked-cup table");
  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) break;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    const id = cells[3].match(/FDC (\d+)/);
    assert.ok(id, `cooked-cup row is missing an FDC id: ${cells[0]}`);
    rows.push({
      name: cells[0],
      fiber: cells[2],
      fdcId: id[1],
    });
  }
  return rows;
}

test("cooked-cup heading answers which vegetable has the most fiber per cup", () => {
  assert.equal(field(ranked, "title"), "Which Foods Have the Most Fiber per 100g? Chia 34.4g");
  assert.equal(field(ranked, "author"), "David Miller");
  assert.equal(field(ranked, "dateModified"), "2026-11-23");
  assert.equal(ranked.includes("## How much fiber is in a cup of cooked vegetables?"), false);
  assert.match(ranked, new RegExp(`^## ${QUESTION_HEADING.replace("?", "\\?")}$`, "m"));

  const answer = answerParagraph(ranked);
  const words = visibleWords(answer);
  assert.ok(
    words.length >= 40 && words.length <= 55,
    `direct answer should be 40-55 visible words, got ${words.length}: ${words.join(" ")}`,
  );

  const [first, second, third] = cookedCupRows(ranked);
  assert.equal(first.name, "Artichoke hearts");
  assert.equal(first.fiber, "9.6 g");
  assert.equal(second.fiber, "8.8 g");
  assert.equal(third.fiber, "7.6 g");

  assert.match(answer, new RegExp(first.fiber.replace(" ", "\\s+")));
  assert.match(answer, new RegExp(`FDC ${first.fdcId}`));
  assert.match(answer, new RegExp(second.fiber.replace(" ", "\\s+")));
  assert.match(answer, new RegExp(`FDC ${second.fdcId}`));
  assert.match(answer, /collard greens/i);
  assert.match(answer, new RegExp(third.fiber.replace(" ", "\\s+")));
  assert.match(answer, new RegExp(`FDC ${third.fdcId}`));
  assert.match(answer, /per 100 gram ranking/i);
  assert.match(answer, /per cup ranking/i);
  assert.match(answer, /don't match/);
  assert.doesNotMatch(answer, /photo|photograph/i);
});

test("fast-food page links the vegetable question to the cooked-cup anchor", () => {
  assert.equal(field(fastFood, "title"), "High-Fiber Fast Food: Chipotle Leads at 25g");
  assert.equal(field(fastFood, "author"), "David Miller");
  assert.equal(field(fastFood, "dateModified"), "2026-09-30");

  const href = `/best-high-fiber-foods-ranked-by-fiber-content/#${ANCHOR}`;
  const links = [
    ...fastFood.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g),
  ].filter((match) => match[2] === href);
  assert.equal(links.length, 1, "expected exactly one in-body link to the cooked-cup anchor");
  assert.match(links[0][1], /which vegetable has the most fiber per cup/i);

  const body = fastFood.split(/\n---\n/).slice(1).join("\n---\n");
  assert.match(body, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(frontmatter(fastFood).includes(href), false);
});
