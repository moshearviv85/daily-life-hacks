import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractDateModified } from "../scripts/check-datemodified-churn.mjs";

/**
 * PR-59: six high-impression pages need at least six in-body links from
 * indexable articles. Hub cards and Keep Reading do not count. Link-only
 * edits stay under 40 added words and do not move dateModified.
 *
 * #250's prune and redirect slugs are blocked as new link targets. They are
 * still indexable until that PR merges, so they are also left out of the
 * inbound count. A link from one of them would disappear from the graph.
 */
const TARGETS = [
  "high-fiber-bran-muffins-that-taste-good",
  "cooking-oils-smoke-points-best-uses",
  "healthy-alternatives-potato-chips-snacking",
  "savory-chia-seed-recipes-breakfast",
  "how-to-store-homemade-salad-dressing-safely",
  "high-fiber-yogurt-parfait-for-breakfast",
];

const SPEC_PAIRS = [
  ["what-to-make-with-sourdough-discard-by-amount", "high-fiber-bran-muffins-that-taste-good"],
  ["easy-high-fiber-breakfast-ideas-for-gut-health", "high-fiber-bran-muffins-that-taste-good"],
  ["best-high-fiber-foods-ranked-by-fiber-content", "high-fiber-bran-muffins-that-taste-good"],
  ["how-to-store-homemade-salad-dressing-safely", "cooking-oils-smoke-points-best-uses"],
  ["best-way-to-store-avocados-to-stop-browning", "cooking-oils-smoke-points-best-uses"],
  ["baking-sheet-liners-parchment-silicone-when-to-use", "cooking-oils-smoke-points-best-uses"],
  ["high-fiber-popcorn-toppings-healthy", "healthy-alternatives-potato-chips-snacking"],
  ["black-bean-brownies-hidden-fiber-dessert", "healthy-alternatives-potato-chips-snacking"],
  ["crispy-roasted-chickpeas-high-fiber-snack", "healthy-alternatives-potato-chips-snacking"],
  ["easy-high-fiber-breakfast-ideas-for-gut-health", "savory-chia-seed-recipes-breakfast"],
  ["high-fiber-yogurt-parfait-for-breakfast", "savory-chia-seed-recipes-breakfast"],
  ["high-protein-high-fiber-meals-for-weight-loss", "savory-chia-seed-recipes-breakfast"],
  ["how-to-pack-salad-for-work-not-soggy", "how-to-store-homemade-salad-dressing-safely"],
  ["how-to-revive-wilted-lettuce-and-greens", "how-to-store-homemade-salad-dressing-safely"],
  ["how-to-keep-sandwiches-from-getting-soggy", "how-to-store-homemade-salad-dressing-safely"],
  ["cottage-cheese-vs-greek-yogurt-protein-uses", "high-fiber-yogurt-parfait-for-breakfast"],
  ["best-breakfast-foods-for-sustained-energy", "high-fiber-yogurt-parfait-for-breakfast"],
  ["gut-friendly-high-fiber-smoothies-for-daily-wellness", "high-fiber-yogurt-parfait-for-breakfast"],
];

const PRUNE_250 = new Set([
  "high-fiber-dinner-recipes-picky-kids",
  "high-fiber-raspberry-jam-recipe-chia",
  "frozen-vs-fresh-produce-when-to-buy",
  "healthy-turkey-meatballs-meal-prep",
  "no-bake-high-fiber-energy-balls-recipe",
  "vegan-high-fiber-meal-prep-for-week",
  "aldi-shopping-hacks-large-family-meals",
  "healthy-egg-sandwich-add-ins-toppings",
  "add-flavor-without-more-sugar-tricks",
  "how-to-preheat-skillet-even-browning",
  "how-to-use-leftover-rice-creative-ideas",
  "hidden-sugars-popular-summer-salad-dressings",
  "high-fiber-pasta-alternatives",
  "how-to-stretch-meals-large-families",
  "stuffed-portobello-mushrooms-quinoa-spinach-feta",
  "sheet-pan-ginger-tofu-broccoli-sticky-glaze",
  "protein-per-dollar-cheapest-protein-sources",
  "high-protein-on-a-budget-complete-guide",
  "fiber-per-dollar-cheapest-high-fiber-foods",
  "how-to-eat-more-fiber-on-a-budget-complete-guide",
  "eat-healthy-on-a-budget-complete-playbook",
  "meal-prep-for-beginners-complete-system",
]);

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
  const pattern = /(?<!!)\[([^\]]+)\]\(([^)\s]+)\)|<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of body.matchAll(pattern)) {
    const href = match[2] || match[3] || "";
    const anchor = (match[1] || match[4] || "").replace(/<[^>]+>/g, "").trim();
    const slug = articleSlugFromHref(href);
    if (slug) links.push({ slug, anchor, href });
  }
  return links;
}

function redirectSources() {
  const rules = new Set();
  for (const rawLine of readFileSync("public/_redirects", "utf8").split(/\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 3 || parts[parts.length - 1] !== "301") continue;
    rules.add(parts[0].replace(/^\/+|\/+$/g, "").split("#")[0]);
  }
  return rules;
}

