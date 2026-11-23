import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(join(ROOT, path), "utf8");

const REDIRECTED_SLUGS = [
  "fiber-per-dollar-cheapest-high-fiber-foods",
  "protein-per-dollar-cheapest-protein-sources",
];

function csvCells(file) {
  const cells = new Set();
  for (const line of read(`public/data/${file}`).split(/\r?\n/)) {
    let field = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            quoted = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ",") {
        cells.add(field);
        field = "";
      } else {
        field += ch;
      }
    }
    cells.add(field);
  }
  return cells;
}

test("llms.txt key facts are 10-15 CSV-backed lines on live study URLs", () => {
  const text = read("public/llms.txt");
  const facts = text.split("\n").filter((line) => line.startsWith("- ") && line.includes(".csv"));
  assert.ok(facts.length >= 10 && facts.length <= 15, `expected 10-15 fact lines, got ${facts.length}`);
  for (const slug of REDIRECTED_SLUGS) {
    assert.equal(text.includes(slug), false, slug);
  }
  for (const line of facts) {
    const file = line.match(/\/data\/([a-z0-9.-]+\.csv)/i)?.[1];
    assert.ok(file, line);
    const cells = csvCells(file);
    const numbers = line.match(/\d+\.\d+|\d{4,}/g) ?? [];
    assert.ok(
      numbers.some((number) => cells.has(number)),
      `${file} does not contain a quoted number from: ${line}`,
    );
    assert.match(line, /Study: https:\/\/www\.daily-life-hacks\.com\/[a-z0-9/-]+\/?/);
  }
});

test("CITATION.cff names the organization and no person", () => {
  const cff = read("public/CITATION.cff");
  assert.match(cff, /^cff-version: 1\.2\.0/m);
  assert.match(cff, /title: Daily Life Hacks Food Value Data/);
  assert.match(cff, /version: "2026\.3"/);
  assert.match(cff, /date-released: "2026-07-31"/);
  assert.match(cff, /url: "https:\/\/www\.daily-life-hacks\.com\/methodology\/"/);
  assert.match(cff, /^license: CC-BY-4\.0$/m);
  assert.match(cff, /name: Daily Life Hacks/);
  assert.doesNotMatch(cff, /given-names|family-names|David|Miller/);
  assert.match(read("src/pages/data-reuse.astro"), /href="\/CITATION\.cff"/);
  assert.match(read("src/pages/data-reuse.astro"), /dateModified: "2026-07-29"/);
});

test("data-reuse renders a DOI only when zenodoDoi is a real DOI", () => {
  const page = read("src/pages/data-reuse.astro");
  const registry = read("src/content/datasets.ts");
  assert.match(registry, /export const ZENODO_DOI = ""/);
  assert.match(page, /doiUrl \?/);
  assert.doesNotMatch(page, /10\.\d{4,}\//);
  assert.doesNotMatch(page, /doi\.org\/10\./);
  assert.doesNotMatch(page, /placeholder/i);
});

test("dataset study URLs for the redirected pillars point at the ranking pages", () => {
  const registry = read("src/content/datasets.ts");
  assert.match(registry, /studyUrl: FIBER_RANKING_STUDY/);
  assert.match(registry, /studyUrl: PROTEIN_RANKING_STUDY/);
  assert.equal(registry.includes('studyUrl: "/data/fiber-per-dollar-2026/"'), false);
  assert.equal(registry.includes('studyUrl: "/data/protein-per-dollar-2026/"'), false);
  const index = JSON.parse(read("public/data/api-index-v1.json"));
  for (const dataset of Object.values(index.datasets)) {
    for (const slug of REDIRECTED_SLUGS) {
      assert.equal(
        String(dataset.study_url).includes(`/${slug}`),
        false,
        `${dataset.id} study_url ${dataset.study_url}`,
      );
    }
  }
  assert.equal(
    index.datasets["fiber-per-dollar-2026"].study_url,
    "https://www.daily-life-hacks.com/what-30-grams-of-fiber-costs-per-day/",
  );
  assert.equal(
    index.datasets["protein-per-dollar-2026"].study_url,
    "https://www.daily-life-hacks.com/protein-per-dollar-adjusted-for-quality/",
  );
});

test("dataset release bundle is generated outside dist and build", () => {
  execFileSync(process.execPath, ["scripts/build-dataset-release.mjs"], {
    cwd: ROOT,
    stdio: "pipe",
  });
  const releaseRoot = join(ROOT, "dataset-release");
  const months = readdirSync(releaseRoot).filter((name) => /^\d{4}-\d{2}$/.test(name));
  assert.deepEqual(months, ["2026-07"]);
  const dir = join(releaseRoot, "2026-07");
  assert.equal(existsSync(join(dir, "CITATION.cff")), true);
  assert.equal(existsSync(join(dir, "README.md")), true);
  assert.equal(existsSync(join(dir, ".zenodo.json")), true);
  const csvs = readdirSync(join(dir, "data")).filter((name) => name.endsWith(".csv"));
  assert.ok(csvs.length >= 20, `expected the study CSVs, got ${csvs.length}`);
  const readme = readFileSync(join(dir, "README.md"), "utf8");
  const zenodo = JSON.parse(readFileSync(join(dir, ".zenodo.json"), "utf8"));
  assert.match(readme, /Publisher:\*\* Daily Life Hacks/);
  assert.match(readme, /https:\/\/www\.daily-life-hacks\.com\/methodology\//);
  assert.match(readme, /https:\/\/www\.daily-life-hacks\.com\/data-reuse\//);
  assert.match(readme, /Priced month: July 2026/);
  assert.doesNotMatch(readme, /https:\/\/doi\.org|10\.\d{4,}\//);
  for (const slug of REDIRECTED_SLUGS) assert.equal(readme.includes(slug), false, slug);
  assert.equal(zenodo.creators.length, 1);
  assert.equal(zenodo.creators[0].name, "Daily Life Hacks");
  assert.equal(zenodo.creators[0].type, "Organizational");
  assert.equal(JSON.stringify(zenodo).includes("Miller"), false);
  assert.equal(JSON.stringify(zenodo).includes("David"), false);
  assert.equal("doi" in zenodo, false);
  assert.equal(dir.includes(`${join("dist", "data")}`), false);
  assert.equal(statSync(dir).isDirectory(), true);
});
