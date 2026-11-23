/**
 * Which email offer an article may show.
 *
 * fiber: the 7-day high-fiber meal plan (the file already in /downloads).
 * sourdough: the discard grams cheat sheet.
 * beans: the dried-to-canned conversion card.
 * generic: the weekly newsletter, with no extra printable promised.
 *
 * Sourdough and bean slugs win over a fiber mention. A green-bean side or a
 * natto page is not the dried-bean card. Callers that promise "no signup"
 * pass "none" themselves.
 */

const FIBER_PILLAR = "how-to-eat-more-fiber-on-a-budget-complete-guide";

function mentionsFiber(value) {
  return /\bfib(?:er|re)\b/i.test(String(value ?? ""));
}

/** Dried or canned bean topic. Green beans and soybeans/natto stay out. */
export function isBeanConversionSlug(slug) {
  const id = String(slug ?? "").toLowerCase();
  if (/green-beans?|soybeans?|natto/.test(id)) return false;
  return /(?:^|-)beans?(?:-|$)/.test(id);
}

/**
 * @returns {"fiber" | "sourdough" | "beans" | "generic"}
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

  const topic = [id, title, cluster, parentPillar, ...tags].join("\n");
  if (
    cluster === "budget-fiber" ||
    parentPillar === FIBER_PILLAR ||
    mentionsFiber(topic)
  ) {
    return "fiber";
  }
  return "generic";
}