const articles = readdirSync(ARTICLE_DIR)
  .filter((name) => name.endsWith(".md"))
  .map((name) => {
    const slug = name.replace(/\.md$/, "");
    const raw = readFileSync(join(ARTICLE_DIR, name), "utf8");
    const { frontmatter, body } = splitArticle(raw);
    const release = field(frontmatter, "publishAt") || field(frontmatter, "date");
    const released = release ? Date.parse(release) <= Date.now() : false;
    return {
      slug,
      body,
      indexable: released && !INDEX_PRUNE_SLUGS.has(slug) && !PRUNE_250.has(slug),
    };
  });
const bySlug = new Map(articles.map((article) => [article.slug, article]));

function inboundSources(target) {
  return articles
    .filter((article) => article.indexable && article.slug !== target)
    .filter((article) => bodyLinks(article.body).some((link) => link.slug === target))
    .map((article) => article.slug)
    .sort();
}

test("each top-impression page has at least 6 in-body links from indexable articles", () => {
  const short = [];
  for (const slug of TARGETS) {
    const sources = inboundSources(slug);
    if (sources.length < 6) short.push(`${slug}=${sources.length} [${sources.join(", ")}]`);
  }
  assert.deepEqual(short, []);
});

test("each PR-59 source article links the named target in the body", () => {
  const missing = [];
  for (const [source, target] of SPEC_PAIRS) {
    const article = bySlug.get(source);
    assert.ok(article, `missing source article ${source}`);
    if (source !== "crispy-roasted-chickpeas-high-fiber-snack") {
      assert.equal(article.indexable, true, `${source} must stay indexable`);
    }
    const hit = bodyLinks(article.body).some((link) => link.slug === target);
    if (!hit) missing.push(`${source} -> ${target}`);
  }
  assert.deepEqual(missing, []);
});

function netNewLinks(diffText) {
  const removed = new Set();
  for (const line of diffText.split("\n")) {
    if (!line.startsWith("-") || line.startsWith("---")) continue;
    for (const link of bodyLinks(line.slice(1))) {
      removed.add(`${link.slug}::${link.anchor}::${link.href}`);
    }
  }
  const added = [];
  for (const line of diffText.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    for (const link of bodyLinks(line.slice(1))) {
      const key = `${link.slug}::${link.anchor}::${link.href}`;
      if (!removed.has(key)) added.push(link);
    }
  }
  return added;
}

test("added top-impression anchors are unique and never point at noindex or redirected URLs", () => {
  const blocked = redirectSources();
  const diff = git(["diff", "-U0", "origin/main", "--", ARTICLE_DIR]);
  const added = [];
  for (const link of netNewLinks(diff)) {
    assert.equal(INDEX_PRUNE_SLUGS.has(link.slug), false, `added link to noindexed ${link.slug}`);
    assert.equal(PRUNE_250.has(link.slug), false, `added link to a #250 URL /${link.slug}/`);
    assert.equal(blocked.has(link.slug), false, `added link to redirected /${link.slug}/`);
    assert.doesNotMatch(link.href, /[#?]/, `${link.href} should stay a canonical path without an anchor`);
    assert.match(
      link.href,
      new RegExp(`^/${link.slug}(?:/[a-z0-9-]+)?/$`),
      `${link.href} is not a canonical path`,
    );
    if (TARGETS.includes(link.slug)) added.push(link);
  }
  if (added.length === 0) return;

  const existing = new Map(TARGETS.map((slug) => [slug, new Set()]));
  for (const article of articles) {
    const before = git(["show", `origin/main:${ARTICLE_DIR}/${article.slug}.md`]);
    for (const link of bodyLinks(splitArticle(before).body)) {
      if (existing.has(link.slug)) existing.get(link.slug).add(link.anchor);
    }
  }
  const seen = new Map();
  for (const link of added) {
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

test("link edits into the top-impression pages keep dateModified and add at most 40 words", () => {
  const names = git(["diff", "--name-only", "origin/main", "--", ARTICLE_DIR])
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".md"));
  if (names.length === 0) return;

  for (const path of names) {
    const diff = git(["diff", "-U0", "origin/main", "--", path]);
    const addsTargetLink = netNewLinks(diff).some((link) => TARGETS.includes(link.slug));
    if (!addsTargetLink) continue;
    const after = readFileSync(path, "utf8");
    const before = git(["show", `origin/main:${path}`]);
    assert.equal(
      extractDateModified(after),
      extractDateModified(before),
      `${path} changed dateModified`,
    );
    assert.equal(
      splitArticle(after).frontmatter,
      splitArticle(before).frontmatter,
      `${path} changed frontmatter on a link-only edit`,
    );
    const delta = wordCount(splitArticle(after).body) - wordCount(splitArticle(before).body);
    const addsSection = diff.split("\n").some((line) => /^\+\s*## /.test(line));
    if (!addsSection) {
      assert.ok(delta <= WORD_LIMIT, `${path} grew by ${delta} words`);
    }
    assert.equal(after.includes("\u2014"), before.includes("\u2014"), `${path} added an em dash`);
  }
});
