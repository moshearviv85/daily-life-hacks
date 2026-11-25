import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { VFile } from "vfile";

import { countArticleWords } from "../src/content/article-toc.mjs";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";
import rehypeArticleSemantics from "../scripts/rehype-article-semantics.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

const QUESTION_PAGES = [
  {
    slug: "easy-sourdough-discard-recipes-beginners",
    id: "choose-a-sourdough-discard-recipe-for-the-amount-you-have",
    heading: "What can I make with sourdough discard?",
    numbers: ["10", "15", "20", "40"],
  },
  {
    slug: "easy-one-pot-chicken-and-rice-dinner",
    id: "how-to-tell-when-the-chicken-and-rice-are-done",
    heading: "How do you know one-pot chicken and rice is done?",
    numbers: ["165", "18", "20"],
    substantiveUpdate: "2026-11-25",
  },
  {
    slug: "baking-sheet-liners-parchment-silicone-when-to-use",
    id: "what-the-heat-ratings-actually-say",
    heading: "How hot can parchment paper and silicone mats go?",
    numbers: ["425", "375", "500"],
  },
];

function words(value) {
  return value.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) ?? [];
}

function bodyOf(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
}

async function renderMarkdown(markdown, path) {
  const file = new VFile({ value: markdown, path });
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeArticleSemantics)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(file);
  return String(result);
}

test("explicit heading ids stay put and table captions stay hidden", async () => {
  const html = await renderMarkdown(
    [
      "## What can I make with sourdough discard? {#choose-a-sourdough-discard-recipe-for-the-amount-you-have}",
      "",
      "A full cup covers pancakes.",
      "",
      "| Recipe | Discard |",
      "| --- | --- |",
      "| Pancakes | 1 cup |",
      "",
      "### Heat",
      "",
      "Table: Published liner limits",
      "",
      "| Liner | Limit |",
      "| --- | --- |",
      "| Parchment | 425 |",
    ].join("\n"),
  );

  assert.match(
    html,
    /<h2 id="choose-a-sourdough-discard-recipe-for-the-amount-you-have">What can I make with sourdough discard\?<\/h2>/,
  );
  assert.doesNotMatch(html, /\{#/);
  assert.match(
    html,
    /<caption class="sr-only">What can I make with sourdough discard\?<\/caption>/,
  );
  assert.doesNotMatch(html, /Table: Published liner limits/);
  assert.match(html, /<caption class="sr-only">Published liner limits<\/caption>/);
  assert.match(html, /<th scope="col">Recipe<\/th>/);
  assert.match(html, /<th scope="col">Limit<\/th>/);
});

test("a table before any heading uses the page title", async () => {
  const path = join(root, "src/data/articles/easy-sourdough-discard-recipes-beginners.md");
  const html = await renderMarkdown("| Food | Grams |\n| --- | --- |\n| Lentils | 18 |\n", path);
  assert.match(
    html,
    /<caption class="sr-only">Easy Sourdough Discard Recipes for Beginners<\/caption>/,
  );
});

test("an existing caption and header scope are left alone", async () => {
  const html = await renderMarkdown(
    [
      "## Already labeled",
      "",
      '<table><caption>Kept caption</caption><thead><tr><th scope="row">Food</th></tr></thead></table>',
    ].join("\n"),
  );
  assert.equal(html.match(/<caption\b/g)?.length, 1);
  assert.match(html, /<caption>Kept caption<\/caption>/);
  assert.match(html, /<th scope="row">Food<\/th>/);
});

test("question headings keep their anchors and restate numbers already on the page", () => {
  for (const page of QUESTION_PAGES) {
    const path = `src/data/articles/${page.slug}.md`;
    const markdown = readFileSync(join(root, path), "utf8");
    const before = execFileSync("git", ["show", `origin/main:${path}`], {
      cwd: root,
      encoding: "utf8",
    });

    assert.equal(extractFrontmatterField(markdown, "title"), extractFrontmatterField(before, "title"));
    assert.equal(extractFrontmatterField(markdown, "author"), "David Miller");
    if (page.substantiveUpdate) {
      assert.equal(
        extractFrontmatterField(markdown, "dateModified"),
        page.substantiveUpdate,
        `${page.slug} dateModified`,
      );
      assert.equal(
        extractFrontmatterField(markdown, "substantiveUpdate"),
        page.substantiveUpdate,
        `${page.slug} substantiveUpdate`,
      );
    } else {
      assert.equal(
        extractFrontmatterField(markdown, "dateModified"),
        extractFrontmatterField(before, "dateModified"),
        `${page.slug} dateModified`,
      );
      assert.equal(
        extractFrontmatterField(markdown, "substantiveUpdate"),
        extractFrontmatterField(before, "substantiveUpdate"),
        `${page.slug} substantiveUpdate`,
      );
    }

    const heading = `## ${page.heading} {#${page.id}}`;
    const at = markdown.indexOf(heading);
    assert.ok(at !== -1, `${page.slug} missing ${heading}`);
    const after = markdown.slice(at + heading.length).trimStart();
    const paragraph = after.split(/\n\s*\n/)[0];
    const paragraphWords = words(paragraph);
    assert.ok(
      paragraphWords.length >= 40 && paragraphWords.length <= 60,
      `${page.slug} answer is ${paragraphWords.length} words`,
    );
    for (const number of page.numbers) {
      assert.ok(paragraphWords.includes(number), `${page.slug} missing ${number}`);
    }

    const growth = Math.abs(countArticleWords(bodyOf(markdown)) - countArticleWords(bodyOf(before))) /
      countArticleWords(bodyOf(before));
    assert.ok(
      growth < 0.15,
      `${page.slug} body changed by ${(growth * 100).toFixed(1)}%, which would need substantiveUpdate`,
    );
  }
});
