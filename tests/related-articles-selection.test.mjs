import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CONTENT_CLUSTERS, inferLegacyCluster } from "../src/content/clusters.ts";
import { isIndexPruned } from "../src/content/index-prune.js";
import {
  assignRelatedArticles,
  budgetStudyAllowed,
  genericTagSet,
  isPerDollarOrBudgetStudy,
  isRecipeStorageOrTipsArticle,
  resolveArticleCluster,
  scoreRelatedCandidate,
} from "../src/content/relatedArticleScoring.js";

const pillars = new Set(CONTENT_CLUSTERS.map((cluster) => cluster.parentPillar));
const pillarByCluster = new Map(
  CONTENT_CLUSTERS.map((cluster) => [cluster.id, cluster.parentPillar]),
);

test("a tag used on more than a quarter of articles is generic", () => {
  const articles = [
    { tags: ["fiber", "beans"] },
    { tags: ["fiber"] },
    { tags: ["fiber"] },
    { tags: ["oats"] },
    { tags: ["lentils"] },
  ];
  const generic = genericTagSet(articles);
  assert.equal(generic.has("fiber"), true);
  assert.equal(generic.has("beans"), false);
  assert.equal(generic.has("oats"), false);
  assert.equal(generic.has("lentils"), false);
});

test("the appearance cap is a deterministic slug-order greedy pass", () => {
  const shared = ["lentils", "oats"];
  const articles = [
    {
      id: "popular",
      tags: shared,
      category: "nutrition",
      releaseTimestamp: 300,
      eligibleTarget: true,
    },
    {
      id: "quiet",
      tags: shared,
      category: "nutrition",
      releaseTimestamp: 100,
      eligibleTarget: true,
    },
  ];
  for (let index = 0; index < 4; index += 1) {
    articles.push({
      id: `source-${index}`,
      tags: shared,
      category: "nutrition",
      releaseTimestamp: 50 - index,
      eligibleTarget: false,
    });
  }

  const options = {
    count: 1,
    maxAppearances: 2,
    pillarSlugs: new Set(),
    pillarByCluster: new Map(),
  };
  const forward = assignRelatedArticles(articles, options);
  const backward = assignRelatedArticles([...articles].reverse(), options);
  assert.deepEqual([...backward.entries()], [...forward.entries()]);

  assert.deepEqual(forward.get("source-0"), ["popular"]);
  assert.deepEqual(forward.get("source-1"), ["quiet"]);
  assert.deepEqual(forward.get("source-2"), []);
  assert.deepEqual(forward.get("source-3"), []);

  const appearances = new Map();
  for (const ids of forward.values()) {
    for (const id of ids) appearances.set(id, (appearances.get(id) || 0) + 1);
  }
  assert.equal(appearances.get("popular"), 2);
  assert.equal(appearances.get("quiet"), 2);
});

