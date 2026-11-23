import { INDEX_KEEP_PATHS, isIndexPruned } from "./index-prune.js";

/**
 * Guides hub "Related articles" cards.
 * Crawl budget stays on INDEX_KEEP_PATHS. Pruned slugs stay noindex
 * and must not be promoted from this hub.
 * Consolidated per-dollar spokes (chain pages, head-to-heads, and the
 * category cuts) were removed from INDEX_KEEP_PATHS, so they drop out here.
 */
export function isGuideHubSpoke(slug) {
  const id = String(slug ?? "").replace(/^\/+|\/+$/g, "");
  return INDEX_KEEP_PATHS.has(id) && !isIndexPruned(id);
}
