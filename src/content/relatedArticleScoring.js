/**
 * Sitewide "Keep Reading" selection.
 *
 * Scores are per candidate, then one deterministic pass assigns cards for
 * every built article page. Build order is slug ascending, which does not
 * depend on page-render parallelism. A global counter caps each target.
 */

export const GENERIC_TAG_RATE = 0.25;
export const MAX_RELATED_APPEARANCES = 8;
export const RELATED_ARTICLE_COUNT = 4;

export function normalizeTag(tag) {
  return String(tag ?? "").trim().toLowerCase();
}

function asTagList(tags) {
  if (!tags) return [];
  return [...tags];
}

/**
 * A tag is generic when it appears on more than 25% of the supplied
 * articles. Frequency is exact and case-insensitive. "fiber" is generic
 * only when the tag itself crosses that line.
 */
export function genericTagSet(articles) {
  const list = articles || [];
  const counts = new Map();
  for (const article of list) {
    const seen = new Set();
    for (const tag of asTagList(article.tags)) {
      const normalized = normalizeTag(tag);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  const generic = new Set();
  if (!list.length) return generic;
  for (const [tag, count] of counts) {
    if (count / list.length > GENERIC_TAG_RATE) generic.add(tag);
  }
  return generic;
}

export function specificSharedTagCount(currentTags, candidateTags, genericTags) {
  const current = new Set(asTagList(currentTags).map(normalizeTag));
  const generic = genericTags || new Set();
  const seen = new Set();
  let count = 0;
  for (const tag of asTagList(candidateTags)) {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized) || generic.has(normalized)) continue;
    seen.add(normalized);
    if (current.has(normalized)) count += 1;
  }
  return count;
}

export function hasBudgetOrPerDollarTag(tags) {
  for (const tag of asTagList(tags)) {
    const normalized = normalizeTag(tag);
    if (normalized.includes("per dollar") || normalized.includes("per-dollar")) {
      return true;
    }
    if (/(^|[^a-z0-9])budget([^a-z0-9]|$)/.test(normalized)) return true;
  }
  return false;
}

/**
 * Price-per-nutrient studies and the budget flagship/ranking pages.
 * Recipe titles that merely mention a dollar amount are not studies.
 */
export function isPerDollarOrBudgetStudy({ id = "", title = "", tags = [] } = {}) {
  const slug = normalizeTag(id);
  const identity = `${slug} ${asTagList(tags).map(normalizeTag).join(" ")} ${normalizeTag(title)}`;
  if (identity.includes("per-dollar") || identity.includes("per dollar")) return true;
  if (/costs?-per-day/.test(slug)) return true;
  return (
    /(^|[^a-z0-9])budget([^a-z0-9]|$)/.test(slug) &&
    /ranked|guide|playbook|dollar|cost|cheap/.test(slug)
  );
}

export function isRecipeStorageOrTipsArticle({
  id = "",
  category = "",
  tags = [],
  clusterId = null,
} = {}) {
  const normalizedCategory = normalizeTag(category);
  if (normalizedCategory === "recipes" || normalizedCategory === "tips") return true;
  if (clusterId === "meal-prep-food-storage") return true;
  const blob = `${normalizeTag(id)} ${asTagList(tags).map(normalizeTag).join(" ")}`;
  return /(^|[^a-z0-9])(storage|store)([^a-z0-9]|$)/.test(blob);
}

export function budgetStudyAllowed({
  candidateId,
  candidateTags,
  candidateTitle = "",
  currentCategory,
  currentTags,
  currentCluster = null,
  currentId = "",
}) {
  if (
    !isPerDollarOrBudgetStudy({
      id: candidateId,
      tags: candidateTags,
      title: candidateTitle,
    })
  ) {
    return true;
  }
  if (
    !isRecipeStorageOrTipsArticle({
      id: currentId,
      category: currentCategory,
      tags: currentTags,
      clusterId: currentCluster,
    })
  ) {
    return true;
  }
  return hasBudgetOrPerDollarTag(currentTags);
}

/**
 * Score one candidate for Keep Reading.
 *
 * Returns null when the candidate is disqualified. Zero is a real score:
 * same cluster, no specific shared tags, and a different category still
 * qualifies, it just ranks after any positive match.
 *
 * Generic tags add nothing. A candidate qualifies only when it shares the
 * category or cluster, or at least two specific tags. Pillars stay
 * exclusive to the source page's own cluster pillar.
 */
