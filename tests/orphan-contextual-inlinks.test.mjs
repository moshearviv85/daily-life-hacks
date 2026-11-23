import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractDateModified } from "../scripts/check-datemodified-churn.mjs";

/**
 * PR-44: the 17 indexable articles that had zero Keep Reading cards need at
 * least three in-body inlinks from other indexable articles. Hub text links
 * do not count. A content rewrite may change an article without adding one
 * of these links. The 40-word cap applies only when the diff adds a new
 * in-body link to one of the 17.
 */
const ORPHANS = [
  "balanced-breakfast-that-keeps-you-full",
  "best-way-to-store-avocados-to-stop-browning",
  "gut-health-tea-peppermint-ginger",
  "fiber-rich-soup-for-weight-loss-cabbage",
  "high-protein-high-fiber-meals-for-weight-loss",
  "creamy-mushroom-barley-risotto-hands-off",
  "selenium-containing-foods-easy-ways",
  "high-fiber-stir-fry-vegetables",
  "prune-juice-alternatives-for-constipation",
  "natto-japanese-fermented-soybeans-gut-health",
  "water-and-fiber-the-golden-rule",
  "fix-oversalted-soup-sauce-rice",
  "eggs-vs-everything-protein-value",
  "how-to-keep-sandwiches-from-getting-soggy",
  "what-30-grams-of-fiber-costs-per-day",
  "split-pea-soup-recipe-high-fiber",
  "cheapest-complete-protein-pairs",
];

const SPEC_PAIRS = [
  ["protein-per-dollar-adjusted-for-quality", "eggs-vs-everything-protein-value"],
  ["protein-per-serving-beans-chicken-tofu-compared", "eggs-vs-everything-protein-value"],
  ["how-to-pack-salad-for-work-not-soggy", "how-to-keep-sandwiches-from-getting-soggy"],
  ["how-to-store-homemade-salad-dressing-safely", "how-to-keep-sandwiches-from-getting-soggy"],
  ["high-protein-vs-high-fiber-satiety", "high-protein-high-fiber-meals-for-weight-loss"],
  ["30-day-high-fiber-challenge-meal-plan", "high-protein-high-fiber-meals-for-weight-loss"],
  ["high-fiber-yogurt-parfait-for-breakfast", "balanced-breakfast-that-keeps-you-full"],
  ["oatmeal-vs-grits-fiber-content", "balanced-breakfast-that-keeps-you-full"],
  ["best-breakfast-foods-for-sustained-energy", "balanced-breakfast-that-keeps-you-full"],
  ["good-source-of-fiber-label-meaning", "water-and-fiber-the-golden-rule"],
  ["how-to-increase-fiber-intake-without-gas", "water-and-fiber-the-golden-rule"],
  ["best-high-fiber-foods-ranked-by-fiber-content", "creamy-mushroom-barley-risotto-hands-off"],
  ["vegetarian-high-fiber-dinners-for-natural-relief", "creamy-mushroom-barley-risotto-hands-off"],
  ["beans-double-win-fiber-protein", "split-pea-soup-recipe-high-fiber"],
  ["best-high-fiber-foods-ranked-by-fiber-content", "split-pea-soup-recipe-high-fiber"],
  ["foods-highest-in-protein-per-100-grams", "selenium-containing-foods-easy-ways"],
  ["eggs-vs-everything-protein-value", "selenium-containing-foods-easy-ways"],
  ["lentil-curry-high-fiber-vegan-dinner", "high-fiber-stir-fry-vegetables"],
  ["vegetarian-high-fiber-dinners-for-natural-relief", "high-fiber-stir-fry-vegetables"],
  ["quick-20-minute-high-fiber-meals-for-busy-days", "high-fiber-stir-fry-vegetables"],
  ["30-day-high-fiber-challenge-meal-plan", "what-30-grams-of-fiber-costs-per-day"],
  ["good-source-of-fiber-label-meaning", "what-30-grams-of-fiber-costs-per-day"],
  ["best-high-fiber-foods-ranked-by-fiber-content", "what-30-grams-of-fiber-costs-per-day"],
  ["water-and-fiber-the-golden-rule", "prune-juice-alternatives-for-constipation"],
  ["how-to-increase-fiber-intake-without-gas", "prune-juice-alternatives-for-constipation"],
  ["gut-friendly-high-fiber-smoothies-for-daily-wellness", "prune-juice-alternatives-for-constipation"],
  ["big-flavor-less-salt-citrus-herbs-umami-swaps", "fix-oversalted-soup-sauce-rice"],
  ["low-sodium-budget-foods-ranked", "fix-oversalted-soup-sauce-rice"],
  ["how-to-cook-dried-beans-from-scratch", "fix-oversalted-soup-sauce-rice"],
  ["how-to-store-fresh-herbs-to-last-longer", "best-way-to-store-avocados-to-stop-browning"],
  ["how-to-revive-wilted-lettuce-and-greens", "best-way-to-store-avocados-to-stop-browning"],
  ["plant-based-protein-sources-complete-guide", "cheapest-complete-protein-pairs"],
  ["can-you-eat-rice-and-beans-everyday", "cheapest-complete-protein-pairs"],
  ["easy-high-fiber-breakfast-ideas-for-gut-health", "gut-health-tea-peppermint-ginger"],
  ["gut-friendly-high-fiber-smoothies-for-daily-wellness", "gut-health-tea-peppermint-ginger"],
  ["easy-high-fiber-breakfast-ideas-for-gut-health", "natto-japanese-fermented-soybeans-gut-health"],
  ["plant-based-protein-sources-complete-guide", "natto-japanese-fermented-soybeans-gut-health"],
  ["lentil-curry-high-fiber-vegan-dinner", "fiber-rich-soup-for-weight-loss-cabbage"],
  ["split-pea-soup-recipe-high-fiber", "fiber-rich-soup-for-weight-loss-cabbage"],
];

