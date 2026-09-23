import { INDEX_KEEP_PATHS, isIndexPruned } from "./index-prune.js";

/**
 * Guides hub "Related articles" cards.
 * Crawl budget stays on INDEX_KEEP_PATHS. Pruned slugs stay noindex
 * and must not be promoted from this hub.
 */
export function isGuideHubSpoke(slug) {
  const id = String(slug ?? "").replace(/^\/+|\/+$/g, "");
  return INDEX_KEEP_PATHS.has(id) && !isIndexPruned(id);
}
