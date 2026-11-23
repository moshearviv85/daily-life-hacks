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
  buildTopicTagIndex,
  genericTagSet,
  isPerDollarOrBudgetStudy,
  isRecipeStorageOrTipsArticle,
  resolveArticleCluster,
  scoreRelatedCandidate,
  sharesTopicCluster,
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

test("the appearance cap is a deterministic scarcity-order pass", () => {
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

test("pages with fewer qualifying candidates pick before later slugs", () => {
  const articles = [
    {
      id: "aaa",
      tags: ["common", "extra", "wide"],
      category: "recipes",
      releaseTimestamp: 50,
      eligibleTarget: true,
    },
    {
      id: "backup",
      tags: ["wide", "spare"],
      category: "recipes",
      releaseTimestamp: 40,
      eligibleTarget: true,
    },
    {
      id: "only-match",
      tags: ["rare", "marker", "common", "extra"],
      category: "nutrition",
      releaseTimestamp: 100,
      eligibleTarget: true,
    },
    {
      id: "zzz-scarce",
      tags: ["rare", "marker"],
      category: "tips",
      releaseTimestamp: 10,
      eligibleTarget: true,
    },
  ];
  const assigned = assignRelatedArticles(articles, {
    count: 1,
    maxAppearances: 1,
    genericTagRate: 1,
    topicClusterRate: 0,
    pillarSlugs: new Set(),
    pillarByCluster: new Map(),
  });

  assert.deepEqual(assigned.get("zzz-scarce"), ["only-match"]);
  assert.deepEqual(assigned.get("aaa"), ["backup"]);
});

test("same-topic-cluster cards do not consume the sitewide cap", () => {
  const articles = [];
  for (let index = 0; index < 4; index += 1) {
    articles.push({
      id: `dough-${index}`,
      tags: ["sourdough"],
      category: "tips",
      releaseTimestamp: 40 - index,
      eligibleTarget: true,
    });
  }
  articles.push(
    {
      id: "guide",
      tags: ["beans", "lentils"],
      category: "nutrition",
      releaseTimestamp: 100,
      eligibleTarget: true,
    },
    {
      id: "first",
      tags: ["beans", "lentils"],
      category: "recipes",
      releaseTimestamp: 10,
      eligibleTarget: true,
    },
    {
      id: "second",
      tags: ["beans", "lentils"],
      category: "tips",
      releaseTimestamp: 9,
      eligibleTarget: true,
    },
  );

  const assigned = assignRelatedArticles(articles, {
    count: 1,
    maxAppearances: 1,
    genericTagRate: 1,
    topicClusterRate: 1,
    topicClusterMin: 4,
    pillarSlugs: new Set(),
    pillarByCluster: new Map(),
  });

  assert.deepEqual(assigned.get("dough-1"), ["dough-0"]);
  assert.deepEqual(assigned.get("dough-2"), ["dough-0"]);
  assert.deepEqual(assigned.get("dough-3"), ["dough-0"]);
  assert.deepEqual(assigned.get("first"), ["guide"]);
  assert.notEqual(assigned.get("second")?.[0], "guide");
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
  const topicByArticle = buildTopicTagIndex(articles);
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

  const nonClusterAppearances = new Map();
  let cards = 0;
  let crossCategory = 0;
  let budgetOnUnrelated = 0;
  for (const source of articles) {
    const chosen = assignments.get(source.id) ?? [];
    assert.equal(chosen.length, 4, source.id);
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
      const sameTopic = sharesTopicCluster(
        topicByArticle.get(source.id),
        topicByArticle.get(targetId),
      );
      assert.ok(
        score !== null || sameCategoryFill || sameTopic,
        `${source.id} -> ${targetId}`,
      );
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
      if (!sameTopic) {
        nonClusterAppearances.set(targetId, (nonClusterAppearances.get(targetId) || 0) + 1);
      }
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

  const maxNonCluster = Math.max(0, ...nonClusterAppearances.values());
  const shownOnIndexable = new Set();
  for (const source of indexable) {
    for (const targetId of assignments.get(source.id) ?? []) shownOnIndexable.add(targetId);
  }
  const neverShown = indexable.filter((article) => !shownOnIndexable.has(article.id)).length;
  const sourdoughPages = articles.filter((article) => article.id.includes("sourdough"));
  const redirected = new Set([
    "fiber-per-dollar-cheapest-high-fiber-foods",
    "protein-per-dollar-cheapest-protein-sources",
    "high-protein-on-a-budget-complete-guide",
    "how-to-eat-more-fiber-on-a-budget-complete-guide",
  ]);

  assert.ok(sourdoughPages.length >= 10, `sourdough pages ${sourdoughPages.length}`);
  let clustered = 0;
  for (const source of sourdoughPages) {
    const chosen = assignments.get(source.id) ?? [];
    const clusterCards = chosen.filter((id) => id.includes("sourdough"));
    assert.ok(
      clusterCards.length >= 1,
      `${source.id} has ${clusterCards.length} sourdough cards: ${chosen.join(", ")}`,
    );
    if (clusterCards.length >= 3) clustered += 1;
    for (const targetId of chosen) {
      assert.equal(isIndexPruned(targetId), false, `${source.id} -> ${targetId}`);
      assert.equal(redirected.has(targetId), false, `${source.id} -> ${targetId}`);
    }
  }
  assert.ok(clustered >= 9, `sourdough pages with a sourdough card set: ${clustered}`);

  assert.equal(
    maxNonCluster <= 8,
    true,
    `non-cluster appearances ${maxNonCluster}`,
  );
  assert.equal(budgetOnUnrelated, 0);
  // 4 cards on every current indexable page. Do not pin a historical total:
  // later prune/merge commits change the page count.
  const expectedCards = indexable.length * 4;
  assert.equal(cards, expectedCards, `expected ${expectedCards} cards`);
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