const HUBS = {
  "src/pages/nutrition/index.astro": [
    "balanced-breakfast-that-keeps-you-full",
    "gut-health-tea-peppermint-ginger",
    "high-protein-high-fiber-meals-for-weight-loss",
    "selenium-containing-foods-easy-ways",
    "prune-juice-alternatives-for-constipation",
    "natto-japanese-fermented-soybeans-gut-health",
    "water-and-fiber-the-golden-rule",
    "eggs-vs-everything-protein-value",
    "what-30-grams-of-fiber-costs-per-day",
    "cheapest-complete-protein-pairs",
  ],
  "src/pages/recipes/index.astro": [
    "fiber-rich-soup-for-weight-loss-cabbage",
    "creamy-mushroom-barley-risotto-hands-off",
    "high-fiber-stir-fry-vegetables",
    "split-pea-soup-recipe-high-fiber",
  ],
  "src/pages/tips/index.astro": [
    "best-way-to-store-avocados-to-stop-browning",
    "fix-oversalted-soup-sauce-rice",
    "how-to-keep-sandwiches-from-getting-soggy",
  ],
};

const ARTICLE_DIR = "src/data/articles";
const WORD_LIMIT = 40;

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function field(frontmatter, name) {
  const match = frontmatter.match(
    new RegExp(`^${name}:\\s*["']?([^"'\\n#]+?)["']?\\s*$`, "m"),
  );
  return match ? match[1].trim() : null;
}

function splitArticle(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: raw };
  return { frontmatter: match[1], body: match[2] };
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function articleSlugFromHref(href) {
  const value = href.trim();
  if (!value || value.startsWith("#")) return null;
  if (/^(?:mailto|tel|javascript|data):/i.test(value)) return null;
  let pathname = value;
  if (/^https?:/i.test(value)) {
    try {
      const url = new URL(value);
      if (!/^https:\/\/(www\.)?daily-life-hacks\.com$/i.test(url.origin)) return null;
      pathname = url.pathname;
    } catch {
      return null;
    }
  } else if (!value.startsWith("/")) {
    return null;
  }
  const slug = pathname.replace(/^\/+|\/+$/g, "").split(/[/#?]/)[0];
  if (!slug || slug.includes(".")) return null;
  return slug;
}

function bodyLinks(body) {
  const links = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of body.matchAll(pattern)) {
    const href = match[2] || match[3] || "";
    const anchor = (match[1] || match[4] || "").replace(/<[^>]+>/g, "").trim();
    const slug = articleSlugFromHref(href);
    if (slug) links.push({ slug, anchor, href });
  }
  return links;
}

function loadArticles() {
  const now = Date.now();
  return readdirSync(ARTICLE_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const slug = name.replace(/\.md$/, "");
      const raw = readFileSync(join(ARTICLE_DIR, name), "utf8");
      const { frontmatter, body } = splitArticle(raw);
      const release = field(frontmatter, "publishAt") || field(frontmatter, "date");
      const released = release ? Date.parse(release) <= now : false;
      return {
        slug,
        body,
        indexable: released && !INDEX_PRUNE_SLUGS.has(slug),
      };
    });
}

function redirectSources() {
  const rules = [];
  for (const rawLine of readFileSync("public/_redirects", "utf8").split(/\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 3 || parts[parts.length - 1] !== "301") continue;
    rules.push(parts[0].replace(/^\/+|\/+$/g, ""));
  }
  return new Set(rules);
}

const articles = loadArticles();
const bySlug = new Map(articles.map((article) => [article.slug, article]));

function inboundSources(target) {
  const sources = [];
  for (const article of articles) {
    if (!article.indexable || article.slug === target) continue;
    if (bodyLinks(article.body).some((link) => link.slug === target)) {
      sources.push(article.slug);
    }
  }
  return sources.sort();
}

