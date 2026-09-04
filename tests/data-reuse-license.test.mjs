import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const ccBy = "https://creativecommons.org/licenses/by/4.0/";

test("reuse page gives a scoped CC BY grant and copy-ready attribution", () => {
  const page = read("src/pages/data-reuse.astro");

  assert.match(page, /selection,\s*arrangement,\s*calculations,\s*field descriptions/);
  assert.match(page, /third-party content remain the property/);
  assert.match(page, /Data and calculations: Daily Life Hacks/);
  assert.match(page, /Changes: \[describe changes or "none"\]/);
  assert.match(page, /rel="license noopener"/);
  assert.match(page, /HUGGINGFACE_DATASET_URL/);
  assert.match(page, /mirrors the fiber and protein flagship CSVs/);
  assert.doesNotMatch(page, /\u2014/);
});

test("data catalog, article datasets, package and API expose one license", () => {
  const registry = read("src/content/datasets.ts");
  const dataPage = read("src/pages/data/index.astro");
  const articlePage = read("src/pages/[slug].astro");
  const openapi = JSON.parse(read("public/openapi.json"));
  const datapackage = JSON.parse(read("public/data/datapackage.json"));
  const provenance = JSON.parse(read("public/data/dataset-provenance.json"));

  assert.match(registry, /DATA_TERMS_URL = "https:\/\/www\.daily-life-hacks\.com\/data-reuse\/"/);
  assert.match(registry, /DATA_LICENSE_URL = "https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/"/);
  assert.match(dataPage, /license: DATA_LICENSE_URL/);
  assert.match(dataPage, /usageInfo: DATA_TERMS_URL/);
  assert.match(articlePage, /license: DATA_LICENSE_URL/);
  assert.match(articlePage, /usageInfo: DATA_TERMS_URL/);
  assert.equal(openapi.info.termsOfService, "https://www.daily-life-hacks.com/data-reuse/");
  assert.equal(openapi.info.license.url, ccBy);
  assert.equal(datapackage.licenses?.[0]?.path, ccBy);
  assert.equal(provenance.licenseUrl, ccBy);
  assert.equal(provenance.termsUrl, "/data-reuse/");
});

test("API response metadata preserves the license scope boundary", () => {
  const helper = read("functions/api/v1/_lib.js");
  const index = JSON.parse(read("public/data/api-index-v1.json"));

  assert.match(helper, /license: index\.license/);
  assert.match(helper, /license_url: index\.license_url/);
  assert.match(helper, /license_scope: index\.license_scope/);
  assert.equal(index.license_url, ccBy);
  assert.match(index.license_scope, /third-party material/);
});