export function scoreRelatedCandidate({
  candidateId,
  candidateTags,
  candidateCategory,
  candidateTitle = "",
  candidateCluster = null,
  currentTags,
  currentCategory,
  currentCluster = null,
  currentId = "",
  genericTags = null,
  pillarSlugs,
  preferredPillar,
}) {
  if (
    !budgetStudyAllowed({
      candidateId,
      candidateTags,
      candidateTitle,
      currentCategory,
      currentTags,
      currentCluster,
      currentId,
    })
  ) {
    return null;
  }

  const pillars = pillarSlugs || new Set();
  if (pillars.has(candidateId) && candidateId !== preferredPillar) return null;

  const specificShared = specificSharedTagCount(
    currentTags,
    candidateTags,
    genericTags || new Set(),
  );
  const sameCategory = candidateCategory === currentCategory;
  const sameCluster = Boolean(
    currentCluster && candidateCluster && currentCluster === candidateCluster,
  );
  if (!sameCategory && !sameCluster && specificShared < 2) return null;

  const preferredPillarBoost = candidateId === preferredPillar ? 40 : 0;
  return specificShared * 10 + (sameCategory ? 3 : 0) + preferredPillarBoost;
}

function byId(a, b) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function compareScored(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.releaseTimestamp !== a.releaseTimestamp) {
    return b.releaseTimestamp - a.releaseTimestamp;
  }
  return byId(a, b);
}

function compareFill(a, b, appearances, neverShown) {
  const aNever = neverShown.has(a.id) ? 0 : 1;
  const bNever = neverShown.has(b.id) ? 0 : 1;
  if (aNever !== bNever) return aNever - bNever;
  const aCount = appearances.get(a.id) || 0;
  const bCount = appearances.get(b.id) || 0;
  if (aCount !== bCount) return aCount - bCount;
  return compareScored(a, b);
}

let cachedKey = "";
let cachedAssignments = null;

/**
 * Assign Keep Reading targets for every source page.
 *
 * `articles` entries: { id, tags, category, title, clusterId,
 * releaseTimestamp, eligibleTarget }.
 * Ineligible targets (unreleased or noindex) never appear as cards, but
 * their pages still receive cards and those cards count toward the cap.
 *
 * Pass 1 walks sources in slug order and greedily takes the highest score
 * whose sitewide count is still under the cap. Pass 2 fills any open slot
 * from the same category, preferring articles that had zero appearances
 * after pass 1.
 */
