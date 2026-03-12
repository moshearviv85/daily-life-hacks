import type { CollectionEntry } from "astro:content";

export type ArticleEntry = CollectionEntry<"articles">;

export function getReleaseDate(article: ArticleEntry): Date {
  return article.data.publishAt ?? article.data.date;
}

export function getReleaseTimestamp(article: ArticleEntry): number {
  return getReleaseDate(article).valueOf();
}

export function isReleased(article: ArticleEntry, now = new Date()): boolean {
  return getReleaseTimestamp(article) <= now.valueOf();
}

export function formatReleaseDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
