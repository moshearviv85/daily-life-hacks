import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { isReleased } from "./release";
import { isIndexPruned } from "./index-prune.js";

/** Public modified day. substantiveUpdate wins; link-only edits do not move it. */
export function articleModifiedDate(article: CollectionEntry<"articles">): Date {
  return (
    article.data.substantiveUpdate ??
    article.data.dateModified ??
    article.data.publishAt ??
    article.data.date
  );
}

export const FEED_SITE = "https://www.daily-life-hacks.com";
export const FEED_TITLE = "Daily Life Hacks";
export const FEED_DESCRIPTION =
  "What healthy eating actually costs, with the receipts. Original food-price studies, budget recipes, and kitchen answers that don't need a motivational speech.";
export const FEED_MAX_ITEMS = 25;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function absoluteFeedImage(image: string): string {
  return image.startsWith("http") ? image : `${FEED_SITE}${image}`;
}

export async function getFeedArticles() {
  return (await getCollection("articles"))
    .filter((article) => isReleased(article) && !isIndexPruned(article.id))
    .sort((a, b) => articleModifiedDate(b).valueOf() - articleModifiedDate(a).valueOf())
    .slice(0, FEED_MAX_ITEMS);
}
