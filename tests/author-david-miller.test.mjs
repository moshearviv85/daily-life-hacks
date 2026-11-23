import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const authorModule = read("src/content/author.ts");
const authorPage = read("src/pages/author/david-miller.astro");
const routing = read("functions/[[path]].js");

test("published articles all name David Miller and do not use the team fallback", () => {
  const dir = new URL("../src/data/articles/", import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith(".md"));
  assert.ok(files.length >= 220, `expected the published article set, got ${files.length}`);

  const offenders = [];
  for (const file of files) {
    const text = readFileSync(new URL(file, dir), "utf8");
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const author = frontmatter.match(/^author:\s*(.+)$/m)?.[1]?.trim();
    if (author !== '"David Miller"') offenders.push(`${file}: ${author ?? "missing"}`);
  }
  assert.deepEqual(offenders, []);
});

test("author profile source is a ProfilePage for David Miller with no invented credentials", () => {
  assert.match(authorModule, /export const AUTHOR_NAME = "David Miller"/);
  assert.match(authorModule, /export const AUTHOR_PATH = "\/author\/david-miller\/"/);
  assert.match(authorPage, /"@type": "ProfilePage"/);
  assert.match(authorPage, /"@type": "Person"/);
  assert.match(authorPage, /name: AUTHOR_NAME/);
  assert.match(authorPage, /url: AUTHOR_URL/);
  assert.match(authorPage, /"@id": AUTHOR_ID/);
  assert.match(authorPage, /mainEntity: \{ "@id": AUTHOR_ID \}/);
  assert.match(authorPage, /David Miller is a pen name/);
  assert.match(authorPage, /nutrition-per-dollar method/);
  assert.match(authorPage, /not a chef, registered dietitian, or medical professional/i);
  assert.match(authorPage, /href=\{`\/\$\{article\.id\}\/`\}/);
  assert.doesNotMatch(authorPage, /<img\b/i);
  assert.doesNotMatch(authorPage, /\u2014/);
  assert.doesNotMatch(
    authorPage,
    /\b(PhD|Ph\.D|M\.D|RDN|bachelor|master's|university|certified nutritionist)\b/i,
  );
  assert.doesNotMatch(authorPage, /robots="noindex/);
});

test("dataset creator uses the same author profile URL", () => {
  const datasets = read("src/content/datasets.ts");
  assert.match(
    datasets,
    /"@id": "https:\/\/www\.daily-life-hacks\.com\/author\/david-miller\/#person"/,
  );
  assert.match(
    datasets,
    /url: "https:\/\/www\.daily-life-hacks\.com\/author\/david-miller\/"/,
  );
  assert.match(authorModule, /AUTHOR_ID = `\$\{AUTHOR_URL\}#person`/);
});

test("the blanket author/* 410 is gone and the WordPress author archives stay gone", () => {
  assert.doesNotMatch(routing, /"author\/\*"/);
  assert.match(routing, /"author"/);
  assert.match(routing, /"author\/admin"/);
  assert.doesNotMatch(routing, /"author\/david-miller"/);
});
