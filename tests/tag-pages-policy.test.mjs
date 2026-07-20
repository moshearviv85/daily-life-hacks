import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tagRoute = readFileSync(
  new URL("../src/pages/tag/[tag].astro", import.meta.url),
  "utf8",
);
const sitemapConfig = readFileSync(
  new URL("../astro.config.mjs", import.meta.url),
  "utf8",
);
const articleRoute = readFileSync(
  new URL("../src/pages/[slug].astro", import.meta.url),
  "utf8",
);
const baseLayout = readFileSync(
  new URL("../src/layouts/BaseLayout.astro", import.meta.url),
  "utf8",
);

test("thin tag archives do not generate static pages", () => {
  assert.match(tagRoute, /getStaticPaths\(\)[\s\S]*?return \[\];/);
  assert.doesNotMatch(tagRoute, /getCollection\(["']articles["']\)/);
});

test("tag paths stay outside the sitemap if the route is reintroduced", () => {
  assert.match(
    sitemapConfig,
    /normalized === ['"]\/tag['"] \|\| normalized\.startsWith\(['"]\/tag\/['"]\)/,
  );
});

test("article tags are labels, not links to retired tag archives", () => {
  assert.doesNotMatch(articleRoute, /href=\{`\/tag\//);
  assert.doesNotMatch(articleRoute, /href=["']\/tag\//);
  assert.equal(
    [...articleRoute.matchAll(/article\.data\.tags\.map\(\(tag: string\) => \([\s\S]*?<span/g)].length,
    2,
    "recipe and non-recipe tag blocks should both render labels",
  );
});

test("BaseLayout uses the supplied title without forcing a brand suffix", () => {
  assert.match(baseLayout, /<title>\{title\}<\/title>/);
  assert.doesNotMatch(baseLayout, /`\$\{title\}\s*\|\s*DLH`/);
  assert.doesNotMatch(baseLayout, /title\.includes\(['"]Daily Life Hacks['"]\)/);
});
