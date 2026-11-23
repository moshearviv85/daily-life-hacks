/**
 * Which email offer a page may show.
 *
 * The 7-day high-fiber meal plan is the offer on fiber articles and the
 * homepage. Sourdough, other topics, and tools use the generic newsletter.
 * Callers that promise "no signup" pass "none" themselves.
 */

const FIBER_PILLAR = "how-to-eat-more-fiber-on-a-budget-complete-guide";

function mentionsFiber(value) {
  return /\bfib(?:er|re)\b/i.test(String(value ?? ""));
}

/**
 * @returns {"fiber" | "generic"}
 */
export function newsletterSignupForArticle({
  slug = "",
  title = "",
  tags = [],
  cluster = "",
  parentPillar = "",
} = {}) {
  const id = String(slug).toLowerCase();
  if (id.includes("sourdough")) return "generic";

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
