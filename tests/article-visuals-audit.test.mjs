import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  auditArticleFiles,
  countArticleWords,
  extractBodyImages,
  splitArticle,
} from "../scripts/audit-article-visuals.mjs";


const ROOT = path.resolve(import.meta.dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "audit-article-visuals.mjs");


function writeFixture(directory, slug, { hero = "/images/hero.jpg", body = "Body" } = {}) {
  const file = path.join(directory, `${slug}.md`);
  fs.writeFileSync(file, `---\ntitle: Test\nimage: "${hero}"\n---\n\n${body}\n`, "utf8");
  return file;
}


test("parses frontmatter separately and counts article words", () => {
  const raw = "---\ntitle: Words that do not count\n---\n\nOne two [three](/target).";
  const { frontmatter, body } = splitArticle(raw);
  assert.match(frontmatter, /Words that do not count/);
  assert.equal(countArticleWords(body), 3);
});


test("finds Markdown and HTML body images and their alt text", () => {
  const images = extractBodyImages(
    "![A useful chart](/images/chart.jpg)\n<img src=\"/images/photo.jpg\" alt=\"Dinner\">",
  );
  assert.deepEqual(images, [
    { kind: "markdown", alt: "A useful chart", src: "/images/chart.jpg" },
    { kind: "html", alt: "Dinner", src: "/images/photo.jpg" },
  ]);
});


test("audit separates hero, body images, charts, word count, and asset existence", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dlh-visuals-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "public", "images"), { recursive: true });
  fs.writeFileSync(path.join(directory, "public", "images", "hero.jpg"), "hero");
  fs.writeFileSync(path.join(directory, "public", "images", "chart.jpg"), "chart");
  const file = writeFixture(directory, "visual", {
    body: "One two three.\n\n![Comparison chart](/images/chart.jpg)",
  });

  const result = auditArticleFiles([file], { root: directory, longFormWords: 3 });
  const row = result.rows[0];
  assert.equal(row.heroExists, true);
  assert.equal(row.wordCount, 3);
  assert.equal(row.bodyImageCount, 1);
  assert.equal(row.chartCount, 1);
  assert.equal(row.longFormHeroOnly, false);
  assert.equal(row.problems.length, 0);
});


test("long-form hero-only article is reported as a quality issue", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dlh-visuals-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "public", "images"), { recursive: true });
  fs.writeFileSync(path.join(directory, "public", "images", "hero.jpg"), "hero");
  const file = writeFixture(directory, "text-wall", { body: "one two three four five" });

  const result = auditArticleFiles([file], { root: directory, longFormWords: 5 });
  assert.equal(result.longFormHeroOnly, 1);
  assert.deepEqual(result.rows[0].problems.map((item) => item.code), [
    "long_form_hero_only",
  ]);
});


test("missing assets and missing body alt text are reported", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dlh-visuals-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = writeFixture(directory, "broken", {
    hero: "/images/missing-hero.jpg",
    body: "![](/images/missing-body.jpg)",
  });

  const result = auditArticleFiles([file], { root: directory });
  assert.deepEqual(result.rows[0].problems.map((item) => item.code), [
    "missing_hero_asset",
    "missing_body_asset",
    "body_image_missing_alt",
  ]);
});


test("strict CLI requires explicit files and fails only the bounded batch", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dlh-visuals-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const invalid = writeFixture(directory, "invalid", { hero: "", body: "one two" });
  const valid = writeFixture(directory, "valid", {
    hero: "https://example.com/hero.jpg",
    body: "one two",
  });

  const unbounded = spawnSync(process.execPath, [SCRIPT, "--strict"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const failed = spawnSync(
    process.execPath,
    [SCRIPT, "--strict", "--files", invalid, "--long-form-words", "10"],
    { cwd: ROOT, encoding: "utf8" },
  );
  const passed = spawnSync(
    process.execPath,
    [SCRIPT, "--strict", "--files", valid, "--long-form-words", "10"],
    { cwd: ROOT, encoding: "utf8" },
  );

  assert.equal(unbounded.status, 2);
  assert.match(unbounded.stderr, /requires --files/);
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /missing_hero=1/);
  assert.equal(passed.status, 0);
});


test("report-only CLI exits successfully even when the bounded file has issues", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dlh-visuals-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const invalid = writeFixture(directory, "invalid", { hero: "", body: "one two" });
  const result = spawnSync(process.execPath, [SCRIPT, "--files", invalid], {
    cwd: ROOT,
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /mode=report-only/);
  assert.match(result.stdout, /Legacy gaps are report-only/);
});


test("strict CLI also accepts positional files for npm script forwarding", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dlh-visuals-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const valid = writeFixture(directory, "valid", {
    hero: "https://example.com/hero.jpg",
    body: "one two",
  });
  const result = spawnSync(process.execPath, [SCRIPT, "--strict", valid], {
    cwd: ROOT,
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /mode=strict/);
  assert.match(result.stdout, /scanned=1/);
});
