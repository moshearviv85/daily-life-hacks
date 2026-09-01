import { getCollection } from "astro:content";
import { isReleased } from "./release";
import { isIndexPruned } from "./index-prune.js";

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
    .sort((a, b) => {
      const aDate = (a.data.dateModified ?? a.data.publishAt ?? a.data.date).valueOf();
      const bDate = (b.data.dateModified ?? b.data.publishAt ?? b.data.date).valueOf();
      return bDate - aDate;
    })
    .slice(0, FEED_MAX_ITEMS);
}