test("indexable keep-reading cards follow the sitewide rules", () => {
  const articles = loadArticles();
  const assignments = assignRelatedArticles(articles, {
    pillarSlugs: pillars,
    pillarByCluster,
  });
  const shuffled = assignRelatedArticles(
    [...articles].sort((a, b) => (a.id < b.id ? 1 : -1)),
    { pillarSlugs: pillars, pillarByCluster },
  );
  assert.deepEqual(
    [...shuffled.entries()].sort(([a], [b]) => (a < b ? -1 : 1)),
    [...assignments.entries()].sort(([a], [b]) => (a < b ? -1 : 1)),
  );

  const byId = new Map(articles.map((article) => [article.id, article]));
  const indexable = articles.filter((article) => article.eligibleTarget);
  const generic = genericTagSet(indexable);
  const counts = new Map();
  for (const article of indexable) {
    for (const tag of new Set(article.tags.map((tag) => tag.trim().toLowerCase()))) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  for (const [tag, count] of counts) {
    assert.equal(generic.has(tag), count / indexable.length > 0.25, tag);
  }
  assert.equal(generic.has("fiber"), false);
  assert.equal(generic.has("high fiber"), false);

  const appearances = new Map();
  let cards = 0;
  let crossCategory = 0;
  let budgetOnUnrelated = 0;
  for (const source of articles) {
    const chosen = assignments.get(source.id) ?? [];
    assert.ok(chosen.length <= 4, source.id);
    assert.equal(new Set(chosen).size, chosen.length, source.id);
    assert.equal(chosen.includes(source.id), false, source.id);
    for (const targetId of chosen) {
      const target = byId.get(targetId);
      assert.equal(target.eligibleTarget, true, targetId);
      const score = scoreRelatedCandidate({
        candidateId: target.id,
        candidateTags: target.tags,
        candidateCategory: target.category,
        candidateTitle: target.title,
        candidateCluster: target.clusterId,
        currentTags: new Set(source.tags.map((tag) => tag.trim().toLowerCase())),
        currentCategory: source.category,
        currentCluster: source.clusterId,
        currentId: source.id,
        genericTags: generic,
        pillarSlugs: pillars,
        preferredPillar:
          source.clusterId && !pillars.has(source.id)
            ? pillarByCluster.get(source.clusterId)
            : null,
      });
      const sameCategoryFill = target.category === source.category;
      assert.ok(score !== null || sameCategoryFill, `${source.id} -> ${target.id}`);
      assert.equal(
        budgetStudyAllowed({
          candidateId: target.id,
          candidateTags: target.tags,
          candidateTitle: target.title,
          currentCategory: source.category,
          currentTags: source.tags,
          currentCluster: source.clusterId,
          currentId: source.id,
        }),
        true,
        `${source.id} -> ${target.id}`,
      );
      appearances.set(targetId, (appearances.get(targetId) || 0) + 1);
      if (!source.eligibleTarget) continue;
      cards += 1;
      if (target.category !== source.category) crossCategory += 1;
      if (
        isPerDollarOrBudgetStudy(target) &&
        isRecipeStorageOrTipsArticle(source) &&
        !budgetStudyAllowed({
          candidateId: target.id,
          candidateTags: target.tags,
          candidateTitle: target.title,
          currentCategory: source.category,
          currentTags: source.tags,
          currentCluster: source.clusterId,
          currentId: source.id,
        })
      ) {
        budgetOnUnrelated += 1;
      }
    }
  }

  const maxAppearances = Math.max(0, ...appearances.values());
  const shownOnIndexable = new Set();
  for (const source of indexable) {
    for (const targetId of assignments.get(source.id) ?? []) shownOnIndexable.add(targetId);
  }
  const neverShown = indexable.filter((article) => !shownOnIndexable.has(article.id)).length;

  assert.equal(maxAppearances <= 8, true, `max appearances ${maxAppearances}`);
  assert.equal(budgetOnUnrelated, 0);
  assert.equal(cards, indexable.length * 4);
  // Previous indexable graph: 592 cards, 86 cross-category, max 21, 31 never shown.
  assert.ok(crossCategory < 86, `cross-category rose to ${crossCategory}`);
  assert.ok(neverShown < 31, `never-shown rose to ${neverShown}`);
});

function unquote(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const lines = match[1].split(/\r?\n/);
  const data = { tags: [] };
  let index = 0;
  while (index < lines.length) {
    const keyMatch = lines[index].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) {
      index += 1;
      continue;
    }
    const key = keyMatch[1];
    const rest = keyMatch[2];
    if (key === "tags") {
      if (rest.trim().startsWith("[")) {
        data.tags = rest
          .trim()
          .replace(/^\[/, "")
          .replace(/\]$/, "")
          .split(",")
          .map((part) => unquote(part))
          .filter(Boolean);
      } else {
        const tags = [];
        index += 1;
        while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
          tags.push(unquote(lines[index].replace(/^\s*-\s+/, "")));
          index += 1;
        }
        data.tags = tags;
        continue;
      }
    } else if (["title", "category", "date", "publishAt", "cluster", "parentPillar"].includes(key)) {
      data[key] = unquote(rest);
    }
    index += 1;
  }
  return data;
}

function loadArticles() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../src/data/articles");
  const now = Date.now();
  return readdirSync(root)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const id = name.replace(/\.md$/i, "");
      const data = parseFrontmatter(readFileSync(join(root, name), "utf8"));
      const releaseTimestamp = new Date(data.publishAt || data.date).valueOf();
      const hay = [data.title, ...data.tags, id].join(" ").toLowerCase();
      const resolution = resolveArticleCluster({
        articleId: id,
        explicitCluster: data.cluster,
        explicitParentPillar: data.parentPillar,
        clusters: CONTENT_CLUSTERS,
        inferLegacy: inferLegacyCluster,
        legacyText: hay,
      });
      return {
        id,
        tags: data.tags,
        category: data.category,
        title: data.title,
        clusterId: resolution?.cluster.id ?? null,
        releaseTimestamp,
        eligibleTarget: releaseTimestamp <= now && !isIndexPruned(id),
      };
    });
}