test("each of the 17 orphans has at least 3 in-body inlinks from indexable articles", () => {
  const short = [];
  for (const slug of ORPHANS) {
    const sources = inboundSources(slug);
    if (sources.length < 3) short.push(`${slug}=${sources.length} [${sources.join(", ")}]`);
  }
  assert.deepEqual(short, []);
});

test("each PR-44 source article links the listed target in the body", () => {
  const missing = [];
  for (const [source, target] of SPEC_PAIRS) {
    const article = bySlug.get(source);
    assert.ok(article, `missing source article ${source}`);
    assert.equal(article.indexable, true, `${source} must stay indexable`);
    const hit = bodyLinks(article.body).some((link) => link.slug === target);
    if (!hit) missing.push(`${source} -> ${target}`);
  }
  assert.deepEqual(missing, []);
});

test("added orphan anchors are unique and never point at noindex or redirected URLs", () => {
  const blocked = redirectSources();
  const diff = git(["diff", "-U0", "origin/main", "--", ARTICLE_DIR]);
  const added = [];
  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    for (const link of bodyLinks(line.slice(1))) {
      if (!ORPHANS.includes(link.slug)) continue;
      added.push(link);
      assert.equal(INDEX_PRUNE_SLUGS.has(link.slug), false, `added link to noindexed ${link.slug}`);
      assert.equal(blocked.has(link.slug), false, `added link to redirected /${link.slug}/`);
      assert.match(link.href, new RegExp(`^/${link.slug}/$`), `${link.href} is not a canonical article path`);
    }
  }
  // The 17 orphan links landed on main. A later diff, such as a title
  // rewrite, does not add them again. New orphan links in this diff still
  // have to be unique and point at indexable URLs.
  if (added.length === 0) return;

  const existing = new Map(ORPHANS.map((slug) => [slug, new Set()]));
  for (const article of articles) {
    const before = git(["show", `origin/main:${ARTICLE_DIR}/${article.slug}.md`]);
    for (const link of bodyLinks(splitArticle(before).body)) {
      if (existing.has(link.slug)) existing.get(link.slug).add(link.anchor);
    }
  }
  const seen = new Map();
  for (const link of added) {
    if (!existing.has(link.slug)) continue;
    assert.equal(
      existing.get(link.slug).has(link.anchor),
      false,
      `reused anchor "${link.anchor}" for ${link.slug}`,
    );
    const key = `${link.slug}::${link.anchor}`;
    assert.equal(seen.has(key), false, `new anchor repeated: ${key}`);
    seen.set(key, true);
  }
});

test("category hubs text-link each orphan above the article grid", () => {
  for (const [path, slugs] of Object.entries(HUBS)) {
    const source = readFileSync(path, "utf8");
    const gridAt = source.search(/All (nutrition articles|kitchen and money-saving tips)|id="articles-grid"/);
    assert.ok(gridAt > 0, `${path} should keep its article grid`);
    const intro = source.slice(0, gridAt);
    for (const slug of slugs) {
      assert.match(intro, new RegExp(`href="/${slug}/"`), `${path} missing above-grid link to ${slug}`);
    }
  }
});

test("link edits keep dateModified and add at most 40 words per article", () => {
  const names = git([
    "diff",
    "--name-only",
    "origin/main",
    "--",
    ARTICLE_DIR,
  ])
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".md"));

  // The orphan links, title rewrite, and author fix are already on main. A
  // later template-only diff has no article files to measure. When articles
  // do change, dateModified stays put and the body grows by at most 40 words.
  if (names.length === 0) return;
  for (const path of names) {
    const diff = git(["diff", "-U0", "origin/main", "--", path]);
    const addsOrphanLink = diff.split("\n").some((line) => {
      if (!line.startsWith("+") || line.startsWith("+++")) return false;
      return bodyLinks(line.slice(1)).some((link) => ORPHANS.includes(link.slug));
    });
    if (!addsOrphanLink) continue;
    const after = readFileSync(path, "utf8");
    const before = git(["show", `origin/main:${path}`]);
    assert.equal(
      extractDateModified(after),
      extractDateModified(before),
      `${path} changed dateModified`,
    );
    const frontmatterExceptTitleAndAuthor = (frontmatter) =>
      frontmatter
        .replace(/^title:.*$/m, "title:")
        .replace(/^author:\s*"Daily Life Hacks Team"\s*$/m, 'author: "David Miller"');
    assert.equal(
      frontmatterExceptTitleAndAuthor(splitArticle(after).frontmatter),
      frontmatterExceptTitleAndAuthor(splitArticle(before).frontmatter),
      `${path} changed frontmatter besides the title and the David Miller author fix`,
    );
    const delta = wordCount(splitArticle(after).body) - wordCount(splitArticle(before).body);
    assert.ok(delta <= WORD_LIMIT, `${path} grew by ${delta} words`);
    assert.equal(after.includes("\u2014"), before.includes("\u2014"), `${path} added an em dash`);
  }
});
