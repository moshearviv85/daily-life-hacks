/**
 * Which email offer an article may show.
 *
 * fiber: the 7-day high-fiber meal plan (the file already in /downloads).
 * sourdough: the discard grams cheat sheet.
 * beans: the dried-to-canned conversion card.
 * oils: the smoke-point chart, copied from the cooking-oils page.
 * storage: the fridge-life card, copied from the storage pages.
 * budget: the existing $60 week meal plan PDF.
 * generic: the weekly newsletter, with no extra printable promised.
 *
 * Sourdough and bean slugs win over a fiber mention. A green-bean side or a
 * natto page is not the dried-bean card. Oils and storage are explicit slug
 * lists so a passing mention does not steal the offer. Budget runs after
 * fiber, so a fiber page keeps the fiber plan. Callers that promise "no
 * signup" pass "none" themselves.
 */

const FIBER_PILLAR = "how-to-eat-more-fiber-on-a-budget-complete-guide";
const BUDGET_PLAYBOOK = "eat-healthy-on-a-budget-complete-playbook";
const PROTEIN_BUDGET_PILLAR = "high-protein-on-a-budget-complete-guide";

/**
 * The direct answer is the first paragraph inside <article>, under the H1.
 * Kept here so the early-signup placement and the article template agree.
 */
export const ANSWER_FIRST_SLUGS = new Set([
  "can-you-refreeze-frozen-vegetables-after-thawing",
  "comparing-fiber-content-different-pizza-crusts",
  "good-source-of-fiber-label-meaning",
  "healthy-egg-sandwich-add-ins-toppings",
  "high-fiber-gluten-free-bread-recipe",
  "how-to-measure-sourdough-discard-grams",
  "selenium-containing-foods-easy-ways",
]);

/** Indexable top landing pages. Recipe finder is noindexed and not in this set. */
export const TOP_LANDING_SLUGS = new Set([
  "high-fiber-bran-muffins-that-taste-good",
  "cooking-oils-smoke-points-best-uses",
  "high-fiber-fast-food-options-guide",
  "easy-sourdough-discard-recipes-beginners",
  "healthy-alternatives-potato-chips-snacking",
  "selenium-containing-foods-easy-ways",
  "savory-chia-seed-recipes-breakfast",
  "how-to-store-homemade-salad-dressing-safely",
  "canned-beans-vs-dried-beans-nutrition",
  "high-fiber-yogurt-parfait-for-breakfast",
  "how-to-keep-sandwiches-from-getting-soggy",
  "artichoke-recipes-for-gut-health",
  "how-to-quick-soak-dried-beans-same-day",
  "costco-rotisserie-chicken-meal-ideas-dinner",
]);

const OIL_SLUGS = new Set(["cooking-oils-smoke-points-best-uses"]);

export const STORAGE_SLUGS = new Set([
  "how-to-store-homemade-salad-dressing-safely",
  "how-to-keep-sandwiches-from-getting-soggy",
  "keep-berries-fresh-longer-when-to-wash",
  "how-to-store-fresh-herbs-to-last-longer",
  "best-way-to-store-avocados-to-stop-browning",
  "how-long-do-leftovers-last-in-the-fridge",
  "does-leftover-pizza-need-to-be-refrigerated",
]);

function mentionsFiber(value) {
  return /\bfib(?:er|re)\b/i.test(String(value ?? ""));
}

/** Dried or canned bean topic. Green beans and soybeans/natto stay out. */
export function isBeanConversionSlug(slug) {
  const id = String(slug ?? "").toLowerCase();
  if (/green-beans?|soybeans?|natto/.test(id)) return false;
  return /(?:^|-)beans?(?:-|$)/.test(id);
}

function isBudgetOffer({ slug, cluster, parentPillar }) {
  if (slug === "costco-rotisserie-chicken-meal-ideas-dinner") return true;
  if (slug === "usda-thrifty-food-plan-weekly-cost") return true;
  if (slug === BUDGET_PLAYBOOK || parentPillar === BUDGET_PLAYBOOK) return true;
  if (cluster === "weekly-budget-shopping" || cluster === "budget-protein") return true;
  if (slug === PROTEIN_BUDGET_PILLAR || parentPillar === PROTEIN_BUDGET_PILLAR) return true;
  return false;
}

/**
 * @returns {"fiber" | "sourdough" | "beans" | "oils" | "storage" | "budget" | "generic"}
 */
export function newsletterSignupForArticle({
  slug = "",
  title = "",
  tags = [],
  cluster = "",
  parentPillar = "",
} = {}) {
  const id = String(slug).toLowerCase();
  if (id.includes("sourdough")) return "sourdough";
  if (isBeanConversionSlug(id)) return "beans";
  if (OIL_SLUGS.has(id)) return "oils";
  if (STORAGE_SLUGS.has(id)) return "storage";

  const topic = [id, title, cluster, parentPillar, ...tags].join("\n");
  if (
    cluster === "budget-fiber" ||
    parentPillar === FIBER_PILLAR ||
    mentionsFiber(topic)
  ) {
    return "fiber";
  }
  if (isBudgetOffer({ slug: id, cluster, parentPillar })) return "budget";
  return "generic";
}

/**
 * Where the compact early form goes, or null when this page should not have one.
 * A table in the first 45% of the body wins. Otherwise the form sits after the
 * visible opening answer, or after the first paragraph when there isn't one.
 *
 * @returns {{ variant: string, where: "after-table" | "after-quick-answer" | "after-first-paragraph" } | null}
 */
function frontmatterScalar(front, key) {
  const match = front.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\n#]+))\\s*$`, "m"));
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function frontmatterTags(front) {
  const block = front.match(/^tags:\s*\n((?:[ \t]*-[^\n]*\n)*)/m);
  if (!block) return [];
  return [...block[1].matchAll(/^[\t ]*-\s*(?:"([^"]*)"|'([^']*)'|(.+?))\s*$/gm)].map((match) =>
    (match[1] ?? match[2] ?? match[3] ?? "").trim(),
  );
}

/** Same fields the article template and the rehype plugin pass into the plan. */
export function signupContextFromMarkdown(slug, raw) {
  const source = String(raw ?? "");
  const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const front = fm?.[1] ?? "";
  const body = fm ? source.slice(fm[0].length) : source;
  return {
    slug,
    title: frontmatterScalar(front, "title"),
    tags: frontmatterTags(front),
    cluster: frontmatterScalar(front, "cluster"),
    parentPillar: frontmatterScalar(front, "parentPillar"),
    category: frontmatterScalar(front, "category"),
    body,
    hasQuickAnswer: /^quickAnswer:/m.test(front),
    answerFirst: ANSWER_FIRST_SLUGS.has(slug),
  };
}

export function earlySignupPlan({
  slug = "",
  title = "",
  tags = [],
  cluster = "",
  parentPillar = "",
  body = "",
  hasQuickAnswer = false,
  answerFirst = false,
} = {}) {
  const variant = newsletterSignupForArticle({
    slug,
    title,
    tags,
    cluster,
    parentPillar,
  });
  if (variant === "generic" || !TOP_LANDING_SLUGS.has(String(slug))) return null;

  const markdown = String(body ?? "");
  const tableAt = markdown.search(/^\|.+\|\s*$/m);
  const earlyTable = tableAt !== -1 && tableAt / Math.max(markdown.length, 1) <= 0.45;
  let where = "after-first-paragraph";
  if (earlyTable) where = "after-table";
  else if (hasQuickAnswer && !answerFirst) where = "after-quick-answer";
  return { variant, where };
}
