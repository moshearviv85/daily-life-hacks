import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ARTICLE_TOC_MIN_WORDS,
  buildArticleToc,
  countArticleWords,
} from "../src/content/article-toc.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const articlePage = readFileSync(join(root, "src/pages/[slug].astro"), "utf8");
const tocComponent = readFileSync(
  join(root, "src/components/ArticleTableOfContents.astro"),
  "utf8",
);

const longBody = `${"useful article words ".repeat(
  Math.ceil(ARTICLE_TOC_MIN_WORDS / 3),
)} extra`;

test("TOC is limited to long articles with at least four useful H2 headings", () => {
  const headings = [
    { depth: 2, slug: "first", text: "First useful section" },
    { depth: 2, slug: "second", text: "Second useful section" },
    { depth: 3, slug: "detail", text: "A nested detail" },
    { depth: 2, slug: "third", text: "Third useful section" },
    { depth: 2, slug: "faq", text: "Frequently Asked Questions" },
    { depth: 2, slug: "sources", text: "Sources" },
    { depth: 2, slug: "fourth", text: "Fourth useful section" },
  ];

  assert.deepEqual(buildArticleToc(headings, longBody), [
    { slug: "first", text: "First useful section" },
    { slug: "second", text: "Second useful section" },
    { slug: "third", text: "Third useful section" },
    { slug: "fourth", text: "Fourth useful section" },
  ]);
  assert.deepEqual(buildArticleToc(headings, "short article"), []);
  assert.deepEqual(buildArticleToc(headings.slice(0, 3), longBody), []);
});

test("word count ignores URLs, code fences, and HTML comments", () => {
  const markdown = [
    "one two three",
    "[link words](https://example.com/a/very/long/path)",
    "`ignored inline code`",
    "```js\nignored fenced code\n```",
    "<!-- ignored comment words -->",
  ].join("\n");

  assert.equal(countArticleWords(markdown), 5);
});

test("article page uses Astro's rendered heading slugs and accessible navigation", () => {
  assert.match(articlePage, /const \{ Content, headings \} = await render\(article\)/);
  assert.match(articlePage, /buildArticleToc\(headings, article\.body \?\? ""\)/);
  assert.match(articlePage, /<ArticleTableOfContents items=\{tableOfContents\} \/>/);

  assert.match(tocComponent, /<nav[\s\S]*aria-labelledby="article-toc-heading"/);
  assert.match(tocComponent, /<summary[\s\S]*id="article-toc-heading"/);
  assert.match(tocComponent, /href=\{`#\$\{item\.slug\}`\}/);
  assert.doesNotMatch(tocComponent, /querySelector|innerHTML|client:/);
});