export function assignRelatedArticles(articles, options = {}) {
  const count = options.count ?? RELATED_ARTICLE_COUNT;
  const maxAppearances = options.maxAppearances ?? MAX_RELATED_APPEARANCES;
  const pillarSlugs = options.pillarSlugs ?? new Set();
  const pillarByCluster = options.pillarByCluster ?? new Map();

  const records = (articles || []).map((article) => ({
    id: article.id,
    tags: asTagList(article.tags),
    category: article.category,
    title: article.title || "",
    clusterId: article.clusterId ?? null,
    releaseTimestamp: Number.isFinite(article.releaseTimestamp)
      ? article.releaseTimestamp
      : 0,
    eligibleTarget: article.eligibleTarget !== false,
  }));

  const key = [
    count,
    maxAppearances,
    [...pillarSlugs].sort().join(","),
    [...pillarByCluster.entries()]
      .map(([clusterId, pillar]) => `${clusterId}=${pillar}`)
      .sort()
      .join(","),
    records
      .map(
        (article) =>
          `${article.id}\0${article.releaseTimestamp}\0${article.eligibleTarget ? 1 : 0}\0${article.clusterId || ""}\0${article.category}\0${article.title}\0${article.tags.join("\0")}`,
      )
      .join("\n"),
  ].join("\n");
  if (key === cachedKey && cachedAssignments) {
    return new Map(
      [...cachedAssignments.entries()].map(([id, ids]) => [id, ids.slice()]),
    );
  }

  const targets = records.filter((article) => article.eligibleTarget);
  const genericTags = genericTagSet(targets);
  const order = [...records].sort(byId);

  function preferredPillarFor(source) {
    if (!source.clusterId || pillarSlugs.has(source.id)) return null;
    return pillarByCluster.get(source.clusterId) ?? null;
  }

  function scoredCandidates(source) {
    const preferredPillar = preferredPillarFor(source);
    const currentTags = new Set(source.tags.map(normalizeTag));
    const ranked = [];
    for (const candidate of targets) {
      if (candidate.id === source.id) continue;
      const score = scoreRelatedCandidate({
        candidateId: candidate.id,
        candidateTags: candidate.tags,
        candidateCategory: candidate.category,
        candidateTitle: candidate.title,
        candidateCluster: candidate.clusterId,
        currentTags,
        currentCategory: source.category,
        currentCluster: source.clusterId,
        currentId: source.id,
        genericTags,
        pillarSlugs,
        preferredPillar,
      });
      if (score === null) continue;
      ranked.push({
        id: candidate.id,
        score,
        releaseTimestamp: candidate.releaseTimestamp,
        category: candidate.category,
        clusterId: candidate.clusterId,
      });
    }
    ranked.sort(compareScored);
    return ranked;
  }

  const rankedBySource = new Map(order.map((source) => [source.id, scoredCandidates(source)]));
  const appearances = new Map();
  const selected = new Map(order.map((source) => [source.id, []]));

  for (const source of order) {
    const chosen = selected.get(source.id);
    for (const candidate of rankedBySource.get(source.id)) {
      if (chosen.length >= count) break;
      if ((appearances.get(candidate.id) || 0) >= maxAppearances) continue;
      chosen.push(candidate.id);
      appearances.set(candidate.id, (appearances.get(candidate.id) || 0) + 1);
    }
  }

  const neverShown = new Set(
    targets.filter((article) => !(appearances.get(article.id) > 0)).map((article) => article.id),
  );

  for (const source of order) {
    const chosen = selected.get(source.id);
    if (chosen.length >= count) continue;
    const chosenIds = new Set(chosen);
    const preferredPillar = preferredPillarFor(source);
    const pool = [];
    for (const candidate of targets) {
      if (candidate.id === source.id || chosenIds.has(candidate.id)) continue;
      if (candidate.category !== source.category) continue;
      if ((appearances.get(candidate.id) || 0) >= maxAppearances) continue;
      if (pillarSlugs.has(candidate.id) && candidate.id !== preferredPillar) continue;
      if (
        !budgetStudyAllowed({
          candidateId: candidate.id,
          candidateTags: candidate.tags,
          candidateTitle: candidate.title,
          currentCategory: source.category,
          currentTags: source.tags,
          currentCluster: source.clusterId,
          currentId: source.id,
        })
      ) {
        continue;
      }
      pool.push({
        id: candidate.id,
        score: 0,
        releaseTimestamp: candidate.releaseTimestamp,
      });
    }
    pool.sort((a, b) => compareFill(a, b, appearances, neverShown));
    for (const candidate of pool) {
      if (chosen.length >= count) break;
      if ((appearances.get(candidate.id) || 0) >= maxAppearances) continue;
      chosen.push(candidate.id);
      appearances.set(candidate.id, (appearances.get(candidate.id) || 0) + 1);
    }
  }

  cachedKey = key;
  cachedAssignments = selected;
  return new Map([...selected.entries()].map(([id, ids]) => [id, ids.slice()]));
}

/**
 * Resolve cluster ownership in priority order: explicit cluster, explicit
 * parent, canonical pillar slug, then legacy inference. Registry data is
 * injected from clusters.ts so there is only one source of truth.
 */
export function resolveArticleCluster({
  articleId,
  explicitCluster,
  explicitParentPillar,
  clusters,
  inferLegacy,
  legacyText,
}) {
  if (explicitCluster) {
    const match = clusters.find((cluster) => cluster.id === explicitCluster);
    if (match) return { cluster: match, source: "frontmatter-cluster" };
  }

  if (explicitParentPillar) {
    const match = clusters.find(
      (cluster) => cluster.parentPillar === explicitParentPillar,
    );
    if (match) return { cluster: match, source: "frontmatter-parent" };
  }

  const pillarMatch = clusters.find(
    (cluster) => cluster.parentPillar === articleId,
  );
  if (pillarMatch) return { cluster: pillarMatch, source: "pillar-slug" };

  const inferred = inferLegacy(legacyText);
  return inferred ? { cluster: inferred, source: "legacy-fallback" } : null;
}
