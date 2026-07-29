import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const articlesDir = join(root, "src", "data", "articles");
const distDir = join(root, "dist");
const manifestPath = join(root, "public", "images", "opt", "manifest.json");

function bodyImages() {
  const images = [];

  for (const file of readdirSync(articlesDir).filter((name) => name.endsWith(".md"))) {
    const markdown = readFileSync(join(articlesDir, file), "utf8");
    const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
    const slug = file.replace(/\.md$/, "");

    for (const match of body.matchAll(/!\[([^\]]*)\]\((\/images\/[^)\s]+)\)/g)) {
      images.push({ slug, alt: match[1], src: match[2] });
    }
  }

  return images;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("every in-article image has a truthful responsive WebP picture", () => {
  assert.ok(existsSync(manifestPath), "image manifest must be generated before this test");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const images = bodyImages();

  assert.ok(images.length >= 49, `expected the full in-article image cohort, found ${images.length}`);

  for (const image of images) {
    const entry = manifest[image.src];
    assert.ok(entry, `${image.slug}: missing image manifest entry for ${image.src}`);
    assert.ok(entry.width > 0 && entry.height > 0, `${image.slug}: missing intrinsic dimensions`);
    assert.ok(entry.variants.length > 0, `${image.slug}: missing optimized variants`);

    const htmlPath = join(distDir, image.slug, "index.html");
    assert.ok(existsSync(htmlPath), `${image.slug}: rendered article is missing`);
    const html = readFileSync(htmlPath, "utf8");
    const src = escapeRegex(image.src);
    const picture = html.match(
      new RegExp(`<picture>\\s*<source[^>]+type="image/webp"[^>]*>\\s*<img[^>]+src="${src}"[^>]*>\\s*</picture>`),
    );

    assert.ok(picture, `${image.slug}: ${image.src} is not rendered in a WebP picture`);
    const markup = picture[0];
    assert.match(markup, /\bsrcset="[^"]+\s\d+w(?:,[^"]+\s\d+w)*"/);
    assert.match(markup, /\bsizes="\(max-width: 768px\) 100vw, 768px"/);
    assert.match(markup, new RegExp(`\\bwidth="${entry.width}"`));
    assert.match(markup, new RegExp(`\\bheight="${entry.height}"`));
    assert.match(markup, /\bloading="lazy"/);
    assert.match(markup, /\bdecoding="async"/);

    for (const variant of entry.variants) {
      assert.match(markup, new RegExp(`${escapeRegex(variant.file)} ${variant.w}w`));
    }
  }
});

test("article schema and Pinterest metadata keep the canonical JPEG URL", () => {
  for (const image of bodyImages()) {
    const html = readFileSync(join(distDir, image.slug, "index.html"), "utf8");
    assert.ok(
      html.includes(`src="${image.src}"`),
      `${image.slug}: original JPEG must remain the img fallback`,
    );
    assert.ok(
      !html.includes(`data-pin-media="${image.src.replace("/images/", "/images/opt/")}`),
      `${image.slug}: optimized derivative must not replace Pinterest media`,
    );
  }
});
