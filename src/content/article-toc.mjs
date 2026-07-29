export const ARTICLE_TOC_MIN_WORDS = 1000;
export const ARTICLE_TOC_MIN_HEADINGS = 4;

const UTILITY_HEADING =
  /^(?:faq\b|frequently asked questions?\b|sources?\b|references?\b|related (?:articles?|reading)\b|you might also like\b|recipe card\b|nutrition information\b)/i;

/**
 * Count readable words without treating link destinations or code as article
 * prose. The threshold is deliberately approximate: it keeps the navigation
 * off short posts without making authors maintain another frontmatter flag.
 *
 * @param {string} markdown
 */
export function countArticleWords(markdown) {
  const readable = markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, " ");

  return readable.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu)?.length ?? 0;
}

/**
 * Astro generates heading IDs with its Markdown slugger. Reusing those slugs
 * here keeps every jump link tied to the exact server-rendered heading ID.
 *
 * @param {{depth: number, slug: string, text: string}[]} headings
 * @param {string} markdown
 */
export function buildArticleToc(headings, markdown) {
  if (countArticleWords(markdown) < ARTICLE_TOC_MIN_WORDS) return [];

  const items = headings
    .filter(
      (heading) =>
        heading.depth === 2 &&
        heading.slug &&
        heading.text &&
        !UTILITY_HEADING.test(heading.text.trim()),
    )
    .map(({ slug, text }) => ({ slug, text: text.trim() }));

  return items.length >= ARTICLE_TOC_MIN_HEADINGS ? items : [];
}
