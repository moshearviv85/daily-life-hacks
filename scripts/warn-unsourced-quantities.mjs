#!/usr/bin/env node
/**
 * Warning-only scan: a paragraph that states a gram or percent quantity
 * and contains no markdown link. Never fails the process.
 *
 *   node scripts/warn-unsourced-quantities.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ARTICLE_DIR = join(process.cwd(), "src/data/articles");
const QUANTITY = /\d+(?:\.\d+)?(?:\s*g\b|\s*grams?\b|\s*%)/i;
const LINK = /\]\([^)\s]+\)/;
const MAX_LINES = 40;

function bodyOf(markdown) {
  const match = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return match ? markdown.slice(match[0].length) : markdown;
}

function paragraphs(body) {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function findUnsourcedQuantities(markdown) {
  const hits = [];
  for (const paragraph of paragraphs(bodyOf(markdown))) {
    if (!QUANTITY.test(paragraph)) continue;
    if (LINK.test(paragraph)) continue;
    const preview = paragraph.replace(/\s+/g, " ").slice(0, 160);
    hits.push(preview);
  }
  return hits;
}

function main() {
  const files = readdirSync(ARTICLE_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();
  const warnings = [];
  for (const name of files) {
    const markdown = readFileSync(join(ARTICLE_DIR, name), "utf8");
    for (const preview of findUnsourcedQuantities(markdown)) {
      warnings.push(`${name}: ${preview}`);
    }
  }
  console.log(
    `unsourced g/% warning: ${warnings.length} paragraph(s) with a gram or percent quantity and no link.`,
  );
  for (const line of warnings.slice(0, MAX_LINES)) {
    console.log(`- ${line}`);
  }
  if (warnings.length > MAX_LINES) {
    console.log(`- … ${warnings.length - MAX_LINES} more`);
  }
}

const invokedDirectly = process.argv[1]
  && process.argv[1].endsWith("warn-unsourced-quantities.mjs");

if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exit(0);
}
