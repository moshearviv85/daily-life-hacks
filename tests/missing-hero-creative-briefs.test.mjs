import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const articleDirectory = join(root, "src", "data", "articles");
const manifestPath = join(
  root,
  "reports",
  "growth",
  "missing-hero-creative-briefs-2026-07-28.json",
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function imageFromFrontmatter(markdown) {
  const match = markdown.match(/^image:\s*["']?([^\r\n"']+)["']?\s*$/m);
  return match?.[1]?.trim() ?? null;
}

function localAssetPath(imagePath) {
  return join(root, "public", imagePath.replace(/^\/+/, ""));
}

function currentMissingHeroCohort() {
  return readdirSync(articleDirectory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const markdown = readFileSync(join(articleDirectory, name), "utf8");
      return {
        slug: name.slice(0, -3),
        imagePath: imageFromFrontmatter(markdown),
      };
    })
    .filter(({ imagePath }) => imagePath && !existsSync(localAssetPath(imagePath)))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

test("manifest covers exactly the current missing-hero cohort", () => {
  const missing = currentMissingHeroCohort();
  const expectedSlugs = missing.map(({ slug }) => slug);
  const manifestSlugs = manifest.articles.map(({ slug }) => slug).sort();

  assert.equal(missing.length, 57);
  assert.equal(manifest.articles.length, 57);
  assert.deepEqual(manifestSlugs, expectedSlugs);
});

test("every brief points to its absent frontmatter image", () => {
  for (const article of manifest.articles) {
    const markdownPath = join(articleDirectory, `${article.slug}.md`);
    const markdown = readFileSync(markdownPath, "utf8");
    const frontmatterImage = imageFromFrontmatter(markdown);

    assert.equal(article.image_path, frontmatterImage);
    assert.equal(article.local_file_exists, false);
    assert.equal(existsSync(localAssetPath(article.image_path)), false);
    assert.equal(article.live.hero_status, 404);
  }
});

test("live evidence records 56 broken 200 pages and the one redirect exception", () => {
  const directPages = manifest.articles.filter(
    ({ live }) =>
      live.article_status === 200 &&
      live.hero_status === 404 &&
      live.hero_reference_occurrences === 7,
  );
  assert.equal(directPages.length, 56);

  const redirect = manifest.articles.find(
    ({ slug }) => slug === "how-to-meal-plan-on-a-budget",
  );
  assert.deepEqual(redirect.live, {
    checked_at: "2026-07-28",
    article_status: 301,
    redirect_location:
      "https://www.daily-life-hacks.com/how-to-meal-prep-on-a-budget-for-one-person/",
    hero_status: 404,
    hero_reference_occurrences: 0,
  });
});

test("search evidence distinguishes absent export rows from measured zeroes", () => {
  const gscListed = manifest.articles.filter(
    ({ search_evidence }) => search_evidence.gsc_page_export !== "not_listed",
  );
  const bingListed = manifest.articles.filter(
    ({ search_evidence }) => search_evidence.bing_url_export.status === "listed",
  );

  assert.equal(gscListed.length, 0);
  assert.equal(bingListed.length, 1);
  assert.equal(bingListed[0].slug, "how-to-meal-plan-on-a-budget");
  assert.equal(bingListed[0].search_evidence.bing_url_export.impressions, 0);
  assert.equal(bingListed[0].search_evidence.bing_url_export.clicks, 0);
  assert.match(
    manifest.evidence.gsc_page_result,
    /unavailable page-level evidence, not 57 measured zeroes/i,
  );
});

test("briefs are ranked, non-chart concepts with no generated image text", () => {
  const priorities = manifest.articles.map(({ priority }) => priority).sort((a, b) => a - b);
  assert.deepEqual(priorities, Array.from({ length: 57 }, (_, index) => index + 1));

  const concepts = new Set();
  for (const article of manifest.articles) {
    const { brief } = article;
    const visualDescription = [brief.concept, brief.art_direction].join(" ");

    assert.equal(brief.embedded_text, false);
    assert.equal(brief.overlay_copy, null);
    assert.ok(brief.alt_draft.length > 20);
    assert.doesNotMatch(visualDescription, /\b(?:bar|pie|line)\s+chart\b|\bdashboard\b/i);
    assert.doesNotMatch(
      brief.alt_draft,
      /\u2014|your .+ will thank you|\bit is\b|\bdo not\b|\bthey are\b/i,
    );
    assert.equal(concepts.has(brief.concept), false, `duplicate concept: ${article.slug}`);
    concepts.add(brief.concept);
  }
});
