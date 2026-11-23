/**
 * In-body links to the two grocery flagships, the methodology page, and the
 * two budget guides.
 *
 * They render only on nutrition articles that also carry a budget or
 * per-dollar tag. That is inside the allowed set (nutrition, or a
 * budget/per-dollar tag), it stays off recipes and tips, and it keeps each
 * flagship at or under 25 in-body article inlinks. Writer-authored markdown
 * is left as written; this only decides whether the anchor is emitted.
 */
import { hasBudgetOrPerDollarTag } from "./relatedArticleScoring.js";

export const CONTEXTUAL_FLAGSHIP_PATHS = new Set([
  "/fiber-per-dollar-cheapest-high-fiber-foods",
  "/protein-per-dollar-cheapest-protein-sources",
  "/methodology",
  "/how-to-eat-more-fiber-on-a-budget",
  "/how-to-eat-more-fiber-on-a-budget-complete-guide",
  "/high-protein-on-a-budget-complete-guide",
]);

export function contextualFlagshipPathname(href) {
  const value = String(href ?? "").trim();
  if (!value || value.startsWith("#")) return "";
  try {
    const url = new URL(value, "https://www.daily-life-hacks.com");
    if (url.origin !== "https://www.daily-life-hacks.com") return "";
    const path = url.pathname.length > 1 && url.pathname.endsWith("/")
      ? url.pathname.slice(0, -1)
      : url.pathname;
    return path;
  } catch {
    return "";
  }
}

export function isContextualFlagshipHref(href) {
  return CONTEXTUAL_FLAGSHIP_PATHS.has(contextualFlagshipPathname(href));
}

export function contextualFlagshipLinkAllowed({ category, tags } = {}) {
  const normalized = String(category ?? "").trim().toLowerCase();
  if (normalized === "recipes" || normalized === "tips") return false;
  if (normalized !== "nutrition") return false;
  return hasBudgetOrPerDollarTag(tags);
}
