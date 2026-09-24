import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

/** A sentence may name the retired snapshot only when it is explicitly historical. */
const HISTORICAL =
  /\b(?:used to|previously|pre-BLS|old snapshot|earlier snapshot|before the BLS|an earlier pass)\b/i;

const STALE_CURRENT_FACTS = ["97.9", "70.8"];

/** Rounded form of the retired 97.9 g/$ pinto row. "9.98 g per 100 g" and "98 cents" do not match. */
const ROUNDED_PINTO_SNAPSHOT =
  /about 98 grams of protein|pinto beans at 98\b|at 98 grams per dollar/i;

function sentences(text) {
  return text.split(/(?<=[.!?\n])/);
}

function assertNotCurrentFact(label, text) {
  for (const token of STALE_CURRENT_FACTS) {
    const pattern = new RegExp(`(?<!\\d)${token.replace(".", "\\.")}(?!\\d)`);
    for (const sentence of sentences(text)) {
      if (!pattern.test(sentence)) continue;
      assert.match(
        sentence,
        HISTORICAL,
        `${label} presents ${token} as a current protein or fiber per dollar fact: ${sentence.trim().slice(0, 220)}`,
      );
    }
  }
  for (const sentence of sentences(text)) {
    if (!ROUNDED_PINTO_SNAPSHOT.test(sentence)) continue;
    assert.match(
      sentence,
      HISTORICAL,
      `${label} presents the rounded 98 g/$ pinto snapshot as current: ${sentence.trim().slice(0, 220)}`,
    );
  }
}

function indexedArticlePaths() {
  const dir = join(root, "src/data/articles");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    .filter((slug) => !INDEX_PRUNE_SLUGS.has(slug))
    .map((slug) => join("src/data/articles", `${slug}.md`));
}

test("indexed articles and the homepage do not present 97.9 or 70.8 as the current pinto snapshot", () => {
  const paths = [
    "src/pages/index.astro",
    "src/components/RelatedArticles.astro",
    ...indexedArticlePaths(),
  ];
  assert.ok(paths.length > 40, "expected indexed articles plus the homepage");
  for (const relativePath of paths) {
    assert.equal(existsSync(join(root, relativePath)), true, relativePath);
    assertNotCurrentFact(relativePath, read(relativePath));
  }
});

test("beans double-win excerpt, the related-card blurb, matches the BLS pinto row", () => {
  const article = read("src/data/articles/beans-double-win-fiber-protein.md");
  const related = read("src/components/RelatedArticles.astro");
  assert.match(related, /rel\.data\.excerpt/);

  const excerpt = article.match(/^excerpt: "(.*)"$/m)?.[1] ?? "";
  assert.match(excerpt, /57\.6g of protein/);
  assert.match(excerpt, /41\.7g of fiber/);
  assert.match(excerpt, /99\.3 grams combined/);
  assert.match(excerpt, /\$6\.75 four pound bag/);
  assert.doesNotMatch(excerpt, /97\.9|70\.8|168\.7/);

  assert.match(article, /\| Green split peas \(dry\) \| 73\.9 g \| 71\.0 g \| 144\.9 g \| 16 oz bag, \$1\.42 \|/);
  assert.match(article, /\| Pinto beans \(dry\) \| 57\.6 g \| 41\.7 g \| 99\.3 g \| 4 lb bag, \$6\.75 \|/);
  assert.doesNotMatch(article, /\$3\.97/);
  assert.doesNotMatch(article, /168\.7/);
});

test("stale snapshot charts are not the pre-BLS pinto images", () => {
  const retired = {
    "public/images/beans-double-win-fiber-protein-chart.jpg":
      "f253d94967a4588089ebcd806466c8e693112cab29caf7e04212db23d6145130",
    "public/images/eggs-vs-everything-protein-value-chart.jpg":
      "aabcd4414379fc0ff41bb65eb8ac9edc881326a096665813c7f165a44f7760f5",
    "public/images/family-protein-ladder.jpg":
      "6e493cd0724c370298e5f6dd9ec3f24b8968fd57424ede18aefc1519f2627c14",
    "public/images/protein-per-dollar-adjusted-for-quality-chart.jpg":
      "c9b45449c1cb428f2cd4bc1fda3dff6299bcf5d3e9c632d76d6e23e76f5ebf0d",
    "public/images/protein-per-dollar-groceries-vs-drivethru.jpg":
      "6a54150a79ad8e051135316937a16be1dd4c80c64cbc7ad61ff7e4d50f23cff9",
  };
  for (const [relativePath, oldHash] of Object.entries(retired)) {
    const hash = createHash("sha256").update(readFileSync(join(root, relativePath))).digest("hex");
    assert.notEqual(hash, oldHash, `${relativePath} still has the pre-BLS chart`);
  }
});
