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

test("all 22 published datasets have an article, CSV, and embeddable chart", () => {
  assert.equal(datasetSlugs.length, 22);
  assert.equal(new Set(datasetSlugs).size, 22);
  assert.equal(csvPaths.length, 22);
  assert.equal(new Set(csvPaths).size, 22);

  for (const slug of datasetSlugs) {
    const articlePath = path.join(root, "src", "data", "articles", `${slug}.md`);
    assert.ok(fs.existsSync(articlePath), `missing article for ${slug}`);
    assert.match(
      fs.readFileSync(articlePath, "utf8"),
      /!\[[^\]]+\]\(\/images\/[^)\s]*-chart\.jpg\)/,
      `missing accessible chart image for ${slug}`,
    );
  }

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
  assert.match(embedSource, /target="_blank" rel="noopener"/);
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

test("study pages provide a visible outside-iframe credit and accessible copy UX", () => {
  assert.match(
    articleSource,
    /<\/iframe>\\n<p>Chart: <a href="\$\{articleUrl\}">Daily Life Hacks<\/a> - free to reuse with credit<\/p>/,
  );
  assert.match(articleSource, /aria-label="Embed code for this chart"/);
  assert.match(articleSource, /id="embed-copy-btn"/);
  assert.match(
    articleSource,
    /id="embed-copy-status" class="sr-only" role="status" aria-live="polite"/,
  );
  assert.match(articleSource, /href=\{`\/embed\/\$\{article\.id\}\/`\}/);
});

test("successful embed-code copies emit anonymous, dataset-scoped analytics", () => {
  const analyticsCall =
    articleSource.match(
      /window\.gtag\("event", "chart_embed_code_copied", \{[\s\S]*?\}\);/,
    )?.[0] ?? "";

  assert.match(analyticsCall, /dataset_id: datasetId/);
  assert.match(analyticsCall, /interaction_type: "copy_code"/);
  assert.match(analyticsCall, /source_page: location\.pathname/);
  assert.doesNotMatch(
    analyticsCall,
    /box\.value|search|query|chartTitle|dataset\.name/,
  );
});
