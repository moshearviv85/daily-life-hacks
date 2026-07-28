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

  assert.equal(missing.length, 17);
  assert.equal(manifest.articles.length, 17);
  assert.deepEqual(manifestSlugs, expectedSlugs);
});

test("every brief points to its absent frontmatter image and records live evidence", () => {
  for (const article of manifest.articles) {
    const markdownPath = join(articleDirectory, `${article.slug}.md`);
    const markdown = readFileSync(markdownPath, "utf8");
    const frontmatterImage = imageFromFrontmatter(markdown);

    assert.equal(article.image_path, frontmatterImage);
    assert.equal(article.local_file_exists, false);
    assert.equal(existsSync(localAssetPath(article.image_path)), false);
    assert.equal(article.live.article_status, 200);
    assert.equal(article.live.hero_status, 404);
    assert.equal(article.live.hero_reference_occurrences, 7);
  }
});

test("briefs are ranked, non-chart concepts with no generated image text", () => {
  const priorities = manifest.articles.map(({ priority }) => priority).sort((a, b) => a - b);
  assert.deepEqual(priorities, Array.from({ length: 17 }, (_, index) => index + 1));

  const concepts = new Set();
  for (const article of manifest.articles) {
    const { brief } = article;
    const visualDescription = [
      brief.concept,
      brief.composition,
      brief.art_direction,
    ].join(" ");

    assert.equal(brief.embedded_text, false);
    assert.equal(brief.overlay_copy, null);
    assert.ok(brief.alt_draft.length > 20);
    assert.doesNotMatch(visualDescription, /\b(?:bar|pie|line)\s+chart\b|\bdashboard\b/i);
    assert.doesNotMatch(brief.alt_draft, /\u2014|your .+ will thank you/i);
    assert.equal(concepts.has(brief.concept), false, `duplicate concept: ${article.slug}`);
    concepts.add(brief.concept);
  }
});
