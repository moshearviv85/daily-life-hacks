/**
 * Public article modified day.
 *
 * Schema `dateModified`, the sitemap `lastmod`, the feed updated time, and the
 * visible "Updated" line all use the first of:
 *   1. frontmatter `substantiveUpdate` (a changed number or claim, or a body
 *      change of at least 15%)
 *   2. legacy `dateModified`
 *   3. the publication date
 *
 * Link insertions, citation-only edits, Keep Reading, title rewrites, author
 * fixes, captions, and template changes must not set `substantiveUpdate`, so
 * they do not move the public date.
 */

const FIELD_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

export function extractFrontmatterField(markdown, field) {
  if (!markdown || !FIELD_NAME.test(field)) return null;
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return null;
  const match = frontmatter[1].match(
    new RegExp(`^${field}:\\s*["']?([^"'\\n#]+?)["']?\\s*$`, "m"),
  );
  return match ? match[1].trim() : null;
}

/** First present day, in public-date order. Values are YYYY-MM-DD strings or Dates. */
export function pickModifiedDate(...values) {
  for (const value of values) {
    if (value) return value;
  }
  return null;
}

export function publicModifiedDay(markdown) {
  return pickModifiedDate(
    extractFrontmatterField(markdown, "substantiveUpdate"),
    extractFrontmatterField(markdown, "dateModified"),
    extractFrontmatterField(markdown, "date"),
  );
}

/** True when `after` is a later calendar day than `before`. YYYY-MM-DD compares in order. */
export function isForwardModifiedDay(before, after) {
  if (!after || before === after) return false;
  if (!before) return true;
  return after > before;
}

export const SHARED_DATEMODIFIED_LIMIT = 10;

/**
 * Dates shared by more than `limit` articles that do not set substantiveUpdate.
 * Articles with the field are explicit content updates and are not counted.
 */
export function sharedDateModifiedWithoutSubstantiveUpdate(
  articles,
  limit = SHARED_DATEMODIFIED_LIMIT,
) {
  /** @type {Map<string, string[]>} */
  const groups = new Map();
  for (const article of articles) {
    if (!article?.dateModified || article.substantiveUpdate) continue;
    const slugs = groups.get(article.dateModified) ?? [];
    slugs.push(article.slug ?? article.path ?? "");
    groups.set(article.dateModified, slugs);
  }
  return [...groups.entries()]
    .filter(([, slugs]) => slugs.length > limit)
    .map(([date, slugs]) => ({ date, count: slugs.length, slugs }))
    .sort((a, b) => b.count - a.count || a.date.localeCompare(b.date));
}
