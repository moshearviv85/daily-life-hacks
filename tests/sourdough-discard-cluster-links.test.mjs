import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const articleDirectory = join(process.cwd(), "src", "data", "articles");
const hub = "easy-sourdough-discard-recipes-beginners";

const pages = {
  "what-to-make-with-sourdough-discard-by-amount": [
    "can-you-use-sourdough-discard-from-a-new-starter",
    "how-long-does-sourdough-discard-last",
    "sourdough-discard-vs-active-starter",
  ],
  "can-you-use-sourdough-discard-from-a-new-starter": [
    "sourdough-discard-vs-active-starter",
    "how-long-does-sourdough-discard-last",
    "what-to-make-with-sourdough-discard-by-amount",
  ],
  "how-long-does-sourdough-discard-last": [
    "what-to-make-with-sourdough-discard-by-amount",
    "can-you-use-sourdough-discard-from-a-new-starter",
    "sourdough-discard-vs-active-starter",
  ],
  "sourdough-discard-vs-active-starter": [
    "can-you-use-sourdough-discard-from-a-new-starter",
    "what-to-make-with-sourdough-discard-by-amount",
  ],
};

const ownedPhrases = [
  "sourdough discard recipes",
  "easy sourdough discard recipes",
];

function article(slug) {
  return readFileSync(join(articleDirectory, `${slug}.md`), "utf8");
}

function body(source) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
}

function hrefs(source, slug) {
  return source.match(new RegExp(`\\]\\(/${slug}/`, "g")) ?? [];
}

test("each discard cluster page links the beginners hub and 2 to 3 siblings", () => {
  for (const [slug, siblings] of Object.entries(pages)) {
    const source = body(article(slug));
    assert.ok(siblings.length >= 2 && siblings.length <= 3, slug);
    assert.ok(
      hrefs(source, hub).length >= 1,
      `${slug} should link /${hub}/`,
    );
    for (const sibling of siblings) {
      assert.ok(
        hrefs(source, sibling).length >= 1,
        `${slug} should link /${sibling}/`,
      );
    }
  }
});

test("beginners hub keeps its title and links the four new guides", () => {
  const source = article(hub);
  assert.match(
    source,
    /^title: Easy Sourdough Discard Recipes for Beginners$/m,
  );
  assert.match(
    source,
    /^excerpt: 'Easy sourdough discard recipes with measured ingredients:/m,
  );
  assert.match(source, /^## More sourdough discard guides$/m);
  for (const slug of Object.keys(pages)) {
    assert.equal(
      hrefs(source, slug).length,
      1,
      `hub should link /${slug}/ once`,
    );
  }
});

test("owned discard-recipe phrases only anchor the beginners hub", () => {
  const linkPattern = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
  for (const slug of Object.keys(pages)) {
    const source = body(article(slug));
    for (const match of source.matchAll(linkPattern)) {
      const text = match[1].toLowerCase();
      const href = match[2];
      for (const phrase of ownedPhrases) {
        if (!text.includes(phrase)) continue;
        assert.equal(
          href.startsWith(`/${hub}/`),
          true,
          `${slug} uses "${phrase}" for ${href}`,
        );
      }
    }
  }
});
