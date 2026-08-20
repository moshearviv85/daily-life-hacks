import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const LEAK = /(?:href|src)=["']\/\$\{/;

function walkSource(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSource(full, acc);
      continue;
    }
    if ([".astro", ".js", ".ts", ".mjs", ".html"].includes(extname(entry.name))) {
      acc.push(full);
    }
  }
  return acc;
}

function articleFrontmatter(slug) {
  const raw = readFileSync(join(ROOT, "src/data/articles", `${slug}.md`), "utf8");
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  const excerpt = raw.match(/^excerpt:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, `${slug} is missing a quoted title`);
  assert.ok(excerpt, `${slug} is missing a quoted excerpt`);
  return { title, excerpt };
}

test("answer-first titles and excerpts keep the on-page USDA numbers", () => {
  const popcorn = articleFrontmatter("popcorn-vs-potato-chips-fiber-comparison");
  assert.match(popcorn.title, /4\.1g/);
  assert.match(popcorn.title, /0\.9g/);
  assert.match(popcorn.excerpt, /4\.1g/);
  assert.match(popcorn.excerpt, /0\.9g/);

  const pizza = articleFrontmatter("comparing-fiber-content-different-pizza-crusts");
  assert.match(pizza.title, /2\.7g/);
  assert.match(pizza.title, /4\.2-5\.1g/);
  assert.match(pizza.excerpt, /2\.7g/);
  assert.match(pizza.excerpt, /4\.2-5\.1g/);

  const protein = articleFrontmatter("protein-per-serving-beans-chicken-tofu-compared");
  assert.match(protein.title, /26-35g/);
  assert.match(protein.title, /15g/);
  assert.match(protein.title, /8-20g/);
  assert.match(protein.excerpt, /26-35g/);
  assert.match(protein.excerpt, /15g/);
  assert.match(protein.excerpt, /8-20g/);
});

test("homepage and dashboard sources do not leak template-placeholder hrefs", () => {
  const files = [
    ...walkSource(join(ROOT, "src")),
    ...walkSource(join(ROOT, "public/js")),
  ];
  const leaks = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (LEAK.test(source)) leaks.push(file.replace(ROOT, ""));
  }
  assert.deepEqual(leaks, []);
});

test("FreshToday builds article hrefs by concatenation, not a placeholder path", () => {
  const source = readFileSync(join(ROOT, "src/components/FreshToday.astro"), "utf8");
  assert.match(source, /function articleHref\(slug\)/);
  assert.match(source, /'<a href="' \+/);
  assert.equal(source.includes('href="/${article.slug}'), false);
});

test("Cloudflare _redirects sends /sitemap.xml to the generated sitemap index", () => {
  const redirects = readFileSync(join(ROOT, "public/_redirects"), "utf8");
  assert.match(redirects, /^\/sitemap\.xml\s+\/sitemap-index\.xml\s+301$/m);
  assert.match(redirects, /^\/sitemap\.xml\/\s+\/sitemap-index\.xml\s+301$/m);
});
