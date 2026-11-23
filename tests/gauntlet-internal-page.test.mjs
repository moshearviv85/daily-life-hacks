import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

function read(relative) {
  return readFileSync(join(ROOT, relative), "utf8");
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

test("gauntlet is injected only when DLH_INTERNAL_PAGES is 1", () => {
  const config = read("astro.config.mjs");
  const page = read("src/pages/_gauntlet.astro");

  assert.equal(existsSync(join(ROOT, "src/pages/gauntlet.astro")), false);
  assert.match(config, /process\.env\.DLH_INTERNAL_PAGES === '1'/);
  assert.match(config, /entrypoint:\s*new URL\('\.\/src\/pages\/_gauntlet\.astro', import\.meta\.url\)/);
  assert.match(config, /pattern:\s*'\/gauntlet'/);
  assert.match(
    config,
    /for \(const path of \[[\s\S]*?'\/dashboard',[\s\S]*?'\/gauntlet',[\s\S]*?'\/deploy-proof',[\s\S]*?\]\) \{\s*addPath\(path\);/,
  );
  const gate = config.slice(config.indexOf("function internalPages"));
  assert.match(gate, /process\.env\.DLH_INTERNAL_PAGES === '1'/);
  assert.doesNotMatch(gate, /dashboard|deploy-proof/);

  assert.match(page, /<title>Gauntlet — Internal Progress<\/title>/);
  assert.match(page, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.match(page, /reports\/gauntlet\/baseline-demand-cohort\.json/);
});

test("public sources do not link to /gauntlet/", () => {
  const roots = ["src/pages", "src/layouts", "src/components", "src/data/articles"];
  const hits = [];
  for (const relative of roots) {
    for (const file of walk(join(ROOT, relative))) {
      if (file.endsWith(`${sep}_gauntlet.astro`)) continue;
      if (readFileSync(file, "utf8").includes("/gauntlet")) hits.push(file.slice(ROOT.length));
    }
  }
  assert.deepEqual(hits, []);
});

test("default build does not emit dist/gauntlet/index.html", () => {
  assert.equal(
    existsSync(join(ROOT, "dist/index.html")),
    true,
    "dist/index.html is missing; run npm run build before this test",
  );
  assert.equal(existsSync(join(ROOT, "dist/gauntlet/index.html")), false);
  assert.equal(existsSync(join(ROOT, "dist/dashboard/index.html")), true);
  assert.equal(existsSync(join(ROOT, "dist/deploy-proof/index.html")), true);

  const sitemapHits = walk(join(ROOT, "dist"))
    .filter((file) => file.endsWith(".xml") && file.includes("sitemap"))
    .filter((file) => readFileSync(file, "utf8").includes("/gauntlet"));
  assert.deepEqual(sitemapHits, []);

  const linkHits = walk(join(ROOT, "dist"))
    .filter((file) => file.endsWith(".html"))
    .filter((file) => readFileSync(file, "utf8").includes("/gauntlet"))
    .map((file) => file.slice(ROOT.length));
  assert.deepEqual(linkHits, []);
});
