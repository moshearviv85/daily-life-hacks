import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  CATEGORY_HUBS,
  assembleHub,
  hubBlockList,
} from "../src/content/category-hubs.ts";
import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ARTICLE_DIR = "src/data/articles";
const START_HERE = {
  nutrition: {
    fiber: "best-high-fiber-foods-ranked-by-fiber-content",
    beans: "canned-beans-vs-dried-beans-nutrition",
    "grocery-cost": "foods-highest-in-protein-per-100-grams",
  },
  recipes: {
    "sourdough-discard": "easy-sourdough-discard-recipes-beginners",
  },
  tips: {
    storage: "how-to-store-homemade-salad-dressing-safely",
  },
};

function field(frontmatter, name) {
  const match = frontmatter.match(
    new RegExp(`^${name}:\\s*["']?([^"'\\n#]+?)["']?\\s*$`, "m"),
  );
  return match ? match[1].trim() : "";
}

function loadArticles() {
  const now = Date.now();
  return readdirSync(ARTICLE_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const raw = readFileSync(join(ARTICLE_DIR, name), "utf8");
      const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
      const release = field(frontmatter, "publishAt") || field(frontmatter, "date");
      return {
        slug: name.replace(/\.md$/, ""),
        title: field(frontmatter, "title"),
        category: field(frontmatter, "category"),
        released: release ? Date.parse(release) <= now : false,
      };
    })
    .filter((article) => article.released);
}

function chromeAnchors() {
  const header = readFileSync("src/components/Header.astro", "utf8");
  const footer = readFileSync("src/components/Footer.astro", "utf8");
  const navTargets = [...header.matchAll(/href:\s*"([^"]+)"/g)].length;
  const logo = header.includes('href="/"') ? 1 : 0;
  const footerAnchors = [...footer.matchAll(/<a\b/g)].length;
  return navTargets * 2 + logo + footerAnchors;
}

const articles = loadArticles();
const blocked = hubBlockList();

test("each hub has four topic sections and the measured start-here pages", () => {
  assert.deepEqual(
    CATEGORY_HUBS.map((hub) => hub.category),
    ["nutrition", "recipes", "tips"],
  );
  for (const hub of CATEGORY_HUBS) {
    assert.ok(hub.topics.length >= 4, `${hub.category} needs at least 4 topic H2s`);
    const expected = START_HERE[hub.category];
    for (const [id, slug] of Object.entries(expected)) {
      const topic = hub.topics.find((entry) => entry.id === id);
      assert.ok(topic, `${hub.category} missing topic ${id}`);
      assert.equal(topic.slugs[0], slug);
    }
  }
});

test("topic links stay inside one section and off noindex, prune, and redirect URLs", () => {
  const seen = new Map();
  for (const hub of CATEGORY_HUBS) {
    const { topics } = assembleHub(hub, articles);
    for (const topic of topics) {
      assert.ok(topic.articles.length >= 4 && topic.articles.length <= 8, topic.id);
      assert.equal(topic.articles[0].slug, hub.topics.find((entry) => entry.id === topic.id).slugs[0]);
      for (const article of topic.articles) {
        assert.equal(blocked.has(article.slug), false, article.slug);
        assert.equal(INDEX_PRUNE_SLUGS.has(article.slug), false, article.slug);
        assert.equal(INDEX_NOINDEX_TOOL_PATHS.has(article.slug), false, article.slug);
        assert.equal(article.slug.includes("/"), false, article.slug);
        const owner = seen.get(article.slug);
        assert.equal(owner, undefined, `${article.slug} is also in ${owner}`);
        seen.set(article.slug, `${hub.category}/${topic.id}`);
      }
    }
  }
});

test("every indexable article is in exactly one hub A-Z list", () => {
  const placed = new Map();
  for (const hub of CATEGORY_HUBS) {
    const { alphabetical } = assembleHub(hub, articles);
    for (const article of alphabetical) {
      assert.equal(placed.has(article.slug), false, `${article.slug} is on two hubs`);
      placed.set(article.slug, hub.category);
    }
  }
  const indexable = articles.filter((article) => !blocked.has(article.slug));
  const missing = indexable
    .filter((article) => placed.get(article.slug) !== article.category)
    .map((article) => article.slug);
  assert.deepEqual(missing, []);
});

test("rendered hub link budgets stay at or under 125, counting header and footer", () => {
  const chrome = chromeAnchors();
  assert.ok(chrome > 0, "header and footer should contribute anchors");
  for (const hub of CATEGORY_HUBS) {
    const { topics, alphabetical } = assembleHub(hub, articles);
    const topicLinks = topics.reduce((sum, topic) => sum + topic.articles.length, 0);
    const tools = hub.category === "recipes" ? 1 : 0;
    const total = alphabetical.length + topicLinks + tools + chrome;
    assert.ok(
      total <= 125,
      `${hub.category} renders ${total} links (A-Z ${alphabetical.length}, topics ${topicLinks}, chrome ${chrome})`,
    );
  }
});

test("category pages render topics before the A-Z list and drop the noindexed recipe tools", () => {
  const pages = {
    nutrition: readFileSync("src/pages/nutrition/index.astro", "utf8"),
    recipes: readFileSync("src/pages/recipes/index.astro", "utf8"),
    tips: readFileSync("src/pages/tips/index.astro", "utf8"),
  };
  const component = readFileSync("src/components/CategoryTopicHub.astro", "utf8");
  const topicsAt = component.indexOf('id="topic-sections"');
  const azAt = component.indexOf('id="all-articles"');
  assert.ok(topicsAt >= 0 && azAt > topicsAt, "topic sections should render above the A-Z list");
  assert.match(component, />\s*Start here\s*</);

  for (const [category, source] of Object.entries(pages)) {
    assert.match(source, /assembleHub/);
    assert.match(source, /CategoryTopicHub/);
    assert.match(source, /itemListSchema/);
    assert.equal(source.includes("/tools/recipe-finder/"), false, category);
    assert.equal(source.includes("/tools/shopping-list-builder/"), false, category);
    assert.equal(source.includes("You've Got Ingredients"), false, category);
    assert.equal(source.includes("Make One Shopping List, Not Five"), false, category);
  }

  const recipeTools = pages.recipes.match(/href="\/tools\/"/g) ?? [];
  assert.equal(recipeTools.length, 1);
  assert.equal(pages.nutrition.includes('href="/tools/"'), false);
  assert.equal(pages.tips.includes('href="/tools/"'), false);
});

test("built hubs stay within 125 anchors when dist is present", () => {
  const dist = "dist";
  if (!existsSync(join(dist, "index.html"))) return;
  for (const category of ["nutrition", "recipes", "tips"]) {
    const html = readFileSync(join(dist, category, "index.html"), "utf8");
    const anchors = [...html.matchAll(/<a\b/gi)].length;
    assert.ok(anchors <= 125, `/${category}/ rendered ${anchors} anchors`);
    assert.match(html, /"@type":"ItemList"/);
    assert.match(html, /"@type":"CollectionPage"/);
    assert.equal(html.includes("/tools/recipe-finder/"), false);
    assert.equal(html.includes("/tools/shopping-list-builder/"), false);
    for (const slug of INDEX_PRUNE_SLUGS) {
      assert.equal(html.includes(`/${slug}/`), false, `/${category}/ links pruned ${slug}`);
    }
    for (const path of INDEX_NOINDEX_TOOL_PATHS) {
      assert.equal(html.includes(`/${path}/`), false, `/${category}/ links noindexed ${path}`);
    }
  }
});
