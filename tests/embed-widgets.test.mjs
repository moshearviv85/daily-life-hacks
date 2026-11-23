import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const datasetsSource = read("src/content/datasets.ts");
const articleSource = read("src/pages/[slug].astro");
const embedSource = read("src/pages/embed/[slug].astro");
const headersSource = read("public/_headers");
const routerSource = read("functions/[[path]].js");
const astroConfig = read("astro.config.mjs");

const datasetBlock = datasetsSource.match(
  /export const DATASETS:[\s\S]*?=\s*\{([\s\S]*?)\n\};/,
)?.[1];

assert.ok(datasetBlock, "DATASETS registry should be readable by the audit");

const datasetSlugs = [
  ...datasetBlock.matchAll(/^\s{2}"([^"]+)":\s*\{/gm),
].map((match) => match[1]);
const csvPaths = [
  ...datasetBlock.matchAll(/^\s+csv:\s*"([^"]+)",/gm),
].map((match) => match[1]);

test("published datasets have a CSV, and article studies keep an embeddable chart", () => {
  assert.equal(datasetSlugs.length, csvPaths.length);
  assert.equal(new Set(datasetSlugs).size, datasetSlugs.length);
  assert.equal(new Set(csvPaths).size, csvPaths.length);
  assert.ok(datasetSlugs.length >= 22);

  let articleStudies = 0;
  for (const slug of datasetSlugs) {
    const articlePath = path.join(root, "src", "data", "articles", `${slug}.md`);
    if (!fs.existsSync(articlePath)) continue;
    articleStudies += 1;
    assert.match(
      fs.readFileSync(articlePath, "utf8"),
      /!\[[^\]]+\]\(\/images\/[^)\s]*-chart\.jpg\)/,
      `missing accessible chart image for ${slug}`,
    );
  }
  assert.ok(articleStudies >= 10, `expected surviving study articles, found ${articleStudies}`);

  for (const csvPath of csvPaths) {
    assert.ok(
      fs.existsSync(path.join(root, "public", csvPath.replace(/^\//, ""))),
      `missing published CSV ${csvPath}`,
    );
  }
});

test("embed pages stay noindex, canonicalized, and frameable only on the scoped route", () => {
  assert.match(embedSource, /<meta name="robots" content="noindex"\s*\/>/);
  assert.match(embedSource, /<link rel="canonical" href=\{articleUrl\}\s*\/>/);
  assert.match(embedSource, /target="_blank" rel="noopener nofollow"/);
  assert.match(embedSource, /alt=\{chart\.alt \|\| chartTitle\}/);

  assert.match(
    headersSource,
    /\/embed\/\*[\s\S]*?! X-Frame-Options[\s\S]*?Content-Security-Policy: frame-ancestors \*[\s\S]*?X-Robots-Tag: noindex/,
  );
  assert.match(
    routerSource,
    /if \(path\.startsWith\("\/embed\/"\)\)[\s\S]*?embedHeaders\.delete\("X-Frame-Options"\)[\s\S]*?embedHeaders\.set\("Content-Security-Policy", "frame-ancestors \*"\)[\s\S]*?embedHeaders\.set\("X-Robots-Tag", "noindex"\)/,
  );
  assert.match(
    astroConfig,
    /if \(normalized === '\/embed' \|\| normalized\.startsWith\('\/embed\/'\)\) return true;/,
  );
});

test("article pages no longer ship the embed-with-credit widget", () => {
  assert.doesNotMatch(articleSource, /id="embed-block"/);
  assert.doesNotMatch(articleSource, /id="embed-snippet"/);
  assert.doesNotMatch(articleSource, /id="embed-copy-btn"/);
  assert.doesNotMatch(articleSource, /free with credit/);
  assert.doesNotMatch(articleSource, /please keep both/);
  assert.doesNotMatch(articleSource, /chart_embed_code_copied/);
  assert.doesNotMatch(articleSource, /<!--[^>]*method #/);
});
