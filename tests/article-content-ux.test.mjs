import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/styles/global.css"), "utf8");
const slug = readFileSync(join(root, "src/pages/[slug].astro"), "utf8");

test("article Markdown body uses .article-content wrapper", () => {
  assert.match(slug, /class="article-content[^"]*"/);
  assert.match(slug, /<Content\s*\/>/);
});

test("article-content CSS covers reading UX essentials", () => {
  for (const needle of [
    ".article-content img",
    ".article-content table",
    ".article-content a:focus-visible",
    "overflow-x: auto",
    "overflow-x: clip",
    "scroll-margin-top",
  ]) {
    assert.ok(css.includes(needle), `missing CSS rule for ${needle}`);
  }
});

test("article-content avoids inventing caption CSS rules", () => {
  assert.doesNotMatch(css, /^\s*\.article-content\s+figcaption\b/m);
  assert.doesNotMatch(css, /^\s*figcaption\s*\{/m);
});
